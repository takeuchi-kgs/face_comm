#!/usr/bin/env python3
"""
顔ジェスチャーコミュニケーションシステム - メインエントリーポイント

体が不自由な方が顔の動きでコミュニケーションを取るためのシステム
"""

import sys
import signal
from pathlib import Path

# プロジェクトルートをパスに追加
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.gesture_detector import GestureDetector, GestureType, Thresholds
from src.utils.config_loader import ConfigLoader
from src.utils.logger import setup_logger

# TODO: 以下のモジュールは今後実装予定
# from src.ui.main_window import MainWindow
# from src.audio.speech import SpeechSynthesizer
# from src.controllers.audible_controller import AudibleController


def signal_handler(sig, frame):
    """Ctrl+Cでの終了処理"""
    print("\n終了処理中...")
    sys.exit(0)


def main():
    """メイン関数"""
    # シグナルハンドラの設定
    signal.signal(signal.SIGINT, signal_handler)
    
    # ロガーのセットアップ
    logger = setup_logger()
    logger.info("顔ジェスチャーコミュニケーションシステムを起動します")
    
    # 設定の読み込み
    config_dir = PROJECT_ROOT / "config"
    config = ConfigLoader(config_dir)
    
    logger.info(f"設定ファイルを読み込みました: {config_dir}")
    
    # 閾値の読み込み
    thresholds_path = config_dir / "thresholds.yaml"
    if thresholds_path.exists():
        thresholds = Thresholds.from_yaml(str(thresholds_path))
        logger.info("閾値設定を読み込みました")
    else:
        thresholds = Thresholds()
        logger.warning("閾値設定ファイルが見つかりません。デフォルト値を使用します")
    
    # ジェスチャー検出器の初期化
    detector = GestureDetector(thresholds)
    
    # ジェスチャー検出時のコールバック
    def on_gesture(gesture_type: GestureType):
        """ジェスチャー検出時の処理"""
        gesture_actions = {
            GestureType.DOUBLE_BLINK: "はい / 決定",
            GestureType.LONG_CLOSE: "いいえ / キャンセル",
            GestureType.EYEBROWS_RAISED: "メニュー表示",
            GestureType.MOUTH_OPEN: "選択確定",
            GestureType.HEAD_TILT_LEFT: "前の項目",
            GestureType.HEAD_TILT_RIGHT: "次の項目",
        }
        action = gesture_actions.get(gesture_type, str(gesture_type))
        logger.info(f"ジェスチャー検出: {action}")
        
        # TODO: ここでUIの更新や音声合成を呼び出す
    
    detector.on_gesture_detected = on_gesture
    
    # TODO: GUI起動（現在は未実装）
    # このバージョンではコンソールモードで動作
    print("=" * 50)
    print("顔ジェスチャーコミュニケーションシステム")
    print("=" * 50)
    print()
    print("現在はデバッグモードで動作しています。")
    print("GUIを起動するには以下のコマンドを実行してください:")
    print()
    print("  python src/gesture_detector.py --debug")
    print()
    print("終了するには Ctrl+C を押してください")
    print()
    
    # イベントループ（将来的にはGUIのイベントループに置き換え）
    try:
        while True:
            pass
    except KeyboardInterrupt:
        pass
    finally:
        detector.close()
        logger.info("システムを終了しました")


if __name__ == "__main__":
    main()
