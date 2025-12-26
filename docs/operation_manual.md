# 運用マニュアル

このドキュメントは、顔ジェスチャーコミュニケーションシステムの運用担当者向けです。

## システム概要

```
┌─────────────────────────────────────────────────────────┐
│                    Raspberry Pi 4                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Docker コンテナ                      │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │    顔ジェスチャーコミュニケーション        │   │   │
│  │  │    アプリケーション                        │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [USB カメラ] ←→ [アプリ] ←→ [モニター]                 │
│                      ↓                                   │
│               [スピーカー]                                │
└─────────────────────────────────────────────────────────┘
```

## 自動化されていること

| 項目 | 説明 |
|------|------|
| 自動起動 | Raspberry Pi起動時にシステムが自動的に立ち上がる |
| 自動復旧 | アプリがクラッシュしても自動的に再起動する |
| 定期リブート | 毎日深夜0時にRaspberry Piが自動リブートする |
| ログ管理 | ログファイルは自動でローテーションされる |

## 日常の運用

### 正常時

**何もする必要はありません。**

- システムは自動で起動・運用されます
- 毎日深夜0時に自動リブートされ、翌朝にはクリーンな状態で再起動します

### 設定変更時

#### 定型文の追加・変更

1. 設定ファイルを開く
```bash
sudo nano /opt/face-comm/config/phrases.yaml
```

2. 定型文を追加（例）
```yaml
      - id: "new_phrase"
        text: "追加したいメッセージ"
        short: "短縮名"
```

3. システムを再起動
```bash
sudo systemctl restart face-comm
```

#### 感度の調整

1. 設定ファイルを開く
```bash
sudo nano /opt/face-comm/config/thresholds.yaml
```

2. 値を調整（数値を小さくすると感度が上がる）
```yaml
eye:
  aspect_ratio_threshold: 0.20  # まばたき検出感度
mouth:
  aspect_ratio_threshold: 0.30  # 口の開閉検出感度
```

3. システムを再起動
```bash
sudo systemctl restart face-comm
```

## トラブルシューティング

### 症状別対処法

#### 画面が真っ暗 / アプリが起動しない

```bash
# 1. サービスの状態確認
sudo systemctl status face-comm

# 2. 手動で再起動
sudo systemctl restart face-comm

# 3. それでもダメなら本体を再起動
sudo reboot
```

#### カメラが認識されない

```bash
# 1. カメラの接続確認
ls /dev/video*

# 2. USBカメラを抜き差し

# 3. システム再起動
sudo reboot
```

#### 音声が出ない

```bash
# 1. スピーカーの接続確認
# 2. 音量確認
alsamixer

# 3. テスト音声
espeak-ng "テスト" -v ja
```

#### ジェスチャーが認識されない

1. **照明を確認** - 明るすぎ/暗すぎないか
2. **カメラ位置を確認** - 顔全体が映っているか
3. **感度を調整** - `thresholds.yaml`の値を変更

### ログの確認

```bash
# リアルタイムログ
sudo journalctl -u face-comm -f

# 過去のログ
sudo journalctl -u face-comm --since "1 hour ago"

# アプリケーションログ
cat /opt/face-comm/logs/app.log
```

### 完全リセット

問題が解決しない場合の最終手段：

```bash
# 1. サービス停止
sudo systemctl stop face-comm

# 2. Dockerコンテナとイメージを削除
cd /opt/face-comm
sudo docker compose down
sudo docker rmi face-comm:latest

# 3. 再ビルド
sudo docker compose build

# 4. サービス開始
sudo systemctl start face-comm
```

## 定期メンテナンス

### 週1回推奨

- ログファイルの確認
- システムの動作確認

### 月1回推奨

```bash
# システムのアップデート
sudo apt update && sudo apt upgrade -y

# Dockerイメージの再ビルド（最新のセキュリティパッチ適用）
cd /opt/face-comm
sudo docker compose build --no-cache
sudo systemctl restart face-comm
```

## 緊急連絡先

問題が解決しない場合は、以下に連絡してください：

- [サポート担当者の連絡先を記入]
- [バックアップ連絡先を記入]

## コマンドリファレンス

| 操作 | コマンド |
|------|----------|
| サービス開始 | `sudo systemctl start face-comm` |
| サービス停止 | `sudo systemctl stop face-comm` |
| サービス再起動 | `sudo systemctl restart face-comm` |
| 状態確認 | `sudo systemctl status face-comm` |
| ログ確認 | `sudo journalctl -u face-comm -f` |
| 手動リブート | `sudo reboot` |
| デバッグモード | `cd /opt/face-comm && sudo docker compose --profile debug up` |
