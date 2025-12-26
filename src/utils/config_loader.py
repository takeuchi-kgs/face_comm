#!/usr/bin/env python3
"""
設定ファイル読み込みユーティリティ
"""

import yaml
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class CameraConfig:
    """カメラ設定"""
    device_id: int = 0
    width: int = 640
    height: int = 480
    fps: int = 30


@dataclass
class GuiConfig:
    """GUI設定"""
    fullscreen: bool = True
    font_size: int = 24
    highlight_color: str = "#00FF00"
    background_color: str = "#1a1a2e"
    text_color: str = "#FFFFFF"


@dataclass
class AudioConfig:
    """音声設定"""
    engine: str = "pyttsx3"
    rate: int = 150
    volume: float = 1.0
    language: str = "ja"


@dataclass
class AudibleConfig:
    """Audible設定"""
    enabled: bool = True
    browser: str = "chromium"
    skip_seconds: int = 30


@dataclass
class Phrase:
    """定型文"""
    id: str
    text: str
    short: str


@dataclass
class PhraseCategory:
    """定型文カテゴリ"""
    name: str
    icon: str
    phrases: List[Phrase]


class ConfigLoader:
    """設定ファイル読み込みクラス"""
    
    def __init__(self, config_dir: Path):
        """
        初期化
        
        Args:
            config_dir: 設定ファイルのディレクトリ
        """
        self.config_dir = Path(config_dir)
        self._settings: Dict[str, Any] = {}
        self._phrases: List[PhraseCategory] = []
        self._custom_phrases: List[Phrase] = []
        
        self._load_settings()
        self._load_phrases()
    
    def _load_yaml(self, filename: str) -> Dict[str, Any]:
        """YAMLファイルを読み込む"""
        filepath = self.config_dir / filename
        if not filepath.exists():
            return {}
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    
    def _load_settings(self) -> None:
        """設定ファイルを読み込む"""
        self._settings = self._load_yaml('settings.yaml')
    
    def _load_phrases(self) -> None:
        """定型文ファイルを読み込む"""
        data = self._load_yaml('phrases.yaml')
        
        # カテゴリの読み込み
        for cat_data in data.get('categories', []):
            phrases = [
                Phrase(id=p['id'], text=p['text'], short=p['short'])
                for p in cat_data.get('phrases', [])
            ]
            category = PhraseCategory(
                name=cat_data['name'],
                icon=cat_data.get('icon', ''),
                phrases=phrases
            )
            self._phrases.append(category)
        
        # カスタム定型文の読み込み
        for p_data in data.get('custom', []):
            if p_data.get('text'):  # 空でない場合のみ
                self._custom_phrases.append(
                    Phrase(id=p_data['id'], text=p_data['text'], short=p_data['short'])
                )
    
    @property
    def camera(self) -> CameraConfig:
        """カメラ設定を取得"""
        cam = self._settings.get('camera', {})
        return CameraConfig(
            device_id=cam.get('device_id', 0),
            width=cam.get('width', 640),
            height=cam.get('height', 480),
            fps=cam.get('fps', 30)
        )
    
    @property
    def gui(self) -> GuiConfig:
        """GUI設定を取得"""
        gui = self._settings.get('gui', {})
        return GuiConfig(
            fullscreen=gui.get('fullscreen', True),
            font_size=gui.get('font_size', 24),
            highlight_color=gui.get('highlight_color', '#00FF00'),
            background_color=gui.get('background_color', '#1a1a2e'),
            text_color=gui.get('text_color', '#FFFFFF')
        )
    
    @property
    def audio(self) -> AudioConfig:
        """音声設定を取得"""
        audio = self._settings.get('audio', {})
        return AudioConfig(
            engine=audio.get('engine', 'pyttsx3'),
            rate=audio.get('rate', 150),
            volume=audio.get('volume', 1.0),
            language=audio.get('language', 'ja')
        )
    
    @property
    def audible(self) -> AudibleConfig:
        """Audible設定を取得"""
        audible = self._settings.get('audible', {})
        return AudibleConfig(
            enabled=audible.get('enabled', True),
            browser=audible.get('browser', 'chromium'),
            skip_seconds=audible.get('skip_seconds', 30)
        )
    
    @property
    def phrases(self) -> List[PhraseCategory]:
        """定型文カテゴリを取得"""
        return self._phrases
    
    @property
    def custom_phrases(self) -> List[Phrase]:
        """カスタム定型文を取得"""
        return self._custom_phrases
    
    def get_all_phrases(self) -> List[Phrase]:
        """全ての定型文をフラットなリストで取得"""
        all_phrases = []
        for category in self._phrases:
            all_phrases.extend(category.phrases)
        all_phrases.extend(self._custom_phrases)
        return all_phrases
    
    def save_custom_phrase(self, phrase: Phrase) -> None:
        """カスタム定型文を保存"""
        # TODO: 実装
        pass
