"""
WebSocket処理モジュール

クライアントからのフレームを受信し、ジェスチャー検出結果を返信
"""

import json
import time
from typing import Optional, Callable, Any
from pathlib import Path

from fastapi import WebSocket, WebSocketDisconnect

from ..gesture_detector import GestureDetector, GestureType, Thresholds
from .frame_processor import decode_base64_frame


class GestureWebSocketHandler:
    """WebSocket経由でジェスチャー検出を行うハンドラ"""

    def __init__(self, thresholds: Optional[Thresholds] = None):
        """
        初期化

        Args:
            thresholds: ジェスチャー検出閾値
        """
        self.detector = GestureDetector(thresholds)
        self.websocket: Optional[WebSocket] = None
        self.is_connected = False
        self.on_gesture: Optional[Callable[[GestureType], None]] = None

        # ジェスチャー検出時のコールバックを設定
        self.detector.on_gesture_detected = self._handle_gesture

    def _handle_gesture(self, gesture_type: GestureType) -> None:
        """ジェスチャー検出時の内部ハンドラ"""
        if self.on_gesture:
            self.on_gesture(gesture_type)

    async def connect(self, websocket: WebSocket) -> None:
        """WebSocket接続を確立"""
        await websocket.accept()
        self.websocket = websocket
        self.is_connected = True

    async def disconnect(self) -> None:
        """WebSocket接続を切断"""
        self.is_connected = False
        self.websocket = None
        self.detector.reset()

    async def send_json(self, data: dict) -> None:
        """JSONデータを送信"""
        if self.websocket and self.is_connected:
            try:
                await self.websocket.send_json(data)
            except Exception as e:
                print(f"送信エラー: {e}")

    async def process_frame(self, frame_data: str) -> dict:
        """
        フレームを処理してジェスチャーを検出

        Args:
            frame_data: Base64エンコードされた画像データ

        Returns:
            検出結果のdict
        """
        # フレームをデコード
        frame = decode_base64_frame(frame_data)
        if frame is None:
            return {
                "type": "error",
                "payload": {
                    "code": "DECODE_ERROR",
                    "message": "フレームのデコードに失敗しました"
                },
                "timestamp": int(time.time() * 1000)
            }

        # ジェスチャー検出
        state, _ = self.detector.detect(frame)

        # 顔状態を返信（numpy.bool_をPython boolに変換）
        result = {
            "type": "face_state",
            "payload": {
                "face_detected": bool(state.face_detected),
                "eyes_closed": bool(state.eyes_closed),
                "left_eye_ar": float(round(state.left_eye_ar, 3)),
                "right_eye_ar": float(round(state.right_eye_ar, 3)),
                "mouth_open": bool(state.mouth_open),
                "mouth_ar": float(round(state.mouth_ar, 3)),
                "eyebrows_raised": bool(state.eyebrows_raised),
                "eyebrow_position": float(round(state.eyebrow_position, 4)),
                "head_tilt_angle": float(round(state.head_tilt_angle, 1)),
                "head_tilt_left": bool(state.head_tilt_left),
                "head_tilt_right": bool(state.head_tilt_right),
                "head_tilt_center": bool(state.head_tilt_center),
            },
            "timestamp": int(time.time() * 1000)
        }

        # ジェスチャーが検出された場合は追加
        if state.detected_gesture != GestureType.NONE:
            result["gesture"] = {
                "type": state.detected_gesture.name,
                "name": self._get_gesture_name(state.detected_gesture)
            }

        return result

    def _get_gesture_name(self, gesture_type: GestureType) -> str:
        """ジェスチャータイプの日本語名を取得"""
        names = {
            GestureType.DOUBLE_BLINK: "ダブルまばたき",
            GestureType.LONG_CLOSE: "長閉じ",
            GestureType.EYEBROWS_RAISED: "眉上げ",
            GestureType.MOUTH_OPEN: "口開け",
            GestureType.HEAD_TILT_LEFT: "左傾き",
            GestureType.HEAD_TILT_RIGHT: "右傾き",
        }
        return names.get(gesture_type, str(gesture_type))

    async def handle_message(self, message: dict) -> Optional[dict]:
        """
        受信メッセージを処理

        Args:
            message: 受信したJSONメッセージ

        Returns:
            応答メッセージ（不要な場合はNone）
        """
        msg_type = message.get("type")
        payload = message.get("payload", {})

        if msg_type == "frame":
            # フレーム処理
            frame_data = payload.get("data", "")
            return await self.process_frame(frame_data)

        elif msg_type == "ping":
            # ヘルスチェック
            return {
                "type": "pong",
                "timestamp": int(time.time() * 1000)
            }

        elif msg_type == "reset":
            # 状態リセット
            self.detector.reset()
            return {
                "type": "reset_complete",
                "timestamp": int(time.time() * 1000)
            }

        return None

    def close(self) -> None:
        """リソースを解放"""
        self.detector.close()


async def websocket_endpoint(websocket: WebSocket, handler: GestureWebSocketHandler):
    """
    WebSocketエンドポイントのメイン処理

    Args:
        websocket: WebSocket接続
        handler: ジェスチャーハンドラ
    """
    await handler.connect(websocket)

    # 接続確立メッセージを送信
    await handler.send_json({
        "type": "connected",
        "payload": {
            "message": "ジェスチャー検出サーバーに接続しました"
        },
        "timestamp": int(time.time() * 1000)
    })

    try:
        while True:
            # メッセージを受信
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await handler.send_json({
                    "type": "error",
                    "payload": {
                        "code": "INVALID_JSON",
                        "message": "無効なJSONフォーマット"
                    },
                    "timestamp": int(time.time() * 1000)
                })
                continue

            # メッセージを処理
            response = await handler.handle_message(message)
            if response:
                await handler.send_json(response)

    except WebSocketDisconnect:
        await handler.disconnect()
    except Exception as e:
        print(f"WebSocketエラー: {e}")
        await handler.disconnect()
