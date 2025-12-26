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
face_comm_project/
├── CLAUDE.md           # このファイル
├── README.md           # プロジェクト説明
├── Dockerfile          # Dockerイメージ定義
├── docker-compose.yml  # コンテナ設定
├── install.sh          # ワンクリックインストーラー
├── uninstall.sh        # アンインストーラー
├── requirements.txt    # Python依存関係
├── setup.sh           # 環境セットアップスクリプト（非Docker用）
├── config/
│   ├── settings.yaml   # 全般設定
│   ├── phrases.yaml    # 定型文リスト
│   └── thresholds.yaml # ジェスチャー検出閾値
├── src/
│   ├── __init__.py
│   ├── main.py         # メインエントリーポイント
│   ├── gesture_detector.py  # 顔ジェスチャー検出
│   ├── ui/
│   │   ├── __init__.py
│   │   ├── main_window.py   # メインGUI
│   │   ├── menu_screen.py   # メニュー画面
│   │   └── audible_screen.py # Audible操作画面
│   ├── audio/
│   │   ├── __init__.py
│   │   └── speech.py        # 音声合成
│   ├── controllers/
│   │   ├── __init__.py
│   │   ├── audible_controller.py  # Audible制御
│   │   └── system_controller.py   # システム制御
│   └── utils/
│       ├── __init__.py
│       ├── config_loader.py  # 設定読み込み
│       └── logger.py         # ログ出力
├── tests/
│   ├── test_gesture.py       # ジェスチャー検出テスト
│   └── test_calibration.py   # キャリブレーションテスト
└── docs/
    ├── setup_guide.md        # セットアップガイド
    ├── user_manual.md        # 使用マニュアル
    ├── operation_manual.md   # 運用マニュアル（サポート担当者向け）
    └── cost_estimate.md      # 必要機材と費用概算
```

## 開発フェーズ

### Phase 1: 基礎（現在）✅ 部分完了
- [x] 要件定義
- [x] ジェスチャー定義
- [x] 基本的な顔認識コード作成
- [ ] Raspberry Pi環境セットアップ
- [ ] 動作確認・閾値調整

### Phase 2: コア機能
- [ ] GestureDetectorクラスの完成
- [ ] 設定ファイル（YAML）の実装
- [ ] キャリブレーション機能
- [ ] 基本GUI（メニュー画面）

### Phase 3: 機能実装
- [ ] はい/いいえモード
- [ ] 定型文モード + 音声合成
- [ ] Audible制御機能

### Phase 4: 改善・最適化
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化
- [ ] ユーザーテスト・フィードバック反映
- [ ] ドキュメント整備

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

#### 次のタスク
1. GUI実装開始（PyQt5 または Tkinter）
2. はい/いいえモードの実装
3. 定型文モード + 音声合成
4. Audible制御機能
5. Raspberry Pi環境での動作確認

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
