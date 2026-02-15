"""Webhook routes for WhatsApp Cloud API callbacks."""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional, Set

from flask import Blueprint, jsonify, request

from config import settings
from conversation import default_engine
from whatsapp_client import client as whatsapp_client

webhook_bp = Blueprint("webhook", __name__)
logger = logging.getLogger(__name__)
conversation_engine = default_engine()

# Message deduplication cache (stores message IDs for 5 minutes)
_processed_messages: Set[str] = set()
_last_cleanup = time.time()
_CACHE_TTL = 300  # 5 minutes


@webhook_bp.route("/webhook", methods=["GET"])
def verify_webhook():
    """Meta challenge endpoint used during webhook registration."""
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == settings.verify_token:
        logger.info("Webhook verified successfully")
        return challenge or "", 200

    logger.warning("Webhook verification failed: mode=%s token=%s", mode, token)
    return "Forbidden", 403


@webhook_bp.route("/webhook", methods=["POST"])
def handle_message():
    """Receive WhatsApp message events and send a canned reply."""
    data = request.get_json(silent=True) or {}
    if data.get("object") != "whatsapp_business_account":
        return jsonify({"status": "ignored"}), 200

    try:
        # Periodic cleanup of old message IDs (every 5 minutes)
        global _last_cleanup, _processed_messages
        if time.time() - _last_cleanup > _CACHE_TTL:
            logger.debug("Cleaning up message deduplication cache (%d messages)", len(_processed_messages))
            _processed_messages.clear()
            _last_cleanup = time.time()
        
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                for message in value.get("messages", []):
                    user_id = message.get("from")
                    message_id = message.get("id")
                    body, msg_type, media_info = _extract_message_parts(message)
                    
                    if not user_id:
                        continue
                    
                    # Check for duplicate message (WhatsApp webhook retries)
                    if message_id and message_id in _processed_messages:
                        logger.debug("Skipping duplicate message: %s", message_id)
                        continue
                    
                    # Mark message as being processed
                    if message_id:
                        _processed_messages.add(message_id)
                        
                    logger.info(
                        "Incoming %s message from %s", msg_type, user_id
                    )
                    
                    # 1. Mark as read immediately (Blue ticks)
                    if message_id:
                        whatsapp_client.mark_as_read(message_id)
                    
                    # 2. Process the logic
                    reply = conversation_engine.handle_incoming(
                        user_id,
                        body,
                        message_type=msg_type,
                        media=media_info,
                    )
                    
                    # 3. Simulate natural typing delay (Reading + Typing time)
                    # Average reading: 200 wpm (0.3s per word)
                    # Average typing: 40 wpm (1.5s per word)
                    input_words = len((body or "").split())
                    output_words = len(reply.split())
                    
                    # Calculate delay: small base + reading time + 10% of typing time (since it's a bot)
                    # We don't want it to be TOO slow, just "natural"
                    delay = 0.5 + (input_words * 0.1) + (output_words * 0.05)
                    delay = min(max(1.0, delay), 4.0)  # Clamp between 1s and 4s
                    
                    time.sleep(delay)
                    
                    # 4. Send the response
                    whatsapp_client.send_text_message(user_id, reply)
    except Exception as exc:  # pragma: no cover - skeleton diagnostic
        logger.exception("Failed to process webhook: %s", exc)
        return jsonify({"status": "error"}), 500

    return jsonify({"status": "ok"}), 200


def _extract_message_parts(message: Dict[str, Any]) -> tuple[str, str, Optional[Dict[str, Any]]]:
    """Normalize incoming WhatsApp payloads."""

    msg_type = message.get("type", "text")
    media_info: Optional[Dict[str, Any]] = None

    if msg_type == "text":
        return message.get("text", {}).get("body", ""), msg_type, None

    if msg_type == "image":
        image = message.get("image", {})
        body = image.get("caption", "")
        media_info = {
            "media_id": image.get("id"),
            "kind": "image",
            "mime_type": image.get("mime_type"),
            "sha256": image.get("sha256"),
            "caption": image.get("caption"),
            "file_name": image.get("filename"),
        }
        return body, msg_type, media_info

    if msg_type in {"audio", "voice"}:
        audio = message.get("audio", {})
        media_info = {
            "media_id": audio.get("id"),
            "kind": "audio",
            "mime_type": audio.get("mime_type"),
            "sha256": audio.get("sha256"),
            "file_name": audio.get("filename"),
        }
        # Normalize voice notes to audio for downstream processing
        return "", "audio", media_info

    # Fallback for other message types - treat as plain text body when possible
    return message.get("text", {}).get("body", ""), "text", None
