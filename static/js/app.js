/**
 * メインアプリケーション
 *
 * 全体の初期化とジェスチャー処理を統括
 */

class FaceCommApp {
    constructor() {
        this.camera = new CameraController();
        this.websocket = new GestureWebSocket();
        this.ui = new UIController();

        // 現在のモード
        this.currentMode = 'yesno';

        // 設定データ
        this.config = {
            phrases: [],
            melodies: []
        };

        // 定型文モードの状態
        this.phraseState = {
            categoryIndex: 0,
            phraseIndex: 0
        };

        // メロディモードの状態
        this.melodyState = {
            selectedIndex: 0,
            isPlaying: false,
            audio: null
        };

        // Yes/Noモードの状態
        this.yesnoState = {
            question: null,
            isWaiting: false,
            selectedOption: null  // 'yes' or 'no'
        };

        // 自由入力モードの状態
        this.freetextState = {
            inputText: '',
            rowIndex: 0,
            charIndex: 0,
            // 50音表（行ごと）
            charRows: [
                { name: '操作', chars: ['📢読上', '🗑クリア', '␡削除', '　空白', '↩確定'] },
                { name: 'あ行', chars: ['あ', 'い', 'う', 'え', 'お'] },
                { name: 'か行', chars: ['か', 'き', 'く', 'け', 'こ'] },
                { name: 'さ行', chars: ['さ', 'し', 'す', 'せ', 'そ'] },
                { name: 'た行', chars: ['た', 'ち', 'つ', 'て', 'と'] },
                { name: 'な行', chars: ['な', 'に', 'ぬ', 'ね', 'の'] },
                { name: 'は行', chars: ['は', 'ひ', 'ふ', 'へ', 'ほ'] },
                { name: 'ま行', chars: ['ま', 'み', 'む', 'め', 'も'] },
                { name: 'や行', chars: ['や', '（', 'ゆ', '）', 'よ'] },
                { name: 'ら行', chars: ['ら', 'り', 'る', 'れ', 'ろ'] },
                { name: 'わ行', chars: ['わ', 'を', 'ん', 'ー', '。'] },
                { name: '濁音', chars: ['が', 'ぎ', 'ぐ', 'げ', 'ご'] },
                { name: '濁音2', chars: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'] },
                { name: '濁音3', chars: ['だ', 'ぢ', 'づ', 'で', 'ど'] },
                { name: '濁音4', chars: ['ば', 'び', 'ぶ', 'べ', 'ぼ'] },
                { name: '半濁音', chars: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'] },
                { name: '小文字', chars: ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'] },
                { name: '小文字2', chars: ['っ', 'ゃ', 'ゅ', 'ょ', 'ー'] },
                { name: '記号', chars: ['、', '！', '？', '…', '〜'] },
            ]
        };
    }

    /**
     * アプリケーションを初期化
     */
    async init() {
        try {
            // 設定を読み込み
            await this._loadConfig();

            // カメラを初期化
            await this.camera.init('camera-preview', 'capture-canvas');

            // WebSocketコールバックを設定
            this._setupWebSocketCallbacks();

            // UIイベントを設定
            this._setupUIEvents();

            // WebSocket接続
            this.websocket.connect();

            // カメラを開始
            await this.camera.start();

            // フレーム送信を設定
            this.camera.onFrame = (frameData) => {
                this.websocket.sendFrame(frameData);
            };

            console.log('FaceComm App initialized');
            this.ui.showNotification('アプリを起動しました');

        } catch (error) {
            console.error('初期化エラー:', error);
            this.ui.showNotification('初期化に失敗しました: ' + error.message);
        }
    }

    /**
     * 設定を読み込み
     */
    async _loadConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                this.config = await response.json();
                this._initializeModes();
            }
        } catch (error) {
            console.error('設定読み込みエラー:', error);
        }
    }

    /**
     * モードを初期化
     */
    _initializeModes() {
        // 定型文モードを初期化
        if (this.config.phrases.length > 0) {
            const category = this.config.phrases[0];
            this.ui.setCategory(category.name);
            // phraseオブジェクトからtext値を抽出
            const phraseTexts = category.phrases.map(p => p.text || p);
            this.ui.updatePhraseList(phraseTexts, 0);
        }

        // メロディモードを初期化
        if (this.config.melodies.length > 0) {
            this.ui.updateMelodyList(this.config.melodies, 0);
        }

        // 自由入力モードを初期化
        this._initFreetextMode();
    }

