#!/bin/bash
# 顔ジェスチャーコミュニケーションシステム
# ワンクリックインストールスクリプト
#
# 使用方法:
#   curl -sSL https://[your-repo]/install.sh | bash
#   または
#   chmod +x install.sh && ./install.sh

set -e

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# ルート権限チェック
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "このスクリプトはroot権限で実行してください"
        echo "  sudo ./install.sh"
        exit 1
    fi
}

# Raspberry Piチェック
check_raspberry_pi() {
    if [ ! -f /proc/device-tree/model ]; then
        print_warning "Raspberry Piではない可能性があります"
        read -p "続行しますか？ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        MODEL=$(cat /proc/device-tree/model)
        print_status "検出: $MODEL"
    fi
}

# Dockerのインストール
install_docker() {
    print_header "Dockerをインストールしています..."
    
    if command -v docker &> /dev/null; then
        print_status "Dockerは既にインストールされています"
        docker --version
    else
        # Docker公式インストールスクリプト
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        
        # 現在のユーザーをdockerグループに追加
        SUDO_USER=${SUDO_USER:-$USER}
        usermod -aG docker $SUDO_USER
        
        print_status "Dockerをインストールしました"
    fi
    
    # Docker Composeのインストール
    if command -v docker-compose &> /dev/null; then
        print_status "Docker Composeは既にインストールされています"
    else
        apt-get update
        apt-get install -y docker-compose-plugin
        print_status "Docker Composeをインストールしました"
    fi
    
    # Dockerサービスの有効化
    systemctl enable docker
    systemctl start docker
}

# プロジェクトのセットアップ
setup_project() {
    print_header "プロジェクトをセットアップしています..."
    
    # インストールディレクトリ
    INSTALL_DIR="/opt/face-comm"
    
    # ディレクトリ作成
    mkdir -p $INSTALL_DIR
    
    # ファイルコピー（既にこのディレクトリにいる場合）
    if [ -f "./docker-compose.yml" ]; then
        cp -r ./* $INSTALL_DIR/
    else
        print_error "docker-compose.yml が見つかりません"
        exit 1
    fi
    
    # 権限設定
    SUDO_USER=${SUDO_USER:-$USER}
    chown -R $SUDO_USER:$SUDO_USER $INSTALL_DIR
    
    # ログディレクトリ
    mkdir -p $INSTALL_DIR/logs
    mkdir -p $INSTALL_DIR/browser_data
    
    print_status "プロジェクトを $INSTALL_DIR にインストールしました"
}

# X11アクセス許可
setup_x11() {
    print_header "X11アクセスを設定しています..."
    
    # 全てのローカル接続を許可
    if command -v xhost &> /dev/null; then
        xhost +local: || true
    fi
    
    # 起動時に自動設定
    AUTOSTART_DIR="/etc/xdg/autostart"
    mkdir -p $AUTOSTART_DIR
    
    cat > $AUTOSTART_DIR/face-comm-xhost.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Face Comm X11 Setup
Exec=xhost +local:
Hidden=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
EOF
    
    print_status "X11アクセスを設定しました"
}

# systemdサービスの作成
create_systemd_service() {
    print_header "自動起動サービスを設定しています..."
    
    cat > /etc/systemd/system/face-comm.service << 'EOF'
[Unit]
Description=顔ジェスチャーコミュニケーションシステム
Requires=docker.service
After=docker.service network-online.target graphical.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/face-comm
Environment=DISPLAY=:0

# 起動前にX11アクセスを許可
ExecStartPre=/bin/bash -c 'xhost +local: || true'

# Docker Composeで起動
ExecStart=/usr/bin/docker compose up --remove-orphans
ExecStop=/usr/bin/docker compose down

# 再起動設定
Restart=always
RestartSec=10

# タイムアウト設定
TimeoutStartSec=120
TimeoutStopSec=30

[Install]
WantedBy=graphical.target
EOF
    
    # サービスの有効化
    systemctl daemon-reload
    systemctl enable face-comm.service
    
    print_status "自動起動サービスを設定しました"
}

# 定期リブートの設定
setup_scheduled_reboot() {
    print_header "定期リブートを設定しています..."
    
    # cron設定
    CRON_FILE="/etc/cron.d/face-comm-reboot"
    
    cat > $CRON_FILE << 'EOF'
# 顔ジェスチャーコミュニケーションシステム - 定期リブート
# 毎日深夜0時にリブート
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# リブート前にDockerコンテナを停止
55 23 * * * root /usr/bin/docker compose -f /opt/face-comm/docker-compose.yml down 2>/dev/null || true

# 深夜0時にリブート
0 0 * * * root /sbin/shutdown -r now "Scheduled daily reboot for system maintenance"
EOF
    
    chmod 644 $CRON_FILE
    
    print_status "毎日深夜0時に自動リブートが設定されました"
}

# Dockerイメージのビルド
build_docker_image() {
    print_header "Dockerイメージをビルドしています..."
    print_warning "これには数分かかる場合があります..."
    
    cd /opt/face-comm
    docker compose build
    
    print_status "Dockerイメージをビルドしました"
}

# 動作確認
verify_installation() {
    print_header "インストールを確認しています..."
    
    # カメラチェック
    if [ -e /dev/video0 ]; then
        print_status "カメラを検出しました: /dev/video0"
    else
        print_warning "カメラが検出されませんでした。USBカメラを接続してください。"
    fi
    
    # Dockerチェック
    if docker --version &> /dev/null; then
        print_status "Docker: $(docker --version)"
    else
        print_error "Dockerのインストールに失敗しました"
    fi
    
    # イメージチェック
    if docker images | grep -q "face-comm"; then
        print_status "Dockerイメージ: face-comm"
    else
        print_warning "Dockerイメージがビルドされていません"
    fi
}

# メイン処理
main() {
    print_header "顔ジェスチャーコミュニケーションシステム インストーラー"
    
    check_root
    check_raspberry_pi
    install_docker
    setup_project
    setup_x11
    create_systemd_service
    setup_scheduled_reboot
    build_docker_image
    verify_installation
    
    print_header "インストールが完了しました！"
    
    echo ""
    echo "使用方法:"
    echo "  システム起動:     sudo systemctl start face-comm"
    echo "  システム停止:     sudo systemctl stop face-comm"
    echo "  ログ確認:         sudo journalctl -u face-comm -f"
    echo "  デバッグモード:   cd /opt/face-comm && docker compose --profile debug up"
    echo ""
    echo "設定ファイル:"
    echo "  /opt/face-comm/config/settings.yaml    - 全般設定"
    echo "  /opt/face-comm/config/thresholds.yaml  - 感度調整"
    echo "  /opt/face-comm/config/phrases.yaml     - 定型文"
    echo ""
    echo -e "${YELLOW}システムを再起動して設定を反映してください:${NC}"
    echo "  sudo reboot"
    echo ""
}

main "$@"
