#!/usr/bin/env python3
"""
顔ジェスチャー検出モジュール

MediaPipe Face Meshを使用して顔のランドマークを検出し、
各種ジェスチャー（まばたき、口の開閉、眉の上下、頭の傾き）を認識する。
"""

import cv2
import mediapipe as mp
import numpy as np
from collections import deque
from dataclasses import dataclass, field
from typing import Optional, Tuple, Dict, Any
from enum import Enum, auto
import time
import yaml
import argparse
from pathlib import Path


class GestureType(Enum):
    """ジェスチャーの種類"""
    NONE = auto()
    DOUBLE_BLINK = auto()      # 2回連続まばたき（はい）
    LONG_CLOSE = auto()         # 長めに目を閉じる（いいえ）
    EYEBROWS_RAISED = auto()    # 眉を上げる（メニュー）
    MOUTH_OPEN = auto()         # 口を開ける（決定）
    HEAD_TILT_LEFT = auto()     # 頭を左に傾ける（前へ）
    HEAD_TILT_RIGHT = auto()    # 頭を右に傾ける（次へ）


@dataclass
class GestureState:
    """現在のジェスチャー状態"""
    face_detected: bool = False
    
    # 目の状態
    eyes_closed: bool = False
    left_eye_ar: float = 0.0
    right_eye_ar: float = 0.0
    
    # 口の状態
    mouth_open: bool = False
    mouth_ar: float = 0.0
    
    # 眉の状態
    eyebrows_raised: bool = False
    eyebrow_position: float = 0.0
    
    # 頭の傾き
    head_tilt_angle: float = 0.0
    head_tilt_left: bool = False
    head_tilt_right: bool = False
    head_tilt_center: bool = True  # 不感帯内かどうか

    # 検出されたジェスチャー
    detected_gesture: GestureType = GestureType.NONE


