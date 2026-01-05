/**
 * UI制御モジュール
 *
 * 画面表示の更新を管理
 */

class UIController {
    constructor() {
        // ステータス要素
        this.faceStatus = document.getElementById('face-status');
        this.statusIcon = this.faceStatus?.querySelector('.status-icon');
        this.statusText = this.faceStatus?.querySelector('.status-text');

        // ジェスチャー状態表示
        this.eyeStatus = document.getElementById('eye-status');
        this.mouthStatus = document.getElementById('mouth-status');
        this.eyebrowStatus = document.getElementById('eyebrow-status');
        this.headStatus = document.getElementById('head-status');

        // 接続状態
        this.connectionIndicator = document.getElementById('connection-indicator');
        this.connectionText = document.getElementById('connection-text');

        // 最後のジェスチャー
        this.lastGesture = document.getElementById('last-gesture');

        // 通知
        this.notification = document.getElementById('notification');
        this.notificationText = document.getElementById('notification-text');

        // モード関連
        this.modeTabs = document.querySelectorAll('.mode-tab');
        this.modePanels = document.querySelectorAll('.mode-panel');

        // Yes/Noモード
        this.yesOption = document.getElementById('yes-option');
        this.noOption = document.getElementById('no-option');
        this.currentQuestion = document.getElementById('current-question');
        this.questionInput = document.getElementById('question-input');
        this.askButton = document.getElementById('ask-button');
        this.historyList = document.getElementById('history-list');

        // 定型文モード
        this.currentCategory = document.getElementById('current-category');
        this.phraseList = document.getElementById('phrase-list');
        this.selectedPhrase = document.getElementById('selected-phrase');

        // メロディモード
        this.melodyList = document.getElementById('melody-list');
        this.playerStatus = document.getElementById('player-status');
        this.nowPlayingName = document.getElementById('now-playing-name');

        this._setupModeTabHandlers();
    }

