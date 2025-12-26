# CLAUDE.md - 顔ジェスチャーコミュニケーションシステム

## プロジェクト概要

体が不自由で話すことができない方が、顔の動き（まばたき、眉の上下、口の開閉、頭の傾き）を使ってコミュニケーションを取るためのシステムを開発する。

### 対象ユーザー
- 病院に入院中の患者
- 体の動きが制限されているが、顔の動きは可能
- 画面を見ることはできるが、手での操作は不可
- 頭の回転は難しいが、傾きは可能

### 使用環境
- 病院のベッド上
- WiFi環境あり
- 耳元スピーカーで音声出力（周囲への読み上げは不要）

## ハードウェア構成

| 機器 | 詳細 | 状態 |
|------|------|------|
| Raspberry Pi 4 | 4GB RAM | 所有済み |
| USBカメラ | - | 所有済み |
| モニター | - | 所有済み |
| スピーカー | 耳元用 | 要購入 |
| カメラスタンド/アーム | ベッド取り付け用 | 要購入 |

## 技術スタック

- **OS**: Raspberry Pi OS (64-bit推奨)
- **言語**: Python 3.9+
- **顔認識**: MediaPipe Face Mesh
- **画像処理**: OpenCV
- **GUI**: PyQt5 または Tkinter
- **音声合成**: pyttsx3 (オフライン) / gTTS (オンライン)
- **Audible制御**: Selenium + ChromeDriver または pyautogui

## ジェスチャー定義

| ジェスチャー | アクション | 検出方法 |
|-------------|-----------|---------|
| 2回連続まばたき | 「はい」/ 決定 | Eye Aspect Ratio (EAR) < 0.2 が0.8秒以内に2回 |
| 長めに目を閉じる（1秒以上） | 「いいえ」/ キャンセル | EAR < 0.2 が連続10フレーム以上 |
| 眉を上げる | メニュー表示 / モード切替 | 眉と額の相対位置変化 |
| 口を開ける | 選択確定 | Mouth Aspect Ratio > 0.3 |
| 頭を左に傾ける | 前の項目 / 戻る | 傾き角度 < -15度 |
| 頭を右に傾ける | 次の項目 / 進む | 傾き角度 > 15度 |

## システムモード

```
[待機モード] - 常時顔を監視、眉上げでメニュー表示
    ↓ 眉を上げる
[メインメニュー]
    ├── [1] はい/いいえモード
    │     └── 質問に対して2回まばたき=はい、長閉じ=いいえ
    ├── [2] 定型文モード
    │     ├── 「水が欲しい」
    │     ├── 「トイレに行きたい」
    │     ├── 「痛い」
    │     ├── 「暑い」
    │     ├── 「寒い」
    │     ├── 「看護師を呼んで」
    │     └── （カスタマイズ可能）
    └── [3] Audibleモード
          ├── 再生/停止（口を開ける）
          ├── 30秒戻る（頭を左に傾ける）
          ├── 30秒進む（頭を右に傾ける）
          └── 終了（眉を上げる）
```

## Docker化による運用

### メリット
- **環境の再現性**: どのRaspberry Piでも同じ環境を構築可能
- **自動復旧**: コンテナがクラッシュしても自動再起動
- **簡単インストール**: `./install.sh` で一発セットアップ
- **定期リブート**: 毎日深夜0時に自動リブート

### 運用の流れ
1. インストール: `sudo ./install.sh`
2. 再起動: `sudo reboot`
3. 以降は自動運用（手動操作不要）

## プロジェクト構造

```
face_comm/
├── CLAUDE.md              # このファイル
├── README.md              # プロジェクト説明
├── pyproject.toml         # Python依存関係（uv管理）
├── config/
│   ├── settings.yaml      # 全般設定
│   ├── phrases.yaml       # 定型文リスト
│   ├── thresholds.yaml    # ジェスチャー検出閾値
│   └── melodies.yaml      # メロディ設定
├── src/
│   ├── __init__.py
│   ├── gesture_detector.py    # 顔ジェスチャー検出
│   └── web/                   # Webアプリケーション
│       ├── __init__.py
│       ├── app.py             # FastAPIメイン
│       ├── websocket_handler.py  # WebSocket処理
│       └── frame_processor.py    # Base64デコード
├── static/                    # フロントエンド
│   ├── index.html             # メインHTML
│   ├── css/
│   │   └── main.css
│   └── js/
│       ├── app.js             # メインアプリ
│       ├── camera.js          # カメラ制御
│       ├── websocket.js       # WebSocket管理
│       └── ui.js              # UI更新
└── tests/
    ├── test_gesture.py        # ジェスチャー検出テスト
    └── test_calibration.py    # キャリブレーションテスト
```

