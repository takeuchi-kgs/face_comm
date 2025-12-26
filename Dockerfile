# 顔ジェスチャーコミュニケーションシステム
# Raspberry Pi 4 (64-bit) 用 Dockerfile
#
# ビルド: docker build -t face-comm .
# 実行:   docker-compose up -d

FROM python:3.11-slim-bookworm

LABEL maintainer="Face Communication Project"
LABEL description="顔ジェスチャーコミュニケーションシステム for Raspberry Pi 4"

# 環境変数
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Tokyo

# タイムゾーン設定
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# システムパッケージのインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    # ビルドツール
    build-essential \
    cmake \
    pkg-config \
    # Python関連
    python3-dev \
    # OpenCV依存関係
    libopencv-dev \
    libatlas-base-dev \
    libhdf5-dev \
    libhdf5-serial-dev \
    # 画像処理
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libwebp-dev \
    # ビデオ関連
    libv4l-dev \
    v4l-utils \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    # GUI関連 (X11)
    libx11-dev \
    libxext-dev \
    libxrender-dev \
    libxi-dev \
    libxtst-dev \
    python3-tk \
    # Qt関連
    libqt5gui5 \
    libqt5widgets5 \
    libqt5core5a \
    qt5-qmake \
    # 音声関連
    espeak-ng \
    libespeak-ng-dev \
    alsa-utils \
    pulseaudio \
    libportaudio2 \
    portaudio19-dev \
    # ブラウザ (Audible用)
    chromium \
    chromium-driver \
    # その他
    wget \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリ
WORKDIR /app

# Python依存関係のインストール（キャッシュ効率化のため先にコピー）
COPY requirements.txt .

# pipのアップグレードとパッケージインストール
RUN pip install --no-cache-dir --upgrade pip wheel setuptools && \
    pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY . .

# 設定ディレクトリの権限設定（ボリュームマウント用）
RUN mkdir -p /app/config /app/logs && \
    chmod -R 755 /app

# 非rootユーザーの作成（セキュリティ向上）
RUN useradd -m -s /bin/bash facecomm && \
    chown -R facecomm:facecomm /app

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import cv2; print('OK')" || exit 1

# デフォルトコマンド
CMD ["python", "src/main.py"]
