"""
FastAPI Webアプリケーション

顔ジェスチャーで操作するWebアプリのメインエントリーポイント
"""

import uvicorn
from pathlib import Path
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from ..gesture_detector import Thresholds
from .websocket_handler import GestureWebSocketHandler, websocket_endpoint


# プロジェクトルートを取得
PROJECT_ROOT = Path(__file__).parent.parent.parent
STATIC_DIR = PROJECT_ROOT / "static"
CONFIG_DIR = PROJECT_ROOT / "config"


# FastAPIアプリケーション
app = FastAPI(
    title="Face Gesture Communication",
    description="顔ジェスチャーで操作するコミュニケーションシステム",
    version="0.1.0"
)


# 閾値を読み込み
def load_thresholds() -> Thresholds:
    """設定ファイルから閾値を読み込み"""
    thresholds_path = CONFIG_DIR / "thresholds.yaml"
    if thresholds_path.exists():
        return Thresholds.from_yaml(str(thresholds_path))
    return Thresholds()


# WebSocketハンドラを作成
gesture_handler = GestureWebSocketHandler(load_thresholds())


# 静的ファイルをマウント
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    """メインページを返す"""
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "Face Gesture Communication API", "status": "running"}


@app.get("/api/config")
async def get_config():
    """設定情報を返す"""
    import yaml

    config = {
        "phrases": [],
        "melodies": []
    }

    # 定型文を読み込み
    phrases_path = CONFIG_DIR / "phrases.yaml"
    if phrases_path.exists():
        with open(phrases_path, 'r', encoding='utf-8') as f:
            phrases_data = yaml.safe_load(f)
            config["phrases"] = phrases_data.get("categories", [])

    # メロディを読み込み
    melodies_path = CONFIG_DIR / "melodies.yaml"
    if melodies_path.exists():
        with open(melodies_path, 'r', encoding='utf-8') as f:
            melodies_data = yaml.safe_load(f)
            config["melodies"] = melodies_data.get("melodies", [])

    return config


@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    """WebSocketエンドポイント"""
    # 各接続ごとに新しいハンドラを作成
    handler = GestureWebSocketHandler(load_thresholds())
    try:
        await websocket_endpoint(websocket, handler)
    finally:
        handler.close()


@app.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "healthy"}


def main():
    """メインエントリーポイント"""
    print("=" * 50)
    print("Face Gesture Communication Web Server")
    print("=" * 50)
    print(f"Static files: {STATIC_DIR}")
    print(f"Config files: {CONFIG_DIR}")
    print("")
    print("Starting server...")
    print("Open http://localhost:8000 in your browser")
    print("=" * 50)

    uvicorn.run(
        "src.web.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(PROJECT_ROOT / "src")]
    )


if __name__ == "__main__":
    main()