    /**
     * モードタブのイベントハンドラを設定
     */
    _setupModeTabHandlers() {
        this.modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.mode;
                this.switchMode(mode);
            });
        });
    }

    /**
     * モードを切り替え
     * @param {string} mode - モード名 (yesno, phrase, melody)
     */
    switchMode(mode) {
        // タブのアクティブ状態を更新
        this.modeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        // パネルの表示を更新
        this.modePanels.forEach(panel => {
            const panelMode = panel.id.replace('-mode', '');
            panel.classList.toggle('active', panelMode === mode);
        });
    }

    /**
     * 接続状態を更新
     * @param {boolean} connected - 接続中かどうか
     */
    updateConnectionStatus(connected) {
        if (this.connectionIndicator) {
            this.connectionIndicator.classList.toggle('connected', connected);
            this.connectionIndicator.classList.toggle('disconnected', !connected);
        }
        if (this.connectionText) {
            this.connectionText.textContent = connected ? '接続中' : '未接続';
        }
    }

    /**
     * 顔検出状態を更新
     * @param {boolean} detected - 顔が検出されたか
     */
    updateFaceDetected(detected) {
        if (this.statusIcon) {
            this.statusIcon.textContent = detected ? '👤' : '?';
        }
        if (this.statusText) {
            this.statusText.textContent = detected ? '顔を検出中' : '顔が見つかりません';
        }
        if (this.faceStatus) {
            this.faceStatus.classList.toggle('detected', detected);
            this.faceStatus.classList.toggle('not-detected', !detected);
        }
    }

    /**
     * 顔状態を更新
     * @param {object} state - 顔状態オブジェクト
     */
    updateFaceState(state) {
        this.updateFaceDetected(state.face_detected);

        if (state.face_detected) {
            // 目の状態（EAR値も表示）
            if (this.eyeStatus) {
                const eyeText = state.eyes_closed ? '閉じている' : '開いている';
                const leftEar = state.left_eye_ar !== undefined ? state.left_eye_ar.toFixed(3) : '---';
                const rightEar = state.right_eye_ar !== undefined ? state.right_eye_ar.toFixed(3) : '---';
                this.eyeStatus.textContent = `${eyeText} (L:${leftEar} R:${rightEar})`;
                // 状態クラスを設定
                this.eyeStatus.className = 'gesture-value ' + (state.eyes_closed ? 'state-closed' : 'state-open');
            }

            // 口の状態（MAR値も表示）
            if (this.mouthStatus) {
                const mouthText = state.mouth_open ? '開いている' : '閉じている';
                const mar = state.mouth_ar !== undefined ? state.mouth_ar.toFixed(3) : '---';
                this.mouthStatus.textContent = `${mouthText} (${mar})`;
                // 状態クラスを設定（口は開=赤、閉=緑で逆）
                this.mouthStatus.className = 'gesture-value ' + (state.mouth_open ? 'state-closed' : 'state-open');
            }

            // 眉の状態（数値も表示）
            if (this.eyebrowStatus) {
                const eyebrowText = state.eyebrows_raised ? '上げている' : '通常';
                const eyebrowValue = state.eyebrow_position !== undefined ? state.eyebrow_position.toFixed(4) : '---';
                this.eyebrowStatus.textContent = `${eyebrowText} (${eyebrowValue})`;
                // 状態クラスを設定
                this.eyebrowStatus.className = 'gesture-value ' + (state.eyebrows_raised ? 'state-raised' : 'state-normal');
            }

            // 頭の傾き（角度も表示）
            if (this.headStatus) {
                let headText = '中央';
                let stateClass = 'state-center';
                if (state.head_tilt_left) {
                    headText = '左';
                    stateClass = 'state-left';
                } else if (state.head_tilt_right) {
                    headText = '右';
                    stateClass = 'state-right';
                }
                const angle = state.head_tilt_angle !== undefined ? state.head_tilt_angle.toFixed(1) : '---';
                this.headStatus.textContent = `${headText} (${angle}°)`;
                // 状態クラスを設定
                this.headStatus.className = 'gesture-value ' + stateClass;
            }
        } else {
            // 顔が検出されていない場合はリセット
            if (this.eyeStatus) {
                this.eyeStatus.textContent = '---';
                this.eyeStatus.className = 'gesture-value';
            }
            if (this.mouthStatus) {
                this.mouthStatus.textContent = '---';
                this.mouthStatus.className = 'gesture-value';
            }
            if (this.eyebrowStatus) {
                this.eyebrowStatus.textContent = '---';
                this.eyebrowStatus.className = 'gesture-value';
            }
            if (this.headStatus) {
                this.headStatus.textContent = '---';
                this.headStatus.className = 'gesture-value';
            }
        }
    }

    /**
     * ジェスチャーを表示
     * @param {object} gesture - ジェスチャーオブジェクト
     */
    showGesture(gesture) {
        if (this.lastGesture) {
            this.lastGesture.textContent = gesture.name;
        }
    }

    /**
     * 通知を表示
     * @param {string} message - 通知メッセージ
     * @param {number} duration - 表示時間（ミリ秒）
     */
    showNotification(message, duration = 3000) {
        if (this.notification && this.notificationText) {
            this.notificationText.textContent = message;
            this.notification.classList.remove('hidden');

            setTimeout(() => {
                this.notification.classList.add('hidden');
            }, duration);
        }
    }

    /**
     * Yes/Noオプションをハイライト
     * @param {string} option - 'yes' or 'no' or null
     */
    highlightYesNo(option) {
        if (this.yesOption) {
            this.yesOption.classList.toggle('active', option === 'yes');
        }
        if (this.noOption) {
            this.noOption.classList.toggle('active', option === 'no');
        }
    }

    /**
     * 質問を設定
     * @param {string} question - 質問文
     */
    setQuestion(question) {
        if (this.currentQuestion) {
            this.currentQuestion.textContent = question;
        }
    }

    /**
     * 回答履歴に追加
     * @param {string} question - 質問
     * @param {string} answer - 回答 ('はい' or 'いいえ')
     */
    addToHistory(question, answer) {
        if (this.historyList) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>Q:</strong> ${question} <strong>A:</strong> ${answer}`;
            this.historyList.insertBefore(li, this.historyList.firstChild);

            // 履歴は最新10件まで
            while (this.historyList.children.length > 10) {
                this.historyList.removeChild(this.historyList.lastChild);
            }
        }
    }

    /**
     * 定型文リストを設定
     * @param {Array} phrases - 定型文配列
     * @param {number} selectedIndex - 選択中のインデックス
     */
    updatePhraseList(phrases, selectedIndex) {
        if (!this.phraseList) return;

        this.phraseList.innerHTML = '';

        phrases.forEach((phrase, index) => {
            const div = document.createElement('div');
            div.className = 'phrase-item';
            if (index === selectedIndex) {
                div.classList.add('selected');
            }
            div.textContent = phrase;
            this.phraseList.appendChild(div);
        });

        if (this.selectedPhrase && phrases[selectedIndex]) {
            this.selectedPhrase.textContent = phrases[selectedIndex];
        }
    }

    /**
     * カテゴリを設定
     * @param {string} category - カテゴリ名
     */
    setCategory(category) {
        if (this.currentCategory) {
            this.currentCategory.textContent = category;
        }
    }

    /**
     * メロディリストを設定
     * @param {Array} melodies - メロディ配列
     * @param {number} selectedIndex - 選択中のインデックス
     */
    updateMelodyList(melodies, selectedIndex) {
        if (!this.melodyList) return;

        this.melodyList.innerHTML = '';

        melodies.forEach((melody, index) => {
            const div = document.createElement('div');
            div.className = 'melody-item';
            if (index === selectedIndex) {
                div.classList.add('selected');
            }
            div.textContent = melody.name;
            this.melodyList.appendChild(div);
        });
    }

    /**
     * プレイヤー状態を更新
     * @param {boolean} playing - 再生中かどうか
     * @param {string} melodyName - メロディ名
     */
    updatePlayerStatus(playing, melodyName = null) {
        if (this.playerStatus) {
            this.playerStatus.textContent = playing ? '再生中' : '停止中';
            this.playerStatus.classList.toggle('playing', playing);
        }
        if (this.nowPlayingName) {
            this.nowPlayingName.textContent = melodyName || '---';
        }
    }
}

// グローバルにエクスポート
window.UIController = UIController;
