"""AES encryption utilities for phone number authentication."""
from __future__ import annotations

import base64
import json
import logging
from typing import Optional

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes

from config import settings

logger = logging.getLogger(__name__)


class EncryptionService:
    """Handle AES encryption for phone numbers."""

    def __init__(self, aes_key: Optional[str] = None):
        """Initialize with AES key from settings."""
        key_b64 = aes_key or settings.aes_key
        if not key_b64:
            raise ValueError("AES_KEY not configured")
        
        # Decode base64 key
        self.key = base64.b64decode(key_b64)
        if len(self.key) not in {16, 24, 32}:
            raise ValueError(f"Invalid AES key length: {len(self.key)} bytes")

    def encrypt_phone(self, phone_number: str) -> str:
        """Encrypt phone number using AES CBC mode with random IV.
        
        Args:
            phone_number: Phone number EXACTLY as registered in database
                         (e.g., "9876543210", "+919876543210", "(555) 123-4567")
            
        Returns:
            Base64-encoded string with IV prepended to ciphertext
            
        Note:
            Phone number is encrypted AS-IS with no normalization.
            Backend performs exact match on mobno field.
        """
        # Create JSON payload - no normalization, use exact value
        payload = {"mobNo": phone_number}
        data = json.dumps(payload).encode('utf-8')
        
        # Generate random IV (16 bytes for AES)
        iv = get_random_bytes(16)
        
        # Encrypt with AES CBC mode
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        ciphertext = cipher.encrypt(pad(data, AES.block_size))
        
        # Prepend IV to ciphertext and base64 encode
        # Format: base64(iv + ciphertext)
        encrypted = base64.b64encode(iv + ciphertext).decode('utf-8')
        
        logger.debug(f"Encrypted phone number (length: {len(phone_number)})")
        return encrypted

    def decrypt_phone(self, encrypted_code: str) -> str:
        """Decrypt encrypted phone number (for testing/debugging).
        
        Args:
            encrypted_code: Base64-encoded string with IV prepended
            
        Returns:
            Decrypted phone number
            
        Raises:
            ValueError: If decryption fails
        """
        try:
            # Decode base64
            encrypted_data = base64.b64decode(encrypted_code)
            
            # Extract IV (first 16 bytes) and ciphertext
            iv = encrypted_data[:16]
            ciphertext = encrypted_data[16:]
            
            # Decrypt
            cipher = AES.new(self.key, AES.MODE_CBC, iv)
            decrypted_padded = cipher.decrypt(ciphertext)
            
            # Remove padding and parse JSON
            decrypted = unpad(decrypted_padded, AES.block_size)
            payload = json.loads(decrypted.decode('utf-8'))
            
            return payload.get('mobNo', '')
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise ValueError(f"Failed to decrypt phone number: {e}")


# Global encryption service instance
encryption_service = EncryptionService()