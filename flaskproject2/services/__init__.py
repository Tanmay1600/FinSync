"""Service layer for integrating with external APIs.

The :mod:`services` package centralizes integrations such as:

* Interaction API orchestration
* Media download/upload helpers
* User authentication via encrypted phone
* Future third-party connectors (CRMs, analytics, etc.)

Currently only :class:`InteractionService` is exposed, but the
structure is ready for additional services.
"""
from __future__ import annotations

from .interaction_service import InteractionError, InteractionService
from .auth_service import AuthService, AuthError, auth_service
from .encryption import EncryptionService, encryption_service
from .gemini_service import GeminiService, get_gemini_service
from .vosk_service import VoskTranscriber

__all__ = [
    "InteractionService", 
    "InteractionError",
    "AuthService",
    "AuthError",
    "auth_service",
    "EncryptionService",
    "encryption_service",
    "GeminiService",
    "get_gemini_service",
    "VoskTranscriber",
]
