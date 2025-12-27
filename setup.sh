#!/bin/bash
# =============================================================================
# Face Communication System - Setup Script
# 顔ジェスチャーコミュニケーションシステム セットアップスクリプト
#
# 対応OS: Raspberry Pi OS, Ubuntu, macOS
# 使用方法: ./setup.sh
# =============================================================================

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "=============================================="
echo "  顔ジェスチャーコミュニケーションシステム"
echo "  セットアップスクリプト"
echo "=============================================="
echo -e "${NC}"

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)

# OS確認
IS_MAC=false
IS_RPI=false

if [[ "$(uname)" == "Darwin" ]]; then
    echo -e "${YELLOW}macOS環境を検出しました${NC}"
    IS_MAC=true
elif [[ -f /etc/os-release ]]; then
    . /etc/os-release
    echo -e "${YELLOW}${NAME} ${VERSION_ID} を検出しました${NC}"

    # Raspberry Pi確認
    if [[ -f /proc/device-tree/model ]]; then
        MODEL=$(tr -d '\0' < /proc/device-tree/model)
        if [[ "$MODEL" == *"Raspberry Pi"* ]]; then
            echo -e "${GREEN}Raspberry Pi を検出: $MODEL${NC}"
            IS_RPI=true
        fi
    fi
else
    echo -e "${RED}未対応のOSです${NC}"
    exit 1
fi

# =============================================================================
# システムパッケージのインストール
# =============================================================================
echo ""
echo -e "${BLUE}[1/4] システムパッケージをインストール中...${NC}"

if [[ "$IS_MAC" == true ]]; then
    echo -e "${GREEN}macOSではシステムパッケージのインストールをスキップします${NC}"
else
    sudo apt-get update
    sudo apt-get install -y \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        libatlas-base-dev \
        libhdf5-dev \
        libhdf5-serial-dev \
        libharfbuzz0b \
        libwebp-dev \
        libtiff6 \
        libopenexr-dev \
        libgstreamer1.0-dev \
        libavcodec-dev \
        libavformat-dev \
        libswscale-dev \
        libv4l-dev \
        curl \
        git

    # Raspberry Pi固有のパッケージ
    if [[ "$IS_RPI" == true ]]; then
        sudo apt-get install -y \
            libcamera-apps \
            libcamera-dev \
            espeak-ng || true
    fi
fi

# =============================================================================
# uvのインストール
# =============================================================================
echo ""
echo -e "${BLUE}[2/4] uv (Python パッケージマネージャ) をインストール中...${NC}"

# uvがインストールされているか確認
if command -v uv &> /dev/null; then
    echo -e "${GREEN}uv は既にインストールされています: $(uv --version)${NC}"
else
    echo "uvをインストール中..."
    curl -LsSf https://astral.sh/uv/install.sh | sh

    # パスを追加
    if [[ "$IS_MAC" == true ]]; then
        export PATH="$HOME/.local/bin:$PATH"
    else
        export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
    fi

    # .bashrcにパスを追加
    if ! grep -q "/.local/bin" ~/.bashrc 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
    fi

    echo -e "${GREEN}uv をインストールしました${NC}"
fi

# パスを再読み込み
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

# =============================================================================
# Python依存関係のインストール
# =============================================================================
echo ""
echo -e "${BLUE}[3/4] Python依存関係をインストール中...${NC}"

# uv syncで依存関係をインストール
uv sync

echo -e "${GREEN}Python依存関係をインストールしました${NC}"

# =============================================================================
# 設定ファイルの確認
# =============================================================================
echo ""
echo -e "${BLUE}[4/4] 設定ファイルを確認中...${NC}"

# 必要なファイルの確認
CONFIG_OK=true
for file in config/thresholds.yaml config/phrases.yaml config/melodies.yaml; do
    if [[ -f "$file" ]]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file が見つかりません"
        CONFIG_OK=false
    fi
done

for file in static/index.html static/js/app.js; do
    if [[ -f "$file" ]]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file が見つかりません"
        CONFIG_OK=false
    fi
done

if [[ "$CONFIG_OK" == false ]]; then
    echo -e "${RED}一部のファイルが見つかりません。git cloneが正しく完了しているか確認してください。${NC}"
fi

# =============================================================================
# systemdサービスファイルの作成（Raspberry Piのみ）
# =============================================================================
if [[ "$IS_RPI" == true ]]; then
    echo ""
    echo -e "${BLUE}systemdサービスファイルを作成中...${NC}"

    cat > face-comm.service << EOF
[Unit]
Description=Face Communication System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$HOME/.local/bin/uv run face-comm-web
Restart=always
RestartSec=5
Environment=PATH=$HOME/.local/bin:$HOME/.cargo/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

    echo -e "${GREEN}face-comm.service を作成しました${NC}"
fi

# =============================================================================
# 完了
# =============================================================================
echo ""
echo -e "${GREEN}=============================================="
echo "  セットアップが完了しました！"
echo "==============================================${NC}"
echo ""
echo -e "${BLUE}起動方法:${NC}"
echo "  uv run face-comm-web"
echo ""
echo -e "${BLUE}ブラウザでアクセス:${NC}"
echo "  http://localhost:8000"
echo ""

# IPアドレスの表示
if [[ "$IS_MAC" == true ]]; then
    IP_ADDR=$(ipconfig getifaddr en0 2>/dev/null || echo "YOUR_IP")
else
    IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_IP")
fi

if [[ "$IP_ADDR" != "YOUR_IP" && -n "$IP_ADDR" ]]; then
    echo -e "${BLUE}他のデバイスからアクセス:${NC}"
    echo "  http://${IP_ADDR}:8000"
    echo ""
fi

# 自動起動の設定案内（Raspberry Piのみ）
if [[ "$IS_RPI" == true ]]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}自動起動を設定する場合:${NC}"
    echo "  sudo cp face-comm.service /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable face-comm"
    echo "  sudo systemctl start face-comm"
    echo ""
    echo -e "${YELLOW}サービスの状態確認:${NC}"
    echo "  sudo systemctl status face-comm"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
fi
