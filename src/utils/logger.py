#!/usr/bin/env python3
"""
ログユーティリティ

シンプルなログ機能を提供
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional


def setup_logger(
    name: str = "face_comm",
    level: int = logging.INFO,
    log_file: Optional[str] = None
) -> logging.Logger:
    """
    ロガーをセットアップ
    
    Args:
        name: ロガー名
        level: ログレベル
        log_file: ログファイルのパス（Noneの場合はコンソールのみ）
    
    Returns:
        設定済みのロガー
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # 既にハンドラが設定されている場合はスキップ
    if logger.handlers:
        return logger
    
    # フォーマッタ
    formatter = logging.Formatter(
        fmt='%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # コンソールハンドラ
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # ファイルハンドラ（指定された場合）
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_path, encoding='utf-8')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


class SimpleLogger:
    """シンプルなログクラス（ファイルなし）"""
    
    def __init__(self, prefix: str = ""):
        self.prefix = prefix
    
    def _log(self, level: str, message: str) -> None:
        timestamp = datetime.now().strftime('%H:%M:%S')
        prefix = f"[{self.prefix}] " if self.prefix else ""
        print(f"{timestamp} [{level}] {prefix}{message}")
    
    def info(self, message: str) -> None:
        self._log("INFO", message)
    
    def warning(self, message: str) -> None:
        self._log("WARNING", message)
    
    def error(self, message: str) -> None:
        self._log("ERROR", message)
    
    def debug(self, message: str) -> None:
        self._log("DEBUG", message)
