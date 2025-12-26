/**
 * カメラ制御モジュール
 *
 * ブラウザのカメラにアクセスし、フレームをキャプチャする
 */

class CameraController {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.isRunning = false;
        this.captureInterval = null;
        this.onFrame = null;  // フレームキャプチャ時のコールバック
        this.frameRate = 10;  // 1秒あたりのフレーム数
    }

    /**
     * カメラを初期化
     * @param {string} videoId - videoタグのID
     * @param {string} canvasId - canvasタグのID
     */
    async init(videoId, canvasId) {
        this.video = document.getElementById(videoId);
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        if (!this.video || !this.canvas) {
            throw new Error('Video or Canvas element not found');
        }
    }

    /**
     * カメラを開始
     */
    async start() {
        try {
            // カメラアクセスを要求
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'  // 前面カメラ
                },
                audio: false
            });

            // ビデオ要素に接続
            this.video.srcObject = this.stream;

            // ビデオの再生開始を待つ
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            // キャンバスサイズをビデオに合わせる
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            this.isRunning = true;
            this._startCapture();

            return true;
        } catch (error) {
            console.error('カメラ開始エラー:', error);
            throw error;
        }
    }

    /**
     * カメラを停止
     */
    stop() {
        this.isRunning = false;

        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }
    }

    /**
     * フレームキャプチャを開始
     */
    _startCapture() {
        const interval = 1000 / this.frameRate;

        this.captureInterval = setInterval(() => {
            if (!this.isRunning || !this.video.videoWidth) return;

            // ビデオフレームをキャンバスに描画
            this.ctx.drawImage(this.video, 0, 0);

            // Base64形式で取得
            const frameData = this.canvas.toDataURL('image/jpeg', 0.7);

            // コールバックを呼び出し
            if (this.onFrame) {
                this.onFrame(frameData);
            }
        }, interval);
    }

    /**
     * フレームレートを設定
     * @param {number} fps - フレームレート
     */
    setFrameRate(fps) {
        this.frameRate = fps;

        // キャプチャ中なら再開始
        if (this.isRunning && this.captureInterval) {
            clearInterval(this.captureInterval);
            this._startCapture();
        }
    }

    /**
     * カメラが利用可能か確認
     */
    static async isAvailable() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch {
            return false;
        }
    }
}

// グローバルにエクスポート
window.CameraController = CameraController;
