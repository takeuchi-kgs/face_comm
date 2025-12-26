# セットアップガイド

Raspberry Pi 4で顔ジェスチャーコミュニケーションシステムをセットアップする手順です。

## 必要なもの

### ハードウェア
- Raspberry Pi 4 (4GB以上推奨)
- microSDカード (32GB以上推奨)
- USBカメラ または Raspberry Pi Camera Module
- モニター (HDMI接続)
- スピーカー (USB または 3.5mm)
- カメラスタンド/アーム (ベッド取り付け用)

### ソフトウェア
- Raspberry Pi OS (64-bit) - Bookworm以降推奨

## セットアップ手順

### 1. Raspberry Pi OSのインストール

1. [Raspberry Pi Imager](https://www.raspberrypi.com/software/) をダウンロード
2. microSDカードにRaspberry Pi OS (64-bit) を書き込む
3. 初期設定（WiFi、SSH等）を行う

### 2. システムのアップデート

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. プロジェクトのセットアップ

```bash
# プロジェクトディレクトリに移動
cd face_comm_project

# セットアップスクリプトを実行
chmod +x setup.sh
./setup.sh
```

### 4. カメラの確認

```bash
# USBカメラの確認
ls /dev/video*

# カメラテスト
libcamera-hello  # Raspberry Pi Camera Moduleの場合
```

### 5. 動作確認

```bash
# 仮想環境をアクティベート
source venv/bin/activate

# ジェスチャー検出テスト
python src/gesture_detector.py --debug
```

## トラブルシューティング

### カメラが認識されない

```bash
# USBデバイスの確認
lsusb

# カメラモジュールの有効化
sudo raspi-config
# -> Interface Options -> Camera -> Enable
```

### MediaPipeが遅い

- フレームレートを下げる: `config/settings.yaml` の `fps` を 15 に変更
- 解像度を下げる: `width: 320`, `height: 240` に変更

### 音声が出ない

```bash
# 音声デバイスの確認
aplay -l

# espeak テスト
espeak -v ja "テスト"
```

## 次のステップ

1. `config/thresholds.yaml` で閾値を調整
2. `config/phrases.yaml` で定型文をカスタマイズ
3. 対象ユーザーに合わせてキャリブレーション
