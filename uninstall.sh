#!/bin/bash
# 顔ジェスチャーコミュニケーションシステム
# アンインストールスクリプト
#
# 使用方法:
#   sudo ./uninstall.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# ルート権限チェック
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}このスクリプトはroot権限で実行してください${NC}"
    echo "  sudo ./uninstall.sh"
    exit 1
fi

echo ""
echo "============================================"
echo "顔ジェスチャーコミュニケーションシステム"
echo "アンインストーラー"
echo "============================================"
echo ""

read -p "本当にアンインストールしますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 0
fi

# サービスの停止と無効化
print_status "サービスを停止しています..."
systemctl stop face-comm.service 2>/dev/null || true
systemctl disable face-comm.service 2>/dev/null || true

# Dockerコンテナの停止
print_status "Dockerコンテナを停止しています..."
cd /opt/face-comm 2>/dev/null && docker compose down 2>/dev/null || true

# Dockerイメージの削除
read -p "Dockerイメージも削除しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker rmi face-comm:latest 2>/dev/null || true
    print_status "Dockerイメージを削除しました"
fi

# systemdサービスファイルの削除
rm -f /etc/systemd/system/face-comm.service
systemctl daemon-reload
print_status "systemdサービスを削除しました"

# cronジョブの削除
rm -f /etc/cron.d/face-comm-reboot
print_status "定期リブート設定を削除しました"

# X11自動起動の削除
rm -f /etc/xdg/autostart/face-comm-xhost.desktop

# 設定ファイルの保持確認
read -p "設定ファイル(/opt/face-comm/config)を保持しますか？ (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    rm -rf /opt/face-comm
    print_status "すべてのファイルを削除しました"
else
    # 設定ファイルのバックアップ
    BACKUP_DIR="/home/${SUDO_USER:-$USER}/face-comm-backup-$(date +%Y%m%d)"
    mkdir -p $BACKUP_DIR
    cp -r /opt/face-comm/config $BACKUP_DIR/ 2>/dev/null || true
    rm -rf /opt/face-comm
    print_status "設定ファイルを $BACKUP_DIR にバックアップしました"
fi

echo ""
echo "============================================"
echo "アンインストールが完了しました"
echo "============================================"
echo ""
echo "Dockerを残す場合は、そのまま使用できます"
echo "Dockerも削除する場合: sudo apt remove docker-ce docker-ce-cli"
echo ""
