/**
 * WebSocket通信モジュール
 *
 * サーバーとのリアルタイム通信を管理
 */

class GestureWebSocket {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;

        // コールバック
        this.onConnect = null;
        this.onDisconnect = null;
        this.onFaceState = null;
        this.onGesture = null;
        this.onError = null;
    }

    /**
     * WebSocket接続を確立
     * @param {string} url - WebSocket URL (省略時は自動生成)
     */
    connect(url = null) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('Already connected');
            return;
        }

        // URLを生成
        if (!url) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            url = `${protocol}//${window.location.host}/ws`;
        }

        try {
            this.ws = new WebSocket(url);
            this._setupEventHandlers();
        } catch (error) {
            console.error('WebSocket接続エラー:', error);
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    /**
     * イベントハンドラを設定
     */
    _setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;

            if (this.onConnect) {
                this.onConnect();
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.isConnected = false;

            if (this.onDisconnect) {
                this.onDisconnect();
            }

            // 自動再接続
            this._attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (this.onError) {
                this.onError(error);
            }
        };

        this.ws.onmessage = (event) => {
            this._handleMessage(event.data);
        };
    }

    /**
     * メッセージを処理
     */
    _handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const type = message.type;
            const payload = message.payload || {};

            switch (type) {
                case 'connected':
                    console.log('Server connected:', payload.message);
                    break;

                case 'face_state':
                    if (this.onFaceState) {
                        this.onFaceState(payload);
                    }
                    // ジェスチャーが含まれている場合
                    if (message.gesture && this.onGesture) {
                        this.onGesture(message.gesture);
                    }
                    break;

                case 'pong':
                    // ヘルスチェック応答
                    break;

                case 'error':
                    console.error('Server error:', payload.code, payload.message);
                    if (this.onError) {
                        this.onError(new Error(payload.message));
                    }
                    break;

                default:
                    console.log('Unknown message type:', type);
            }
        } catch (error) {
            console.error('メッセージ解析エラー:', error);
        }
    }

    /**
     * 再接続を試行
     */
    _attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);
    }

    /**
     * 接続を切断
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    /**
     * フレームを送信
     * @param {string} frameData - Base64エンコードされた画像データ
     */
    sendFrame(frameData) {
        if (!this.isConnected) return;

        const message = {
            type: 'frame',
            payload: {
                data: frameData
            },
            timestamp: Date.now()
        };

        this._send(message);
    }

    /**
     * Pingを送信
     */
    sendPing() {
        if (!this.isConnected) return;

        const message = {
            type: 'ping',
            timestamp: Date.now()
        };

        this._send(message);
    }

    /**
     * リセットを送信
     */
    sendReset() {
        if (!this.isConnected) return;

        const message = {
            type: 'reset',
            timestamp: Date.now()
        };

        this._send(message);
    }

    /**
     * メッセージを送信
     */
    _send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}

// グローバルにエクスポート
window.GestureWebSocket = GestureWebSocket;