## 開発フェーズ

### Phase 1: 基礎 ✅ 完了
- [x] 要件定義
- [x] ジェスチャー定義
- [x] 基本的な顔認識コード作成
- [x] 設定ファイル（YAML）の実装

### Phase 2: コア機能 ✅ 完了
- [x] GestureDetectorクラスの完成
- [x] ジェスチャー検出閾値チューニング
- [x] WebSocket通信基盤

### Phase 3: 機能実装 ✅ 完了
- [x] Webアプリ基盤（FastAPI + WebSocket）
- [x] Yes/Noモード
- [x] 自由入力モード（50音選択）
- [x] 定型文モード + 音声合成（Web Speech API）
- [x] メロディ選択モード

### Phase 4: 改善・最適化（現在）
- [ ] Raspberry Pi環境での動作確認
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化
- [ ] メロディ音声ファイルの追加
- [ ] ユーザーテスト・フィードバック反映

## 開発時の注意事項

### コーディング規約
- Python PEP8準拠
- 日本語コメント推奨（ユーザーが日本語話者のため）
- Type hintsを使用
- docstringはGoogle形式

### Raspberry Pi固有の考慮事項
- MediaPipeは計算負荷が高いため、フレームレートは15-30FPSを目標
- メモリ使用量を監視（4GB制限）
- 長時間稼働を想定したリソース管理
- カメラのウォームアップ時間を考慮

### GUI設計方針
- 大きく見やすいUI（病院ベッドからの視認性）
- ハイコントラスト配色
- 現在選択中の項目を明確に表示
- フィードバック（ジェスチャー認識時の視覚/音声）

### テスト方針
- 各ジェスチャーの検出精度テスト
- 誤検知率の測定
- 長時間稼働テスト
- 異なる照明条件でのテスト

## 既存コード

`src/gesture_detector.py` に基本的な顔ジェスチャー検出コードが実装済み。
主な機能：
- MediaPipe Face Meshを使用した顔ランドマーク検出
- Eye Aspect Ratio (EAR) によるまばたき検出
- 口の開閉検出
- 眉の位置検出
- 頭の傾き検出
- 2回連続まばたき、長閉じの検出

## 開発環境

- **パッケージ管理**: uv（pip ではなく `uv add` / `uv run` を使用）
- **カメラ**: Mac本体カメラ（device_id: 1）

### 起動コマンド
```bash
# デバッグモードで起動
uv run face-comm-debug --debug --camera 1
```

## 作業履歴

### 2024年12月26日 - ジェスチャー検出チューニング

#### 完了した作業

1. **環境構築**
   - `pyproject.toml` で依存関係を管理
   - MediaPipe バージョンを `>=0.10.0,<0.10.15` に固定（API互換性のため）
   - MediaPipe API修正: `face_landmarks` → `multi_face_landmarks[0]`

2. **設定ファイル作成**
   - `config/settings.yaml` - カメラ設定、GUI設定、音声設定など
   - `config/thresholds.yaml` - ジェスチャー検出閾値
   - `config/phrases.yaml` - 定型文リスト

3. **ジェスチャー検出の実装・調整**

   **頭の傾き検出:**
   - 角度体系: 正面 = ±180度付近
   - CENTER: 173〜180度 または -180〜-173度（不感帯±7度）
   - LEFT: -173〜0度（負の値で不感帯外）
   - RIGHT: 0〜173度（正の値で不感帯外）
   - `confirm_frames: 10` で確定（チャタリング防止）

   **眉の検出:**
   - 移動平均ベースラインからの相対変化で判定
   - `raise_threshold: 0.005`（ベースラインからの上昇量）
   - 頭が大きく傾いている時は眉検出を無効化（誤検出防止）
   - 頭の角度が160〜180度の範囲内で眉検出が有効

   **ダブルまばたき検出:**
   - 閉→開のエッジ検出方式
   - 0.8秒以内に2回のまばたきで検出
   - クールダウン中は新しいカウントを開始しない

   **口の開閉:**
   - Mouth Aspect Ratio > 0.30 で検出
   - `confirm_frames: 5` で確定

4. **ジェスチャー再検出ロジック**
   - `gesture_confirmed` フラグを追加
   - 一度ジェスチャーが確定したら、定常状態に戻るまで再検出しない
     - 口: 閉じたらリセット
     - 眉: 下げたらリセット
     - 頭の傾き: CENTERに戻ったらリセット
   - クールダウン時間: 1.0秒

