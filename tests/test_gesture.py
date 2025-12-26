#!/usr/bin/env python3
"""
ジェスチャー検出のユニットテスト
"""

import sys
from pathlib import Path

# プロジェクトルートをパスに追加
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pytest
import numpy as np
from unittest.mock import MagicMock, patch

from src.gesture_detector import (
    GestureDetector,
    GestureState,
    GestureType,
    Thresholds,
    FaceLandmarks
)


class TestThresholds:
    """閾値クラスのテスト"""
    
    def test_default_values(self):
        """デフォルト値のテスト"""
        thresholds = Thresholds()
        
        assert thresholds.eye_ar_threshold == 0.20
        assert thresholds.mouth_ar_threshold == 0.30
        assert thresholds.head_tilt_threshold == 15.0
    
    def test_custom_values(self):
        """カスタム値のテスト"""
        thresholds = Thresholds(
            eye_ar_threshold=0.25,
            mouth_ar_threshold=0.35
        )
        
        assert thresholds.eye_ar_threshold == 0.25
        assert thresholds.mouth_ar_threshold == 0.35


class TestGestureState:
    """ジェスチャー状態クラスのテスト"""
    
    def test_default_state(self):
        """デフォルト状態のテスト"""
        state = GestureState()
        
        assert state.face_detected == False
        assert state.eyes_closed == False
        assert state.mouth_open == False
        assert state.detected_gesture == GestureType.NONE


class TestGestureDetector:
    """ジェスチャー検出器のテスト"""
    
    @pytest.fixture
    def detector(self):
        """テスト用の検出器を作成"""
        with patch('mediapipe.solutions.face_mesh.FaceMesh'):
            detector = GestureDetector()
            yield detector
            detector.close()
    
    def test_initialization(self, detector):
        """初期化のテスト"""
        assert detector.thresholds is not None
        assert detector.blink_count == 0
    
    def test_reset(self, detector):
        """リセット機能のテスト"""
        detector.blink_count = 5
        detector.last_blink_time = 100.0
        
        detector.reset()
        
        assert detector.blink_count == 0
        assert detector.last_blink_time == 0.0
    
    def test_update_thresholds(self, detector):
        """閾値更新のテスト"""
        new_thresholds = Thresholds(eye_ar_threshold=0.30)
        detector.update_thresholds(new_thresholds)
        
        assert detector.thresholds.eye_ar_threshold == 0.30
    
    def test_gesture_cooldown(self, detector):
        """クールダウン機能のテスト"""
        # 最初は利用可能
        assert detector._is_gesture_available(GestureType.DOUBLE_BLINK) == True
        
        # 確定後はクールダウン中
        detector._confirm_gesture(GestureType.DOUBLE_BLINK)
        assert detector._is_gesture_available(GestureType.DOUBLE_BLINK) == False


class TestFaceLandmarks:
    """顔ランドマーク定義のテスト"""
    
    def test_eye_landmarks(self):
        """目のランドマークのテスト"""
        assert FaceLandmarks.RIGHT_EYE_TOP == 159
        assert FaceLandmarks.LEFT_EYE_TOP == 386
    
    def test_mouth_landmarks(self):
        """口のランドマークのテスト"""
        assert FaceLandmarks.MOUTH_TOP == 13
        assert FaceLandmarks.MOUTH_BOTTOM == 14


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
