#!/bin/bash
# 顔ジェスチャーコミュニケーションシステム - セットアップスクリプト
# Raspberry Pi 4 (Raspberry Pi OS 64-bit) 用

set -e  # エラー時に停止

echo "=============================================="
echo "顔ジェスチャーコミュニケーションシステム"
echo "環境セットアップを開始します"
echo "=============================================="

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# システムアップデート
print_status "システムをアップデートしています..."
sudo apt update && sudo apt upgrade -y

# 必要なシステムパッケージのインストール
print_status "システムパッケージをインストールしています..."
sudo apt install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    libatlas-base-dev \
    libhdf5-dev \
    libhdf5-serial-dev \
    libharfbuzz0b \
    libwebp6 \
    libtiff5 \
    libjasper1 \
    libilmbase23 \
    libopenexr23 \
    libgstreamer1.0-0 \
    libavcodec-extra \
    libavformat58 \
    libswscale5 \
    libcamera-apps \
    libcamera-dev \
    portaudio19-dev \
    espeak \
    espeak-ng \
    chromium-browser \
    chromium-chromedriver

# Python仮想環境の作成
print_status "Python仮想環境を作成しています..."
if [ -d "venv" ]; then
    print_warning "既存の仮想環境を削除します..."
    rm -rf venv
fi
python3 -m venv venv

# 仮想環境をアクティベート
source venv/bin/activate

# pipのアップグレード
print_status "pipをアップグレードしています..."
pip install --upgrade pip wheel setuptools

# Pythonパッケージのインストール
print_status "Pythonパッケージをインストールしています..."
print_warning "MediaPipeのインストールには時間がかかる場合があります..."

# 基本パッケージ
pip install numpy

# OpenCV（Raspberry Pi用）
pip install opencv-python-headless

# MediaPipe
pip install mediapipe

# その他の依存関係
pip install -r requirements.txt

# ディレクトリ作成
print_status "ディレクトリ構造を確認しています..."
mkdir -p config src/ui src/audio src/controllers src/utils tests docs logs

# __init__.py ファイルの作成
touch src/__init__.py
touch src/ui/__init__.py
touch src/audio/__init__.py
touch src/controllers/__init__.py
touch src/utils/__init__.py

# カメラの確認
print_status "カメラを確認しています..."
if [ -e /dev/video0 ]; then
    print_status "カメラが検出されました: /dev/video0"
else
    print_warning "カメラが検出されませんでした。USBカメラを接続してください。"
fi

# 完了
echo ""
echo "=============================================="
echo -e "${GREEN}セットアップが完了しました！${NC}"
echo "=============================================="
echo ""
echo "使用方法:"
echo "  1. 仮想環境をアクティベート: source venv/bin/activate"
echo "  2. アプリケーションを起動:   python src/main.py"
echo "  3. テストを実行:             python -m pytest tests/"
echo ""
echo "ジェスチャー検出テスト:"
echo "  python src/gesture_detector.py --debug"
echo ""
