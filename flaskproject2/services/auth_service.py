"""Authentication service for encrypted phone login."""
from __future__ import annotations

import logging
from typing import Dict, Optional

import requests

from config import settings
from services.encryption import encryption_service

logger = logging.getLogger(__name__)


class AuthError(RuntimeError):
    """Custom error for authentication failures."""


class AuthService:
    """Handle user authentication via encrypted phone number."""

    def __init__(self):
        self.auth_url = settings.auth_api_url
        self.session = requests.Session()
        self._token_cache: Dict[str, str] = {}  # phone -> token

    def get_user_token(self, phone_number: str) -> Optional[str]:
        """Get auth token for a phone number.
        
        Args:
            phone_number: User's phone number (e.g., "+919555869364")
            
        Returns:
            JWT token if user exists, None if user not found
            
        Raises:
            AuthError: If authentication fails for reasons other than user not found
        """
        # Check cache first
        if phone_number in self._token_cache:
            logger.debug("Using cached token for %s", phone_number)
            return self._token_cache[phone_number]
        
        # Encrypt phone number
        try:
            encrypted_code = encryption_service.encrypt_phone(phone_number)
        except Exception as exc:
            logger.error("Failed to encrypt phone number: %s", exc)
            raise AuthError(f"Encryption failed: {exc}") from exc
        
        # Call auth endpoint
        payload = {"code": encrypted_code}
        
        try:
            response = self.session.post(
                self.auth_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 404:
                logger.info("User not found for phone %s", phone_number)
                return None
                
            if response.status_code >= 400:
                logger.error(
                    "Auth API error (%s): %s", 
                    response.status_code, 
                    response.text
                )
                raise AuthError(
                    f"Auth API error ({response.status_code}): {response.text}"
                )
            
            data = response.json()
            token = data.get("token") or data.get("access_token")
            
            if not token:
                raise AuthError("No token in auth response")
            
            # Cache the token
            self._token_cache[phone_number] = token
            logger.info("Successfully authenticated user %s", phone_number)
            return token
            
        except requests.RequestException as exc:
            logger.error("Auth request failed: %s", exc)
            raise AuthError(f"Auth request failed: {exc}") from exc

    def clear_token_cache(self, phone_number: Optional[str] = None):
        """Clear cached tokens."""
        if phone_number:
            self._token_cache.pop(phone_number, None)
        else:
            self._token_cache.clear()


# Global auth service instance
auth_service = AuthService()