    /**
     * WebSocketコールバックを設定
     */
    _setupWebSocketCallbacks() {
        this.websocket.onConnect = () => {
            this.ui.updateConnectionStatus(true);
            this.ui.showNotification('サーバーに接続しました');
        };

        this.websocket.onDisconnect = () => {
            this.ui.updateConnectionStatus(false);
            this.ui.showNotification('接続が切断されました');
        };

        this.websocket.onFaceState = (state) => {
            this.ui.updateFaceState(state);
        };

        this.websocket.onGesture = (gesture) => {
            this._handleGesture(gesture);
        };

        this.websocket.onError = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    /**
     * UIイベントを設定
     */
    _setupUIEvents() {
        // モード切り替え
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentMode = tab.dataset.mode;
            });
        });

        // Yes/Noモード：質問入力
        const askButton = document.getElementById('ask-button');
        const questionInput = document.getElementById('question-input');

        if (askButton && questionInput) {
            askButton.addEventListener('click', () => {
                const question = questionInput.value.trim();
                if (question) {
                    this._askQuestion(question);
                    questionInput.value = '';
                }
            });

            questionInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const question = questionInput.value.trim();
                    if (question) {
                        this._askQuestion(question);
                        questionInput.value = '';
                    }
                }
            });
        }

        // 自由入力モード：ボタンイベント
        const speakTextBtn = document.getElementById('speak-text-btn');
        const clearTextBtn = document.getElementById('clear-text-btn');

        if (speakTextBtn) {
            speakTextBtn.addEventListener('click', () => {
                if (this.freetextState.inputText) {
                    this._speak(this.freetextState.inputText);
                }
            });
        }

        if (clearTextBtn) {
            clearTextBtn.addEventListener('click', () => {
                this.freetextState.inputText = '';
                this._updateFreetextDisplay();
            });
        }
    }

    /**
     * 質問を設定
     */
    _askQuestion(question) {
        this.yesnoState.question = question;
        this.yesnoState.isWaiting = true;
        this.ui.setQuestion(question);
        this.ui.showNotification('回答を待っています...');
    }

    /**
     * ジェスチャーを処理
     */
    _handleGesture(gesture) {
        this.ui.showGesture(gesture);

        switch (this.currentMode) {
            case 'yesno':
                this._handleYesNoGesture(gesture);
                break;
            case 'freetext':
                this._handleFreetextGesture(gesture);
                break;
            case 'phrase':
                this._handlePhraseGesture(gesture);
                break;
            case 'melody':
                this._handleMelodyGesture(gesture);
                break;
        }
    }

    /**
     * Yes/Noモードのジェスチャー処理
     * 右傾き=はい選択（画面上は左に見える）、左傾き=いいえ選択（画面上は右に見える）、口開け=決定
     */
    _handleYesNoGesture(gesture) {
        if (!this.yesnoState.isWaiting) return;

        switch (gesture.type) {
            case 'HEAD_TILT_RIGHT':
                // はいを選択（ユーザーから見て左に傾ける）
                this.yesnoState.selectedOption = 'yes';
                this.ui.highlightYesNo('yes');
                break;

            case 'HEAD_TILT_LEFT':
                // いいえを選択（ユーザーから見て右に傾ける）
                this.yesnoState.selectedOption = 'no';
                this.ui.highlightYesNo('no');
                break;

            case 'MOUTH_OPEN':
                // 決定
                if (this.yesnoState.selectedOption) {
                    const answer = this.yesnoState.selectedOption === 'yes' ? 'はい' : 'いいえ';
                    this._speak(answer);
                    this.ui.addToHistory(this.yesnoState.question, answer);
                    this.yesnoState.isWaiting = false;
                    this.yesnoState.selectedOption = null;
                    setTimeout(() => this.ui.highlightYesNo(null), 1000);
                }
                break;
        }
    }

    /**
     * 定型文モードのジェスチャー処理
     */
    _handlePhraseGesture(gesture) {
        if (this.config.phrases.length === 0) return;

        const category = this.config.phrases[this.phraseState.categoryIndex];
        const phrases = category.phrases;

        switch (gesture.type) {
            case 'HEAD_TILT_RIGHT':
                // 前のカテゴリ（ユーザーから見て左に傾ける）
                this.phraseState.categoryIndex =
                    (this.phraseState.categoryIndex - 1 + this.config.phrases.length) % this.config.phrases.length;
                this.phraseState.phraseIndex = 0;
                this._updatePhraseDisplay();
                break;

            case 'HEAD_TILT_LEFT':
                // 次のカテゴリ（ユーザーから見て右に傾ける）
                this.phraseState.categoryIndex =
                    (this.phraseState.categoryIndex + 1) % this.config.phrases.length;
                this.phraseState.phraseIndex = 0;
                this._updatePhraseDisplay();
                break;

            case 'DOUBLE_BLINK':
                // 前の定型文
                this.phraseState.phraseIndex =
                    (this.phraseState.phraseIndex - 1 + phrases.length) % phrases.length;
                this._updatePhraseDisplay();
                break;

            case 'EYEBROWS_RAISED':
                // 次の定型文
                this.phraseState.phraseIndex =
                    (this.phraseState.phraseIndex + 1) % phrases.length;
                this._updatePhraseDisplay();
                break;

            case 'MOUTH_OPEN':
                // 選択決定
                const phraseObj = phrases[this.phraseState.phraseIndex];
                const selectedText = phraseObj.text || phraseObj;
                this._speak(selectedText);
                this.ui.showNotification(`「${selectedText}」を選択しました`);
                break;
        }
    }

    /**
     * 定型文表示を更新
     */
    _updatePhraseDisplay() {
        const category = this.config.phrases[this.phraseState.categoryIndex];
        this.ui.setCategory(category.name);
        // phraseオブジェクトからtext値を抽出
        const phraseTexts = category.phrases.map(p => p.text || p);
        this.ui.updatePhraseList(phraseTexts, this.phraseState.phraseIndex);
    }

    /**
     * メロディモードのジェスチャー処理
     * 頭傾き/眉上げ/ダブルまばたき: 選択、口開け: 再生/停止
     */
    _handleMelodyGesture(gesture) {
        if (this.config.melodies.length === 0) return;

        switch (gesture.type) {
            case 'HEAD_TILT_RIGHT':
            case 'DOUBLE_BLINK':
                // 前のメロディ（ユーザーから見て左に傾ける or ダブルまばたき）
                this.melodyState.selectedIndex =
                    (this.melodyState.selectedIndex - 1 + this.config.melodies.length) % this.config.melodies.length;
                this.ui.updateMelodyList(this.config.melodies, this.melodyState.selectedIndex);
                break;

            case 'HEAD_TILT_LEFT':
            case 'EYEBROWS_RAISED':
                // 次のメロディ（ユーザーから見て右に傾ける or 眉上げ）
                this.melodyState.selectedIndex =
                    (this.melodyState.selectedIndex + 1) % this.config.melodies.length;
                this.ui.updateMelodyList(this.config.melodies, this.melodyState.selectedIndex);
                break;

            case 'MOUTH_OPEN':
                // 再生/停止
                this._toggleMelody();
                break;
        }
    }

    /**
     * メロディの再生/停止を切り替え
     */
    _toggleMelody() {
        if (this.melodyState.isPlaying) {
            // 停止
            if (this.melodyState.audio) {
                this.melodyState.audio.pause();
                this.melodyState.audio.currentTime = 0;
            }
            this.melodyState.isPlaying = false;
            this.ui.updatePlayerStatus(false);
        } else {
            // 再生
            const melody = this.config.melodies[this.melodyState.selectedIndex];
            if (melody && melody.file) {
                this.melodyState.audio = new Audio(`/static/audio/${melody.file}`);
                this.melodyState.audio.play().catch(error => {
                    console.error('再生エラー:', error);
                    this.ui.showNotification('メロディの再生に失敗しました');
                });
                this.melodyState.audio.onended = () => {
                    this.melodyState.isPlaying = false;
                    this.ui.updatePlayerStatus(false);
                };
                this.melodyState.isPlaying = true;
                this.ui.updatePlayerStatus(true, melody.name);
            }
        }
    }

    /**
     * 自由入力モードを初期化
     */
    _initFreetextMode() {
        this._updateFreetextDisplay();
    }

    /**
     * 自由入力モードのジェスチャー処理
     * 左右傾き: 行切替、眉上げ: 次の文字、口開け: 決定
     */
    _handleFreetextGesture(gesture) {
        const state = this.freetextState;
        const rows = state.charRows;
        const currentRow = rows[state.rowIndex];

        switch (gesture.type) {
            case 'HEAD_TILT_RIGHT':
                // 前の行（ユーザーから見て左に傾ける）
                state.rowIndex = (state.rowIndex - 1 + rows.length) % rows.length;
                state.charIndex = 0;
                this._updateFreetextDisplay();
                break;

            case 'HEAD_TILT_LEFT':
                // 次の行（ユーザーから見て右に傾ける）
                state.rowIndex = (state.rowIndex + 1) % rows.length;
                state.charIndex = 0;
                this._updateFreetextDisplay();
                break;

            case 'EYEBROWS_RAISED':
                // 次の文字
                state.charIndex = (state.charIndex + 1) % currentRow.chars.length;
                this._updateFreetextDisplay();
                break;

            case 'DOUBLE_BLINK':
                // 前の文字
                state.charIndex = (state.charIndex - 1 + currentRow.chars.length) % currentRow.chars.length;
                this._updateFreetextDisplay();
                break;

            case 'MOUTH_OPEN':
                // 文字を決定
                const selectedChar = currentRow.chars[state.charIndex];

                // 操作コマンドの処理
                if (selectedChar === '📢読上') {
                    // 全文読み上げ
                    if (state.inputText) {
                        this._speak(state.inputText);
                        this.ui.showNotification('読み上げ中...');
                    } else {
                        this.ui.showNotification('入力がありません');
                    }
                } else if (selectedChar === '🗑クリア') {
                    // 全消去
                    state.inputText = '';
                    this.ui.showNotification('クリアしました');
                } else if (selectedChar === '␡削除') {
                    // 1文字削除
                    if (state.inputText.length > 0) {
                        state.inputText = state.inputText.slice(0, -1);
                        this.ui.showNotification('1文字削除');
                    }
                } else if (selectedChar === '　空白') {
                    // スペース
                    state.inputText += ' ';
                    this.ui.showNotification('スペース');
                } else if (selectedChar === '↩確定') {
                    // 確定して読み上げ
                    if (state.inputText) {
                        this._speak(state.inputText);
                        this.ui.showNotification('確定: ' + state.inputText);
                    }
                } else {
                    // 通常の文字
                    state.inputText += selectedChar;
                    this._speak(selectedChar);  // 入力した文字を読み上げ
                }
                this._updateFreetextDisplay();
                break;
        }
    }

    /**
     * 自由入力モードの表示を更新
     */
    _updateFreetextDisplay() {
        const state = this.freetextState;
        const currentRow = state.charRows[state.rowIndex];

        // 入力テキストを更新
        const inputTextEl = document.getElementById('input-text');
        if (inputTextEl) {
            inputTextEl.textContent = state.inputText || '';
        }

        // 現在の行名を更新
        const currentRowEl = document.getElementById('current-row');
        if (currentRowEl) {
            currentRowEl.textContent = currentRow.name;
        }

        // 文字グリッドを更新
        const charGrid = document.getElementById('char-grid');
        if (charGrid) {
            charGrid.innerHTML = '';
            currentRow.chars.forEach((char, index) => {
                const cell = document.createElement('div');
                cell.className = 'char-cell';
                if (index === state.charIndex) {
                    cell.classList.add('selected');
                }
                // 操作コマンドの表示
                if (char.startsWith('📢') || char.startsWith('🗑') || char.startsWith('␡') || char.startsWith('　') || char.startsWith('↩')) {
                    // 操作行のアイテム
                    cell.textContent = char.replace('📢', '').replace('🗑', '').replace('␡', '').replace('↩', '');
                    cell.style.fontSize = '0.7rem';
                    cell.classList.add('action-cell');
                } else {
                    cell.textContent = char;
                }
                charGrid.appendChild(cell);
            });
        }
    }

    /**
     * テキストを読み上げ
     */
    _speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    }

    /**
     * アプリケーションを停止
     */
    stop() {
        this.camera.stop();
        this.websocket.disconnect();
        if (this.melodyState.audio) {
            this.melodyState.audio.pause();
        }
    }
}

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FaceCommApp();
    window.app.init();
});

// ページを離れる際にクリーンアップ
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.stop();
    }
});
