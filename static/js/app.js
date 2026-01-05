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

        // 自由入力モードの状態（縦1列選択方式）
        this.freetextState = {
            inputText: '',
            selectedIndex: 0,
            // 全文字リスト（グループ情報付き）
            charList: [
                // 操作
                { char: '📢読上', group: '操作', isAction: true },
                { char: '🗑クリア', group: '操作', isAction: true },
                { char: '␡削除', group: '操作', isAction: true },
                { char: '　空白', group: '操作', isAction: true },
                { char: '↩確定', group: '操作', isAction: true },
                // あ行
                { char: 'あ', group: 'あ行' }, { char: 'い', group: 'あ行' }, { char: 'う', group: 'あ行' }, { char: 'え', group: 'あ行' }, { char: 'お', group: 'あ行' },
                // か行
                { char: 'か', group: 'か行' }, { char: 'き', group: 'か行' }, { char: 'く', group: 'か行' }, { char: 'け', group: 'か行' }, { char: 'こ', group: 'か行' },
                // さ行
                { char: 'さ', group: 'さ行' }, { char: 'し', group: 'さ行' }, { char: 'す', group: 'さ行' }, { char: 'せ', group: 'さ行' }, { char: 'そ', group: 'さ行' },
                // た行
                { char: 'た', group: 'た行' }, { char: 'ち', group: 'た行' }, { char: 'つ', group: 'た行' }, { char: 'て', group: 'た行' }, { char: 'と', group: 'た行' },
                // な行
                { char: 'な', group: 'な行' }, { char: 'に', group: 'な行' }, { char: 'ぬ', group: 'な行' }, { char: 'ね', group: 'な行' }, { char: 'の', group: 'な行' },
                // は行
                { char: 'は', group: 'は行' }, { char: 'ひ', group: 'は行' }, { char: 'ふ', group: 'は行' }, { char: 'へ', group: 'は行' }, { char: 'ほ', group: 'は行' },
                // ま行
                { char: 'ま', group: 'ま行' }, { char: 'み', group: 'ま行' }, { char: 'む', group: 'ま行' }, { char: 'め', group: 'ま行' }, { char: 'も', group: 'ま行' },
                // や行
                { char: 'や', group: 'や行' }, { char: 'ゆ', group: 'や行' }, { char: 'よ', group: 'や行' },
                // ら行
                { char: 'ら', group: 'ら行' }, { char: 'り', group: 'ら行' }, { char: 'る', group: 'ら行' }, { char: 'れ', group: 'ら行' }, { char: 'ろ', group: 'ら行' },
                // わ行
                { char: 'わ', group: 'わ行' }, { char: 'を', group: 'わ行' }, { char: 'ん', group: 'わ行' },
                // 濁音
                { char: 'が', group: '濁音' }, { char: 'ぎ', group: '濁音' }, { char: 'ぐ', group: '濁音' }, { char: 'げ', group: '濁音' }, { char: 'ご', group: '濁音' },
                { char: 'ざ', group: '濁音' }, { char: 'じ', group: '濁音' }, { char: 'ず', group: '濁音' }, { char: 'ぜ', group: '濁音' }, { char: 'ぞ', group: '濁音' },
                { char: 'だ', group: '濁音' }, { char: 'ぢ', group: '濁音' }, { char: 'づ', group: '濁音' }, { char: 'で', group: '濁音' }, { char: 'ど', group: '濁音' },
                { char: 'ば', group: '濁音' }, { char: 'び', group: '濁音' }, { char: 'ぶ', group: '濁音' }, { char: 'べ', group: '濁音' }, { char: 'ぼ', group: '濁音' },
                // 半濁音
                { char: 'ぱ', group: '半濁音' }, { char: 'ぴ', group: '半濁音' }, { char: 'ぷ', group: '半濁音' }, { char: 'ぺ', group: '半濁音' }, { char: 'ぽ', group: '半濁音' },
                // 小文字
                { char: 'ぁ', group: '小文字' }, { char: 'ぃ', group: '小文字' }, { char: 'ぅ', group: '小文字' }, { char: 'ぇ', group: '小文字' }, { char: 'ぉ', group: '小文字' },
                { char: 'っ', group: '小文字' }, { char: 'ゃ', group: '小文字' }, { char: 'ゅ', group: '小文字' }, { char: 'ょ', group: '小文字' },
                // 記号
                { char: 'ー', group: '記号' }, { char: '。', group: '記号' }, { char: '、', group: '記号' }, { char: '！', group: '記号' }, { char: '？', group: '記号' },
                { char: '（', group: '記号' }, { char: '）', group: '記号' }, { char: '…', group: '記号' }, { char: '〜', group: '記号' },
            ],
            // グループの開始インデックスをキャッシュ
            groupStartIndices: {}
        };
        // グループ開始インデックスを計算
        this._buildGroupIndices();
    }

    /**
     * グループの開始インデックスを構築
     */
    _buildGroupIndices() {
        const state = this.freetextState;
        let currentGroup = null;
        state.charList.forEach((item, index) => {
            if (item.group !== currentGroup) {
                state.groupStartIndices[item.group] = index;
                currentGroup = item.group;
            }
        });
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
                // 次の定型文
                this.phraseState.phraseIndex =
                    (this.phraseState.phraseIndex + 1) % phrases.length;
                this._updatePhraseDisplay();
                break;

            case 'EYEBROWS_RAISED':
                // 前の定型文
                this.phraseState.phraseIndex =
                    (this.phraseState.phraseIndex - 1 + phrases.length) % phrases.length;
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
            case 'EYEBROWS_RAISED':
                // 前のメロディ（ユーザーから見て左に傾ける or 眉上げ）
                this.melodyState.selectedIndex =
                    (this.melodyState.selectedIndex - 1 + this.config.melodies.length) % this.config.melodies.length;
                this.ui.updateMelodyList(this.config.melodies, this.melodyState.selectedIndex);
                break;

            case 'HEAD_TILT_LEFT':
            case 'DOUBLE_BLINK':
                // 次のメロディ（ユーザーから見て右に傾ける or ダブルまばたき）
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
     * 眉上げ: 次の文字、まばたき: 前の文字、頭傾き: グループジャンプ、口開け: 決定
     */
    _handleFreetextGesture(gesture) {
        const state = this.freetextState;
        const list = state.charList;
        const total = list.length;

        switch (gesture.type) {
            case 'EYEBROWS_RAISED':
                // 次の文字（1つ下）
                state.selectedIndex = (state.selectedIndex + 1) % total;
                this._updateFreetextDisplay();
                break;

            case 'DOUBLE_BLINK':
                // 前の文字（1つ上）
                state.selectedIndex = (state.selectedIndex - 1 + total) % total;
                this._updateFreetextDisplay();
                break;

            case 'HEAD_TILT_LEFT':
                // 次のグループへジャンプ（ユーザーから見て右に傾ける）
                this._jumpToNextGroup();
                this._updateFreetextDisplay();
                break;

            case 'HEAD_TILT_RIGHT':
                // 前のグループへジャンプ（ユーザーから見て左に傾ける）
                this._jumpToPrevGroup();
                this._updateFreetextDisplay();
                break;

            case 'MOUTH_OPEN':
                // 文字を決定
                const selectedItem = list[state.selectedIndex];
                const selectedChar = selectedItem.char;

                // 操作コマンドの処理
                if (selectedChar === '📢読上') {
                    if (state.inputText) {
                        this._speak(state.inputText);
                        this.ui.showNotification('読み上げ中...');
                    } else {
                        this.ui.showNotification('入力がありません');
                    }
                } else if (selectedChar === '🗑クリア') {
                    state.inputText = '';
                    this.ui.showNotification('クリアしました');
                } else if (selectedChar === '␡削除') {
                    if (state.inputText.length > 0) {
                        state.inputText = state.inputText.slice(0, -1);
                        this.ui.showNotification('1文字削除');
                    }
                } else if (selectedChar === '　空白') {
                    state.inputText += ' ';
                    this.ui.showNotification('スペース');
                } else if (selectedChar === '↩確定') {
                    if (state.inputText) {
                        this._speak(state.inputText);
                        this.ui.showNotification('確定: ' + state.inputText);
                    }
                } else {
                    // 通常の文字
                    state.inputText += selectedChar;
                    this._speak(selectedChar);
                }
                this._updateFreetextDisplay();
                break;
        }
    }

    /**
     * 次のグループへジャンプ
     */
    _jumpToNextGroup() {
        const state = this.freetextState;
        const currentGroup = state.charList[state.selectedIndex].group;
        const groups = Object.keys(state.groupStartIndices);
        const currentGroupIndex = groups.indexOf(currentGroup);
        const nextGroupIndex = (currentGroupIndex + 1) % groups.length;
        state.selectedIndex = state.groupStartIndices[groups[nextGroupIndex]];
    }

    /**
     * 前のグループへジャンプ
     */
    _jumpToPrevGroup() {
        const state = this.freetextState;
        const currentGroup = state.charList[state.selectedIndex].group;
        const groups = Object.keys(state.groupStartIndices);
        const currentGroupIndex = groups.indexOf(currentGroup);
        const prevGroupIndex = (currentGroupIndex - 1 + groups.length) % groups.length;
        state.selectedIndex = state.groupStartIndices[groups[prevGroupIndex]];
    }

    /**
     * 自由入力モードの表示を更新
     */
    _updateFreetextDisplay() {
        const state = this.freetextState;
        const list = state.charList;
        const selectedIndex = state.selectedIndex;
        const selectedItem = list[selectedIndex];

        // 入力テキストを更新
        const inputTextEl = document.getElementById('input-text');
        if (inputTextEl) {
            inputTextEl.textContent = state.inputText || '';
        }

        // 現在のグループ名を更新
        const currentRowEl = document.getElementById('current-row');
        if (currentRowEl) {
            currentRowEl.textContent = selectedItem.group;
        }

        // 縦スクロールリストを更新
        const charListEl = document.getElementById('char-list');
        if (charListEl) {
            charListEl.innerHTML = '';

            // 表示範囲を計算（選択中の前後5文字 + 選択中 = 11文字）
            const visibleRange = 5;
            const total = list.length;

            for (let offset = -visibleRange; offset <= visibleRange; offset++) {
                const index = (selectedIndex + offset + total) % total;
                const item = list[index];

                const cell = document.createElement('div');
                cell.className = 'char-list-item';

                if (offset === 0) {
                    cell.classList.add('selected');
                }

                // グループの境界を表示
                if (offset !== 0) {
                    const prevIndex = (index - 1 + total) % total;
                    if (list[prevIndex].group !== item.group) {
                        cell.classList.add('group-start');
                    }
                }

                // 操作コマンドの表示
                if (item.isAction) {
                    const displayText = item.char
                        .replace('📢', '')
                        .replace('🗑', '')
                        .replace('␡', '')
                        .replace('↩', '')
                        .replace('　', '');
                    cell.textContent = displayText;
                    cell.classList.add('action-cell');
                } else {
                    cell.textContent = item.char;
                }

                // 距離に応じて透明度を調整
                const distance = Math.abs(offset);
                cell.style.opacity = 1 - (distance * 0.15);

                charListEl.appendChild(cell);
            }
        }

        // グループインジケーターを更新
        const groupIndicator = document.getElementById('group-indicator');
        if (groupIndicator) {
            const groups = Object.keys(state.groupStartIndices);
            groupIndicator.innerHTML = groups.map(g =>
                `<span class="${g === selectedItem.group ? 'active' : ''}">${g}</span>`
            ).join('');
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
