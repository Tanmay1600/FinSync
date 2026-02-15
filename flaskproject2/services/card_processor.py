"""Background worker to process queued visiting card images offline."""
from __future__ import annotations

import logging
import threading
import time
from typing import Any, Dict, Optional

from config import settings
from services.auth_service import auth_service, AuthError
from services.gemini_service import GeminiService
from services.interaction_service import InteractionService, InteractionError
from services.offline_queue import OfflineQueue, QueuedTask, get_queue
from whatsapp_client import client as whatsapp_client

logger = logging.getLogger(__name__)


class CardProcessor:
    """Pulls queued visiting card tasks and processes them sequentially."""

    def __init__(
        self,
        *,
        queue: Optional[OfflineQueue] = None,
        interaction_service: Optional[InteractionService] = None,
        gemini_service: Optional[GeminiService] = None,
        poll_interval: int = settings.queue_poll_interval,
        max_attempts: int = 5,
    ) -> None:
        self.queue = queue or get_queue(settings.queue_db_path)
        self.interaction_service = interaction_service or InteractionService()
        self.gemini_service = gemini_service or GeminiService()
        self.poll_interval = poll_interval
        self.max_attempts = max_attempts
        self._thread: Optional[threading.Thread] = None
        self._running = False

    # Public API -----------------------------------------------------
    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("CardProcessor worker started (poll=%ss)", self.poll_interval)

    def stop(self) -> None:
        self._running = False
        if self._thread:
            self._thread.join(timeout=1)

    def enqueue_card(self, user_id: str, media: Dict[str, Any], caption: str = "") -> int:
        task_id = self.queue.enqueue(
            "visiting_card",
            {
                "user_id": user_id,
                "media": media,
                "caption": caption or "",
            },
        )
        return task_id

    # Internal -------------------------------------------------------
    def _run_loop(self) -> None:
        while self._running:
            tasks = self.queue.fetch_batch(limit=3)
            if not tasks:
                time.sleep(self.poll_interval)
                continue

            for task in tasks:
                try:
                    self._process_task(task)
                    self.queue.mark_done(task.id)
                except Exception as exc:  # pragma: no cover - runtime safety
                    self.queue.mark_failed(task.id, str(exc), max_attempts=self.max_attempts)
            time.sleep(1)

    def _process_task(self, task: QueuedTask) -> None:
        if task.kind != "visiting_card":
            raise ValueError(f"Unknown task kind: {task.kind}")

        payload = task.payload or {}
        user_id = payload.get("user_id")
        media = payload.get("media")
        caption = (payload.get("caption") or "").strip()

        if not user_id or not media or not media.get("media_id"):
            raise ValueError("Task payload missing user_id or media")

        logger.info("Processing card task %s for user %s", task.id, user_id)

        # 1) Download media from WhatsApp
        content_bytes, mime_type = self.interaction_service._download_whatsapp_media(media["media_id"])

        # 2) Upload to Cloudinary
        image_url = self.interaction_service._upload_to_cloudinary(
            content_bytes,
            resource_type="image",
            filename=media.get("file_name"),
        )

        # 3) Extract structured data via Gemini (best-effort)
        extracted = {}
        if self.gemini_service.enabled:
            try:
                extracted = self.gemini_service.extract_business_card(content_bytes, mime_type)
            except Exception as exc:
                logger.warning("Gemini extraction failed (task %s): %s", task.id, exc)
        else:
            logger.info("Gemini disabled; skipping extraction")

        name = (extracted or {}).get("name")
        phone = (extracted or {}).get("phone")
        remarks = (extracted or {}).get("remarks") or caption or "Shared a visiting card on WhatsApp"

        # 4) Authenticate user (cached token)
        try:
            user_token = auth_service.get_user_token(user_id)
        except AuthError as exc:
            raise RuntimeError(f"Auth failed for {user_id}: {exc}") from exc

        if not user_token:
            raise RuntimeError(f"User {user_id} not registered")

        # 5) Send interaction to backend with extracted data
        payload = {
            "name": name or self.interaction_service._build_lead_name(user_id),
            "mobNo": self.interaction_service._normalize_phone(phone or user_id),
            "tagIds": self.interaction_service.default_tag_ids,
            "mode": "field",
            "remarks": remarks,
            "image_url": image_url,
        }

        try:
            self.interaction_service.post_interaction(payload, auth_token=user_token)
        except InteractionError as exc:
            raise RuntimeError(f"Interaction API failed: {exc}") from exc

        # 6) Notify user
        summary_parts = [f"Name: {payload['name']}"]
        if phone:
            summary_parts.append(f"Phone: {phone}")
        if extracted.get("email"):
            summary_parts.append(f"Email: {extracted['email']}")
        summary = " | ".join(summary_parts)
        ack = (
            "✅ Processed your visiting card. "
            f"Reference: {summary or 'Captured'}"
        )
        try:
            whatsapp_client.send_text_message(user_id, ack)
        except Exception as exc:  # pragma: no cover - best effort
            logger.warning("Failed to send WhatsApp ack for %s: %s", user_id, exc)
