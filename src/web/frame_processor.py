"""
フレーム処理モジュール

Base64エンコードされた画像をデコードしてOpenCV形式に変換
"""

import base64
import numpy as np
import cv2
from typing import Optional


def decode_base64_frame(data: str) -> Optional[np.ndarray]:
    """
    Base64エンコードされたJPEG画像をOpenCV形式のnumpy配列に変換

    Args:
        data: Base64エンコードされた画像データ
              "data:image/jpeg;base64,..." 形式も対応

    Returns:
        BGR形式のnumpy配列、失敗時はNone
    """
    try:
        # data URL形式の場合、ヘッダを除去
        if data.startswith("data:"):
            # "data:image/jpeg;base64,XXXXX" -> "XXXXX"
            data = data.split(",", 1)[1]

        # Base64デコード
        image_bytes = base64.b64decode(data)

        # numpy配列に変換
        nparr = np.frombuffer(image_bytes, np.uint8)

        # 画像としてデコード
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        return frame

    except Exception as e:
        print(f"フレームデコードエラー: {e}")
        return None


def encode_frame_to_base64(frame: np.ndarray, quality: int = 80) -> Optional[str]:
    """
    OpenCV形式の画像をBase64エンコードされたJPEGに変換

    Args:
        frame: BGR形式のnumpy配列
        quality: JPEG品質 (0-100)

    Returns:
        Base64エンコードされた画像データ、失敗時はNone
    """
    try:
        # JPEG形式でエンコード
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        _, buffer = cv2.imencode('.jpg', frame, encode_param)

        # Base64エンコード
        base64_data = base64.b64encode(buffer).decode('utf-8')

        return f"data:image/jpeg;base64,{base64_data}"

    except Exception as e:
        print(f"フレームエンコードエラー: {e}")
        return None
