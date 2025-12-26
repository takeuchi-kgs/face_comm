# 顔ジェスチャーコミュニケーションシステム

体が不自由で話すことができない方が、顔の動きを使ってコミュニケーションを取るためのWebアプリケーションです。

## 特徴

- **顔の動きだけで操作**: まばたき、眉の上下、口の開閉、頭の傾きを認識
- **ブラウザベース**: Webアプリなので特別なソフトのインストール不要
- **音声読み上げ**: 入力したテキストを音声で読み上げ
- **4つのモード**: Yes/No回答、自由文入力、定型文選択、メロディ再生

## 対応ジェスチャー

| ジェスチャー | 動作 |
|-------------|------|
| 眉を上げる | 次の項目 |
| 2回連続まばたき | 前の項目 |
| 頭を左に傾ける | 前のグループ |
| 頭を右に傾ける | 次のグループ |
| 口を開ける | 決定 / 確定 |

## 必要なハードウェア

- Raspberry Pi 4 (4GB以上推奨) または PC
- USBカメラ
- モニター
- スピーカー（読み上げ用）

## クイックスタート

### 1. リポジトリをクローン

```bash
git clone https://github.com/YOUR_USERNAME/face_comm.git
cd face_comm
```

### 2. セットアップスクリプトを実行

```bash
chmod +x setup.sh
./setup.sh
```

これにより以下が自動的に行われます：
- システムパッケージのインストール（Linux/Raspberry Piのみ）
- uv（Pythonパッケージマネージャ）のインストール
- Python依存関係のインストール
- 設定ファイルの確認

### 3. アプリケーションを起動

```bash
uv run face-comm-web
```

### 4. ブラウザでアクセス

```
http://localhost:8000
```

他のデバイス（スマホ、タブレット）からアクセスする場合：
```
http://<Raspberry PiのIPアドレス>:8000
```

## 機能説明

### Yes/Noモード
質問に対して「はい」「いいえ」で回答するモード。
- 頭を左に傾ける → 「はい」を選択
- 頭を右に傾ける → 「いいえ」を選択
- 口を開ける → 決定

### 自由入力モード
50音から文字を選んで自由にテキストを入力するモード。
- 眉上げ / まばたき → 文字を上下に移動
- 頭の傾き → グループ間をジャンプ（あ行→か行→...）
- 口を開ける → 文字を決定

### 定型文モード
よく使うフレーズを選択して読み上げるモード。

### メロディモード
メロディを選択して再生するモード。

## 自動起動設定（Raspberry Pi）

セットアップスクリプト実行後、以下のコマンドで自動起動を設定できます：

```bash
sudo cp face-comm.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable face-comm
sudo systemctl start face-comm
```

サービスの状態確認：
```bash
sudo systemctl status face-comm
```

ログの確認：
```bash
journalctl -u face-comm -f
```

## 設定ファイル

| ファイル | 説明 |
|---------|------|
| `config/thresholds.yaml` | ジェスチャー検出の閾値設定 |
| `config/phrases.yaml` | 定型文リスト |
| `config/melodies.yaml` | メロディ設定 |

## 技術スタック

- **バックエンド**: Python, FastAPI, WebSocket
- **顔認識**: MediaPipe Face Mesh
- **フロントエンド**: HTML, CSS, JavaScript
- **音声合成**: Web Speech API

## ディレクトリ構成

```
face_comm/
├── setup.sh              # セットアップスクリプト
├── pyproject.toml        # Python依存関係
├── config/               # 設定ファイル
│   ├── thresholds.yaml
│   ├── phrases.yaml
│   └── melodies.yaml
├── src/
│   ├── gesture_detector.py   # ジェスチャー検出
│   └── web/                  # Webアプリ
│       ├── app.py
│       ├── websocket_handler.py
│       └── frame_processor.py
└── static/               # フロントエンド
    ├── index.html
    ├── css/
    └── js/
```

## トラブルシューティング

### カメラが認識されない
```bash
# カメラデバイスの確認
ls -la /dev/video*

# Raspberry Piでカメラが無効の場合
sudo raspi-config
# Interface Options → Camera → Enable
```

### ジェスチャーが検出されにくい
- 照明を明るくする
- カメラと顔の距離を50cm〜1m程度に調整
- `config/thresholds.yaml`の閾値を調整

### 音声が出ない
- ブラウザの音声許可を確認
- システムのスピーカー設定を確認

## ライセンス

MIT License

## 貢献

Issues、Pull Requests 大歓迎です。