#### 現在の閾値設定 (`config/thresholds.yaml`)
```yaml
eye:
  aspect_ratio_threshold: 0.20
  min_blink_frames: 2
  double_blink_interval: 0.8
  long_close_frames: 30

mouth:
  aspect_ratio_threshold: 0.30
  confirm_frames: 5

eyebrow:
  raise_threshold: 0.005
  confirm_frames: 5

head_tilt:
  angle_threshold: 20.0
  deadzone: 7.0
  confirm_frames: 10

gesture:
  cooldown: 1.0
```

### 2024年12月26日 - Webアプリ実装

#### 完了した作業

1. **Webアプリ基盤構築**
   - FastAPI + WebSocketによるリアルタイム通信
   - ブラウザのカメラ映像をBase64でサーバーに送信
   - サーバー側でMediaPipe Face Meshによるジェスチャー検出
   - 検出結果をWebSocketでクライアントに返信

2. **4つのモード実装**

   **Yes/Noモード:**
   - 頭の傾き（左/右）で「はい」「いいえ」を選択
   - 口を開けて決定
   - 回答履歴の表示

   **自由入力モード:**
   - 50音表による文字選択
   - 頭の傾き: 行の切り替え（あ行→か行→...）
   - 眉上げ: 次の文字
   - ダブルまばたき: 前の文字
   - 口開け: 文字決定
   - 操作行: 読上げ、クリア、削除、空白、確定
   - Web Speech APIによる読み上げ

   **定型文モード:**
   - カテゴリ・フレーズ選択
   - 眉上げ/まばたきで項目選択
   - 口開けで読み上げ

   **メロディモード:**
   - メロディ選択・再生/停止
   - 頭傾き/眉上げ/まばたきで選択
   - 口開けで再生/停止トグル

3. **バグ修正・調整**
   - numpy.bool_ → Python bool変換（JSON直列化エラー対応）
   - 頭の傾き方向の左右入れ替え（カメラミラー対応）
   - デバッグ用に検出値（EAR、MAR、眉位置、角度）を表示

#### ファイル構成

```
face_comm/
├── src/web/
│   ├── __init__.py
│   ├── app.py                 # FastAPIメイン
│   ├── websocket_handler.py   # WebSocket処理
│   └── frame_processor.py     # Base64デコード
├── static/
│   ├── index.html             # メインHTML
│   ├── css/
│   │   └── main.css
│   └── js/
│       ├── app.js             # メインアプリ
│       ├── camera.js          # カメラ制御
│       ├── websocket.js       # WebSocket管理
│       └── ui.js              # UI更新
└── config/
    └── melodies.yaml          # メロディ設定
```

#### 起動コマンド
```bash
uv run uvicorn src.web.app:app --reload --host 0.0.0.0 --port 8000
# または
uv run face-comm-web
# ブラウザで http://localhost:8000 にアクセス
```

#### ジェスチャー操作一覧

| ジェスチャー | 操作 |
|------------|------|
| HEAD_TILT_LEFT | 次の項目（ユーザー視点で右傾き） |
| HEAD_TILT_RIGHT | 前の項目（ユーザー視点で左傾き） |
| EYEBROWS_RAISED | 次の項目 |
| DOUBLE_BLINK | 前の項目 |
| MOUTH_OPEN | 決定/確定/再生・停止 |

#### 次のタスク
1. Raspberry Pi環境での動作確認
2. メロディ音声ファイルの追加
3. パフォーマンス最適化
4. エラーハンドリング強化

## コマンドリファレンス

### Docker運用（推奨）
```bash
# インストール
sudo ./install.sh

# サービス操作
sudo systemctl start face-comm    # 開始
sudo systemctl stop face-comm     # 停止
sudo systemctl restart face-comm  # 再起動
sudo systemctl status face-comm   # 状態確認

# ログ確認
sudo journalctl -u face-comm -f

# デバッグモード
cd /opt/face-comm
sudo docker compose --profile debug up
```

### 非Docker運用（開発用）
```bash
# 環境セットアップ
./setup.sh

# アプリケーション起動
python src/main.py

# テスト実行
python -m pytest tests/

# ジェスチャー検出テスト（デバッグモード）
python src/gesture_detector.py --debug
```

## 参考リンク

- [MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh.html)
- [OpenCV Python](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)
- [PyQt5 Documentation](https://www.riverbankcomputing.com/static/Docs/PyQt5/)
- [pyttsx3](https://pyttsx3.readthedocs.io/)
