"""Interaction service with media handling."""
from __future__ import annotations

import io
import json
import logging
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import cloudinary
import cloudinary.uploader
import requests

from config import settings

logger = logging.getLogger(__name__)


class InteractionError(RuntimeError):
    """Custom error raised when the interaction pipeline fails."""


@dataclass
class MediaInfo:
    """Normalized metadata for inbound WhatsApp media."""

    media_id: str
    kind: str
    mime_type: Optional[str] = None
    caption: Optional[str] = None
    sha256: Optional[str] = None
    file_name: Optional[str] = None


@dataclass
class MediaUrls:
    """Holds uploaded URLs for various media slots."""

    image_url: Optional[str] = None
    audio_url: Optional[str] = None


class InteractionService:
    """Handles WhatsApp media ingestion and backend interaction creation."""

    def __init__(self) -> None:
        self.api_url = settings.interactions_api_url
        self.api_token = settings.interactions_api_token
        self.default_tag_ids = settings.default_tag_ids
        self.cloudinary_folder = settings.cloudinary_folder
        self.session = requests.Session()
        self.cloudinary_ready = False
        self._configure_cloudinary()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def create_interaction(
        self,
        *,
        phone_number: str,
        name: Optional[str] = None,
        tag_ids: Optional[List[int]] = None,
        remarks: Optional[str] = None,
        mode: str = "field",
        message_type: Optional[str] = None,
        text: Optional[str] = None,
        media: Optional[Dict[str, Any]] = None,
        user_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a backend interaction entry.

        Args:
            phone_number: WhatsApp sender number
            name: Lead name (optional, auto-generated if not provided)
            tag_ids: List of tag IDs (optional, uses DEFAULT_TAG_IDS if not provided)
            remarks: Interaction remarks (optional)
            mode: Interaction mode (default: "field", or "stall")
            message_type: DEPRECATED - for backward compatibility
            text: DEPRECATED - for backward compatibility  
            media: DEPRECATED - for backward compatibility
            user_token: User's auth token from session
        """

        self._ensure_api_configured()

        # Use provided token or fall back to service token
        auth_token = user_token or self.api_token
        if not auth_token:
            raise InteractionError("No authentication token available")

        # Handle backward compatibility with old media flow
        media_urls = MediaUrls()
        if media:
            media_urls = self._handle_media_if_needed(media)

        # Build payload
        payload: Dict[str, Any] = {
            "name": name or self._build_lead_name(phone_number),
            "mobNo": self._normalize_phone(phone_number),
            "tagIds": tag_ids or self.default_tag_ids,
            "mode": mode,
        }

        # Add remarks if provided
        if remarks:
            payload["remarks"] = remarks
        elif text:
            # Backward compatibility
            payload["remarks"] = self._build_remarks(text, message_type, media)

        # Add media URLs if present
        if media_urls.image_url:
            payload["image_url"] = media_urls.image_url
        if media_urls.audio_url:
            payload["audio_url"] = media_urls.audio_url

        logger.info("Creating interaction for %s via %s mode", phone_number, mode)
        logger.info("=" * 80)
        logger.info("INTERACTION API REQUEST:")
        logger.info("URL: %s", self.api_url)
        logger.info("Headers: Authorization: Bearer %s...", auth_token[:20] if auth_token else "None")
        logger.info("Payload: %s", json.dumps(payload, indent=2))
        logger.info("=" * 80)
        
        return self.post_interaction(payload, auth_token=auth_token)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _handle_media_if_needed(self, media: Optional[Dict[str, Any]]):
        result = MediaUrls()
        if not media:
            return result

        media_info = MediaInfo(
            media_id=media.get("media_id") or media.get("id"),
            kind=media.get("kind") or media.get("type", "unknown"),
            mime_type=media.get("mime_type"),
            caption=media.get("caption"),
            sha256=media.get("sha256"),
            file_name=media.get("file_name") or media.get("filename"),
        )

        if not media_info.media_id:
            raise InteractionError("Media payload is missing an id")
        if not self.cloudinary_ready:
            raise InteractionError("Cloudinary is not configured for media uploads")

        content_bytes, mime_type = self._download_whatsapp_media(media_info.media_id)
        resource_type = "image" if media_info.kind == "image" else "video"
        uploaded_url = self._upload_to_cloudinary(
            content_bytes,
            resource_type=resource_type,
            filename=media_info.file_name,
        )

        if media_info.kind == "image":
            result.image_url = uploaded_url
        else:
            result.audio_url = uploaded_url
        return result

    def _download_whatsapp_media(self, media_id: str) -> Tuple[bytes, Optional[str]]:
        if not settings.access_token:
            raise InteractionError("WhatsApp access token is not configured")

        meta_url = f"https://graph.facebook.com/{settings.api_version}/{media_id}"
        meta_resp = self.session.get(
            meta_url,
            params={"access_token": settings.access_token},
            timeout=15,
        )
        if meta_resp.status_code >= 400:
            raise InteractionError(
                f"Failed to fetch media metadata ({meta_resp.status_code}): {meta_resp.text}"
            )
        download_url = meta_resp.json().get("url")
        if not download_url:
            raise InteractionError("Media metadata response missing download url")

        file_resp = self.session.get(
            download_url,
            headers={"Authorization": f"Bearer {settings.access_token}"},
            timeout=30,
        )
        if file_resp.status_code >= 400:
            raise InteractionError(
                f"Failed to download media ({file_resp.status_code}): {file_resp.text}"
            )
        return file_resp.content, file_resp.headers.get("Content-Type")

    def _upload_to_cloudinary(
        self,
        content: bytes,
        *,
        resource_type: str,
        filename: Optional[str] = None,
    ) -> str:
        public_id = filename or f"wa-{uuid.uuid4()}"
        file_obj = io.BytesIO(content)
        try:
            upload_kwargs: Dict[str, Any] = {
                "resource_type": resource_type,
                "public_id": public_id,
                "overwrite": True,
            }
            if self.cloudinary_folder:
                upload_kwargs["folder"] = self.cloudinary_folder
            upload_result = cloudinary.uploader.upload(file_obj, **upload_kwargs)
            return upload_result.get("secure_url")
        except Exception as exc:  # pragma: no cover - cloudinary runtime errors
            raise InteractionError(f"Cloudinary upload failed: {exc}") from exc

    def _configure_cloudinary(self) -> None:
        if (
            settings.cloudinary_cloud_name
            and settings.cloudinary_api_key
            and settings.cloudinary_api_secret
        ):
            cloudinary.config(
                cloud_name=settings.cloudinary_cloud_name,
                api_key=settings.cloudinary_api_key,
                api_secret=settings.cloudinary_api_secret,
                secure=True,
            )
            self.cloudinary_ready = True
            folder_msg = self.cloudinary_folder or "root"
            logger.info("Cloudinary configured; uploads go to %s", folder_msg)
        else:
            logger.warning("Cloudinary credentials missing; media uploads disabled")

    def _ensure_api_configured(self) -> None:
        if not self.api_url:
            raise InteractionError("Interaction API URL is not configured")
        # Token can be provided per-call, so don't enforce it here
        if not self.default_tag_ids:
            raise InteractionError("Default tag IDs are not configured")

    @staticmethod
    def _build_lead_name(phone_number: str) -> str:
        return f"WhatsApp Lead {phone_number[-4:]}" if phone_number else "WhatsApp Lead"

    @staticmethod
    def _normalize_phone(phone_number: str) -> str:
        if not phone_number:
            return phone_number
        if phone_number.startswith("+"):
            return phone_number
        return f"+{phone_number}"

    @staticmethod
    def _build_remarks(text: Optional[str], message_type: str, media: Optional[Dict[str, Any]]) -> Optional[str]:
        base = (text or "").strip()
        if base:
            return base
        if message_type == "image" and media and media.get("caption"):
            return media["caption"].strip()
        if message_type != "text":
            return f"Shared a {message_type} on WhatsApp"
        return None

    # New: shared posting helper used by background queue
    def post_interaction(self, payload: Dict[str, Any], *, auth_token: str) -> Dict[str, Any]:
        """Send payload to Interaction API with shared logging and error handling."""

        self._ensure_api_configured()
        if not auth_token:
            raise InteractionError("Missing auth token for interaction")

        logger.info("INTERACTION API REQUEST: %s", json.dumps(payload, indent=2))

        response = self.session.post(
            self.api_url,
            json=payload,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )

        logger.info("Response Status: %s", response.status_code)
        logger.info("Response Body: %s", response.text)

        if response.status_code >= 400:
            raise InteractionError(
                f"Interaction API error ({response.status_code}): {response.text or 'unknown error'}"
            )

        try:
            return response.json()
        except ValueError:
            return {"status": "ok"}