@dataclass
class Thresholds:
    """検出閾値"""
    # 目
    eye_ar_threshold: float = 0.20
    min_blink_frames: int = 2
    double_blink_interval: float = 0.8
    long_close_frames: int = 30
    
    # 口
    mouth_ar_threshold: float = 0.30
    mouth_confirm_frames: int = 5
    
    # 眉
    eyebrow_raise_threshold: float = 0.020
    eyebrow_confirm_frames: int = 5
    
    # 頭の傾き
    head_tilt_threshold: float = 15.0
    head_tilt_deadzone: float = 7.0  # 中央の不感帯（±度）
    head_tilt_confirm_frames: int = 5

    # ジェスチャー確定
    gesture_cooldown: float = 0.5

    @classmethod
    def from_yaml(cls, filepath: str) -> 'Thresholds':
        """YAMLファイルから閾値を読み込む"""
        with open(filepath, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        return cls(
            eye_ar_threshold=config['eye']['aspect_ratio_threshold'],
            min_blink_frames=config['eye']['min_blink_frames'],
            double_blink_interval=config['eye']['double_blink_interval'],
            long_close_frames=config['eye']['long_close_frames'],
            mouth_ar_threshold=config['mouth']['aspect_ratio_threshold'],
            mouth_confirm_frames=config['mouth']['confirm_frames'],
            eyebrow_raise_threshold=config['eyebrow']['raise_threshold'],
            eyebrow_confirm_frames=config['eyebrow']['confirm_frames'],
            head_tilt_threshold=config['head_tilt']['angle_threshold'],
            head_tilt_deadzone=config['head_tilt'].get('deadzone', 7.0),
            head_tilt_confirm_frames=config['head_tilt']['confirm_frames'],
            gesture_cooldown=config['gesture']['cooldown'],
        )


class FaceLandmarks:
    """顔のランドマークインデックス定義"""
    # 右目
    RIGHT_EYE_TOP = 159
    RIGHT_EYE_BOTTOM = 145
    RIGHT_EYE_LEFT = 33
    RIGHT_EYE_RIGHT = 133
    
    # 左目
    LEFT_EYE_TOP = 386
    LEFT_EYE_BOTTOM = 374
    LEFT_EYE_LEFT = 362
    LEFT_EYE_RIGHT = 263
    
    # 口
    MOUTH_TOP = 13
    MOUTH_BOTTOM = 14
    MOUTH_LEFT = 78
    MOUTH_RIGHT = 308
    
    # 眉
    RIGHT_EYEBROW = 70
    LEFT_EYEBROW = 300
    FOREHEAD_CENTER = 10
    
    # 頭の傾き検出用
    NOSE_TIP = 4
    CHIN = 152


class GestureDetector:
    """顔ジェスチャー検出クラス"""
    
    def __init__(self, thresholds: Optional[Thresholds] = None):
        """
        初期化
        
        Args:
            thresholds: 検出閾値（Noneの場合はデフォルト値を使用）
        """
        self.thresholds = thresholds or Thresholds()
        
        # MediaPipe Face Mesh初期化
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # 状態履歴
        self.eye_closed_history = deque(maxlen=self.thresholds.long_close_frames)
        self.mouth_open_history = deque(maxlen=self.thresholds.mouth_confirm_frames)
        self.eyebrow_raised_history = deque(maxlen=self.thresholds.eyebrow_confirm_frames)
        self.head_tilt_left_history = deque(maxlen=self.thresholds.head_tilt_confirm_frames)
        self.head_tilt_right_history = deque(maxlen=self.thresholds.head_tilt_confirm_frames)
        
        # まばたき検出用
        self.last_blink_time = 0.0
        self.blink_count = 0

        # 眉のベースライン検出用（移動平均）
        self.eyebrow_baseline_history = deque(maxlen=30)  # 約1秒分のベースライン
        self.eyebrow_baseline = None

        # ジェスチャークールダウン
        self.last_gesture_time: Dict[GestureType, float] = {}

        # ジェスチャー確定フラグ（一度定常状態に戻らないと再検出しない）
        self.gesture_confirmed: Dict[GestureType, bool] = {}

        # コールバック
        self.on_gesture_detected = None
    
    def _calculate_eye_aspect_ratio(
        self, 
        landmarks, 
        top: int, 
        bottom: int, 
        left: int, 
        right: int
    ) -> float:
        """目の縦横比（EAR）を計算"""
        vertical = np.linalg.norm(
            np.array([landmarks[top].x, landmarks[top].y]) -
            np.array([landmarks[bottom].x, landmarks[bottom].y])
        )
        horizontal = np.linalg.norm(
            np.array([landmarks[left].x, landmarks[left].y]) -
            np.array([landmarks[right].x, landmarks[right].y])
        )
        return vertical / horizontal if horizontal > 0 else 0
    
    def _calculate_mouth_aspect_ratio(self, landmarks) -> float:
        """口の縦横比を計算"""
        lm = FaceLandmarks
        vertical = np.linalg.norm(
            np.array([landmarks[lm.MOUTH_TOP].x, landmarks[lm.MOUTH_TOP].y]) -
            np.array([landmarks[lm.MOUTH_BOTTOM].x, landmarks[lm.MOUTH_BOTTOM].y])
        )
        horizontal = np.linalg.norm(
            np.array([landmarks[lm.MOUTH_LEFT].x, landmarks[lm.MOUTH_LEFT].y]) -
            np.array([landmarks[lm.MOUTH_RIGHT].x, landmarks[lm.MOUTH_RIGHT].y])
        )
        return vertical / horizontal if horizontal > 0 else 0
    
    def _calculate_eyebrow_position(self, landmarks) -> float:
        """眉の位置（上げ下げ）を計算"""
        lm = FaceLandmarks
        right_eyebrow_y = landmarks[lm.RIGHT_EYEBROW].y
        left_eyebrow_y = landmarks[lm.LEFT_EYEBROW].y
        forehead_y = landmarks[lm.FOREHEAD_CENTER].y
        
        avg_eyebrow = (right_eyebrow_y + left_eyebrow_y) / 2
        return forehead_y - avg_eyebrow
    
    def _calculate_head_tilt(self, landmarks) -> float:
        """頭の傾き角度を計算"""
        lm = FaceLandmarks
        nose = np.array([landmarks[lm.NOSE_TIP].x, landmarks[lm.NOSE_TIP].y])
        chin = np.array([landmarks[lm.CHIN].x, landmarks[lm.CHIN].y])
        
        diff = nose - chin
        angle = np.degrees(np.arctan2(diff[0], diff[1]))
        return angle
    
    def _is_gesture_available(self, gesture_type: GestureType) -> bool:
        """ジェスチャーがクールダウン中でないか確認"""
        if gesture_type not in self.last_gesture_time:
            return True
        
        elapsed = time.time() - self.last_gesture_time[gesture_type]
        return elapsed >= self.thresholds.gesture_cooldown
    
    def _confirm_gesture(self, gesture_type: GestureType) -> None:
        """ジェスチャーを確定"""
        self.last_gesture_time[gesture_type] = time.time()
        self.gesture_confirmed[gesture_type] = True

        if self.on_gesture_detected:
            self.on_gesture_detected(gesture_type)

    def _is_gesture_ready(self, gesture_type: GestureType) -> bool:
        """ジェスチャーが再検出可能か確認（定常状態に戻った後のみ）"""
        return not self.gesture_confirmed.get(gesture_type, False)

    def _reset_gesture_confirmed(self, gesture_type: GestureType) -> None:
        """ジェスチャーの確定フラグをリセット（定常状態に戻った時に呼ぶ）"""
        self.gesture_confirmed[gesture_type] = False
    
    def detect(self, frame: np.ndarray) -> Tuple[GestureState, Any]:
        """
        フレームからジェスチャーを検出
        
        Args:
            frame: BGR形式の画像フレーム
            
        Returns:
            (GestureState, MediaPipe結果) のタプル
        """
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        
        state = GestureState()
        
        if not results.multi_face_landmarks:
            return state, results

        landmarks = results.multi_face_landmarks[0].landmark
        state.face_detected = True
        lm = FaceLandmarks
        
        # 目の縦横比を計算
        right_ear = self._calculate_eye_aspect_ratio(
            landmarks, lm.RIGHT_EYE_TOP, lm.RIGHT_EYE_BOTTOM,
            lm.RIGHT_EYE_LEFT, lm.RIGHT_EYE_RIGHT
        )
        left_ear = self._calculate_eye_aspect_ratio(
            landmarks, lm.LEFT_EYE_TOP, lm.LEFT_EYE_BOTTOM,
            lm.LEFT_EYE_LEFT, lm.LEFT_EYE_RIGHT
        )
        
        state.right_eye_ar = right_ear
        state.left_eye_ar = left_ear
        avg_ear = (right_ear + left_ear) / 2
        
        # 目の開閉判定
        eyes_closed = avg_ear < self.thresholds.eye_ar_threshold
        state.eyes_closed = eyes_closed

        # 履歴更新
        self.eye_closed_history.append(eyes_closed)

        current_time = time.time()

        # まばたき検出（閉→開のエッジ検出）
        # 前回閉じていて今回開いたらまばたき完了
        if len(self.eye_closed_history) >= 2:
            was_closed = self.eye_closed_history[-2]
            is_open = not eyes_closed
            if was_closed and is_open:
                # クールダウン中は新しいまばたきカウントを開始しない
                if not self._is_gesture_available(GestureType.DOUBLE_BLINK):
                    # クールダウン中：まばたきカウントをリセット状態に保つ
                    self.blink_count = 0
                    self.last_blink_time = 0
                else:
                    # まばたき検出
                    time_since_last = current_time - self.last_blink_time
                    if time_since_last < self.thresholds.double_blink_interval and self.blink_count >= 1:
                        # 2回目のまばたき（前回から0.8秒以内）
                        self.blink_count += 1
                        if self.blink_count >= 2:
                            state.detected_gesture = GestureType.DOUBLE_BLINK
                            self._confirm_gesture(GestureType.DOUBLE_BLINK)
                            self.blink_count = 0
                            self.last_blink_time = 0  # リセット
                    else:
                        # 1回目のまばたき、またはタイムアウト後
                        self.blink_count = 1
                        self.last_blink_time = current_time
        
        # 長閉じ検出
        if (len(self.eye_closed_history) == self.thresholds.long_close_frames and
            all(self.eye_closed_history) and
            self._is_gesture_available(GestureType.LONG_CLOSE)):
            state.detected_gesture = GestureType.LONG_CLOSE
            self._confirm_gesture(GestureType.LONG_CLOSE)
        
        # 口の開閉
        mouth_ar = self._calculate_mouth_aspect_ratio(landmarks)
        state.mouth_ar = mouth_ar
        mouth_detected = mouth_ar > self.thresholds.mouth_ar_threshold
        state.mouth_open = mouth_detected

        # 口が閉じたら確定フラグをリセット（再検出可能に）
        if not mouth_detected:
            self._reset_gesture_confirmed(GestureType.MOUTH_OPEN)

        self.mouth_open_history.append(mouth_detected)
        if (all(self.mouth_open_history) and
            len(self.mouth_open_history) == self.thresholds.mouth_confirm_frames and
            self._is_gesture_available(GestureType.MOUTH_OPEN) and
            self._is_gesture_ready(GestureType.MOUTH_OPEN)):
            state.detected_gesture = GestureType.MOUTH_OPEN
            self._confirm_gesture(GestureType.MOUTH_OPEN)

        # 頭の傾きを先に計算（眉検出の判定に使用）
        head_tilt = self._calculate_head_tilt(landmarks)
        state.head_tilt_angle = head_tilt
        deadzone = self.thresholds.head_tilt_deadzone
        threshold = self.thresholds.head_tilt_threshold

        # 角度の解釈:
        # 正面を向いている時: ±180度付近（鼻が顎の真上）
        # 左に傾ける: 負の方向に値が小さくなる（例: -160度）
        # 右に傾ける: 正の方向に値が小さくなる（例: 160度）
        #
        # CENTER: |angle| > (180 - deadzone) つまり 173〜180 または -180〜-173
        # LEFT: -173〜0（負の値で不感帯外）
        # RIGHT: 0〜173（正の値で不感帯外）

        is_head_centered = abs(head_tilt) > (180 - deadzone)  # 173〜180, -180〜-173がCENTER

        # 眉の位置（移動平均からの相対変化で検出）
        eyebrow_pos = self._calculate_eyebrow_position(landmarks)
        state.eyebrow_position = eyebrow_pos

        # 頭が大きく傾いている時は眉検出を無効にする（誤検出防止）
        # 閾値未満（|angle| > 160）なら眉検出を有効にする
        is_head_centered_for_eyebrow = abs(head_tilt) > (180 - threshold)
        eyebrows_detected = False
        if is_head_centered_for_eyebrow:
            # ベースラインからの上昇で判定
            if self.eyebrow_baseline is not None:
                eyebrow_diff = eyebrow_pos - self.eyebrow_baseline
                eyebrows_detected = eyebrow_diff > self.thresholds.eyebrow_raise_threshold

            # ベースライン（移動平均）を更新（眉を上げていない時のみ）
            if not eyebrows_detected:
                self.eyebrow_baseline_history.append(eyebrow_pos)
                if len(self.eyebrow_baseline_history) >= 10:
                    self.eyebrow_baseline = sum(self.eyebrow_baseline_history) / len(self.eyebrow_baseline_history)
                # 眉が下がったら確定フラグをリセット
                self._reset_gesture_confirmed(GestureType.EYEBROWS_RAISED)

        state.eyebrows_raised = eyebrows_detected

        self.eyebrow_raised_history.append(eyebrows_detected)
        if (all(self.eyebrow_raised_history) and
            len(self.eyebrow_raised_history) == self.thresholds.eyebrow_confirm_frames and
            self._is_gesture_available(GestureType.EYEBROWS_RAISED) and
            self._is_gesture_ready(GestureType.EYEBROWS_RAISED)):
            state.detected_gesture = GestureType.EYEBROWS_RAISED
            self._confirm_gesture(GestureType.EYEBROWS_RAISED)

        # 頭の傾き判定
        if is_head_centered:
            # 不感帯内：中央 → 確定フラグをリセット
            state.head_tilt_center = True
            state.head_tilt_left = False
            state.head_tilt_right = False
            self._reset_gesture_confirmed(GestureType.HEAD_TILT_LEFT)
            self._reset_gesture_confirmed(GestureType.HEAD_TILT_RIGHT)
        else:
            # 不感帯外
            state.head_tilt_center = False
            # LEFT: 負の値で不感帯外（-173〜0）、閾値超えで確定
            left_detected = head_tilt < 0 and head_tilt > -(180 - deadzone)
            state.head_tilt_left = left_detected
            # RIGHT: 正の値で不感帯外（0〜173）、閾値超えで確定
            right_detected = head_tilt > 0 and head_tilt < (180 - deadzone)
            state.head_tilt_right = right_detected

        self.head_tilt_left_history.append(state.head_tilt_left)
        self.head_tilt_right_history.append(state.head_tilt_right)

        if (all(self.head_tilt_left_history) and
            len(self.head_tilt_left_history) == self.thresholds.head_tilt_confirm_frames and
            self._is_gesture_available(GestureType.HEAD_TILT_LEFT) and
            self._is_gesture_ready(GestureType.HEAD_TILT_LEFT)):
            state.detected_gesture = GestureType.HEAD_TILT_LEFT
            self._confirm_gesture(GestureType.HEAD_TILT_LEFT)

        if (all(self.head_tilt_right_history) and
            len(self.head_tilt_right_history) == self.thresholds.head_tilt_confirm_frames and
            self._is_gesture_available(GestureType.HEAD_TILT_RIGHT) and
            self._is_gesture_ready(GestureType.HEAD_TILT_RIGHT)):
            state.detected_gesture = GestureType.HEAD_TILT_RIGHT
            self._confirm_gesture(GestureType.HEAD_TILT_RIGHT)
        
        return state, results
    
    def reset(self) -> None:
        """状態をリセット"""
        self.eye_closed_history.clear()
        self.mouth_open_history.clear()
        self.eyebrow_raised_history.clear()
        self.head_tilt_left_history.clear()
        self.head_tilt_right_history.clear()
        self.last_blink_time = 0.0
        self.blink_count = 0
        self.eyebrow_baseline_history.clear()
        self.eyebrow_baseline = None
        self.last_gesture_time.clear()
        self.gesture_confirmed.clear()
    
    def update_thresholds(self, thresholds: Thresholds) -> None:
        """閾値を更新"""
        self.thresholds = thresholds
    
    def close(self) -> None:
        """リソースを解放"""
        self.face_mesh.close()


class DebugVisualizer:
    """デバッグ用の可視化クラス"""
    
    def __init__(self):
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        self.mp_face_mesh = mp.solutions.face_mesh
    
    def draw(self, frame: np.ndarray, state: GestureState, results: Any) -> np.ndarray:
        """デバッグ情報を描画"""
        # 顔のランドマークを描画
        if results.multi_face_landmarks:
            self.mp_drawing.draw_landmarks(
                frame,
                results.multi_face_landmarks[0],
                self.mp_face_mesh.FACEMESH_CONTOURS,
                landmark_drawing_spec=None,
                connection_drawing_spec=self.mp_drawing_styles.get_default_face_mesh_contours_style()
            )
        
        # ステータス表示
        y_offset = 30
        status_color = (0, 255, 0) if state.face_detected else (0, 0, 255)
        
        cv2.putText(frame, f"Face: {'Detected' if state.face_detected else 'Not Found'}", 
                    (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)
        
        if state.face_detected:
            y_offset += 25
            cv2.putText(frame, f"Eye AR: L={state.left_eye_ar:.2f} R={state.right_eye_ar:.2f}", 
                        (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            y_offset += 25
            eye_status = "CLOSED" if state.eyes_closed else "Open"
            eye_color = (0, 0, 255) if state.eyes_closed else (0, 255, 0)
            cv2.putText(frame, f"Eyes: {eye_status}", 
                        (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, eye_color, 2)
            
            y_offset += 25
            cv2.putText(frame, f"Mouth AR: {state.mouth_ar:.2f}", 
                        (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            y_offset += 25
            mouth_status = "OPEN" if state.mouth_open else "Closed"
            mouth_color = (0, 255, 255) if state.mouth_open else (255, 255, 255)
            cv2.putText(frame, f"Mouth: {mouth_status}", 
                        (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, mouth_color, 2)
            
            y_offset += 25
            eyebrow_status = "RAISED" if state.eyebrows_raised else "Normal"
            eyebrow_color = (255, 0, 255) if state.eyebrows_raised else (255, 255, 255)
            cv2.putText(frame, f"Eyebrows: {eyebrow_status} ({state.eyebrow_position:.4f})",
                        (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, eyebrow_color, 2)
            
            y_offset += 25
            # 角度範囲: CENTER(173〜180, -180〜-173), LEFT(-173〜0), RIGHT(0〜173)
            if state.head_tilt_center:
                tilt_status = "CENTER"
                tilt_color = (0, 255, 0)  # 緑
            elif state.head_tilt_left:
                tilt_status = "LEFT"
                tilt_color = (255, 165, 0)  # オレンジ
            elif state.head_tilt_right:
                tilt_status = "RIGHT"
                tilt_color = (255, 165, 0)  # オレンジ
            else:
                tilt_status = "---"  # 不感帯外だが閾値未満
                tilt_color = (255, 255, 255)
            cv2.putText(frame, f"Head Tilt: {tilt_status} ({state.head_tilt_angle:.1f})",
                        (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, tilt_color, 2)
            
            # ジェスチャーイベント表示
            if state.detected_gesture != GestureType.NONE:
                y_offset += 40
                gesture_names = {
                    GestureType.DOUBLE_BLINK: ">>> DOUBLE BLINK (YES) <<<",
                    GestureType.LONG_CLOSE: ">>> LONG CLOSE (NO) <<<",
                    GestureType.EYEBROWS_RAISED: ">>> EYEBROWS RAISED (MENU) <<<",
                    GestureType.MOUTH_OPEN: ">>> MOUTH OPEN (SELECT) <<<",
                    GestureType.HEAD_TILT_LEFT: ">>> HEAD TILT LEFT (PREV) <<<",
                    GestureType.HEAD_TILT_RIGHT: ">>> HEAD TILT RIGHT (NEXT) <<<",
                }
                cv2.putText(frame, gesture_names.get(state.detected_gesture, ""), 
                            (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        return frame


def main():
    """デバッグ用メイン関数"""
    parser = argparse.ArgumentParser(description='顔ジェスチャー検出テスト')
    parser.add_argument('--debug', action='store_true', help='デバッグモードで実行')
    parser.add_argument('--config', type=str, default='config/thresholds.yaml', 
                        help='閾値設定ファイルのパス')
    parser.add_argument('--camera', type=int, default=0, help='カメラデバイスID')
    args = parser.parse_args()
    
    print("顔ジェスチャー検出テストを開始します...")
    print("終了するには 'q' キーを押してください")
    print("-" * 50)
    
    # 閾値の読み込み
    config_path = Path(args.config)
    if config_path.exists():
        print(f"設定ファイルを読み込みます: {config_path}")
        thresholds = Thresholds.from_yaml(str(config_path))
    else:
        print("デフォルトの閾値を使用します")
        thresholds = Thresholds()
    
    # カメラ初期化
    cap = cv2.VideoCapture(args.camera)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    if not cap.isOpened():
        print("エラー: カメラを開けませんでした")
        return
    
    # 検出器と可視化クラスの初期化
    detector = GestureDetector(thresholds)
    visualizer = DebugVisualizer() if args.debug else None
    
    # ジェスチャー検出時のコールバック
    def on_gesture(gesture_type: GestureType):
        gesture_messages = {
            GestureType.DOUBLE_BLINK: "検出: 2回連続まばたき（はい）",
            GestureType.LONG_CLOSE: "検出: 長めに目を閉じる（いいえ）",
            GestureType.EYEBROWS_RAISED: "検出: 眉を上げる（メニュー）",
            GestureType.MOUTH_OPEN: "検出: 口を開ける（決定）",
            GestureType.HEAD_TILT_LEFT: "検出: 頭を左に傾ける（前へ）",
            GestureType.HEAD_TILT_RIGHT: "検出: 頭を右に傾ける（次へ）",
        }
        print(gesture_messages.get(gesture_type, f"検出: {gesture_type}"))
    
    detector.on_gesture_detected = on_gesture
    
    print("カメラ起動完了")
    print("顔をカメラに向けてください")
    print("-" * 50)
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("フレーム取得エラー")
                break
            
            # 左右反転（鏡像）
            frame = cv2.flip(frame, 1)
            
            # ジェスチャー検出
            state, results = detector.detect(frame)
            
            # デバッグ表示
            if visualizer:
                frame = visualizer.draw(frame, state, results)
            
            # 画面表示
            cv2.imshow('Face Gesture Detection', frame)
            
            # キー入力チェック
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                detector.reset()
                print("状態をリセットしました")
                
    except KeyboardInterrupt:
        print("\n中断されました")
    finally:
        detector.close()
        cap.release()
        cv2.destroyAllWindows()
        print("終了しました")


if __name__ == "__main__":
    main()
