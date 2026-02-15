"""Data models for bot conversation state."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class ConversationState:
    """Represents the current conversation state for a user."""
    
    state: str = "IDLE"
    language: str = "en"
    context: Dict[str, Any] = field(default_factory=dict)
    
    def reset(self):
        """Reset conversation to initial state while preserving language."""
        self.state = "IDLE"
        self.context.clear()
    
    def full_reset(self):
        """Complete reset including language preference."""
        self.state = "IDLE"
        self.language = "en"
        self.context.clear()
