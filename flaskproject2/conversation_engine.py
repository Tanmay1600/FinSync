# """Main conversation engine for WhatsApp bot."""
# from __future__ import annotations

# import logging
# from dataclasses import dataclass, field
# from datetime import datetime
# from typing import Any, Dict, Optional

# from models import ConversationState
# from services import InteractionError, InteractionService, auth_service, AuthError
# from services.card_processor import CardProcessor
# from services.gemini_service import get_gemini_service
# from config import settings

# # Tag mapping for stall interactions
# TAG_OPTIONS = {
#     1: {"text": "High Intent", "color": "red"},
#     2: {"text": "Interested", "color": "red"},
#     3: {"text": "Follow-up Needed", "color": "red"},
#     4: {"text": "Call Tomorrow", "color": "red"},
#     5: {"text": "Meeting Requested", "color": "red"},
#     6: {"text": "Referred Lead", "color": "red"},
#     7: {"text": "Exploring Options", "color": "yellow"},
#     8: {"text": "Met at Stall", "color": "yellow"},
#     9: {"text": "Networking Floor", "color": "yellow"},
#     10: {"text": "Business Owner", "color": "yellow"},
#     11: {"text": "HNI Client", "color": "green"},
#     12: {"text": "Wealth Management", "color": "green"},
#     13: {"text": "Tax Planning", "color": "green"},
#     14: {"text": "Mutual Funds", "color": "green"},
#     15: {"text": "Not Relevant", "color": "grey"},
# }

# RESPONSES: Dict[str, str] = {
#     "welcome": (
#         "👋 Welcome to your Field Interaction Assistant!\n\n"
#         "📸 *Send a visiting card image* for instant OCR processing\n"
#         "🎤 *Send a voice note* for AI transcription & analysis\n"
#         "📝 Type 'new' to start a form-based interaction\n"
#         "💡 Type 'help' to see all commands"
#     ),
#     "greeting": (
#         "👋 Hey there! I'm ready to capture interactions.\n\n"
#         "📸 Send a visiting card image for instant OCR\n"
#         "🎤 Send a voice note for AI transcription\n"
#         "📝 Or type 'new' to log a form-based interaction"
#     ),
#     "help": (
#         "ℹ️ *Commands*\n\n"
#         "• 📸 Send image – Process visiting card directly (auto-authenticates)\n"
#         "• 🎤 Send audio – Transcribe and analyze voice note\n"
#         "• hi / hello – Get a friendly greeting\n"
#         "• new – Start a form-based interaction (stall/field mode)\n"
#         "• login – Manually authenticate (optional, happens automatically)\n"
#         "• reset – Clear the session state\n"
#         "• help – Show this reference"
#     ),
#     "ask_mode": (
#         "📍 *Select interaction mode:*\n\n"
#         "1️⃣ stall – Form-based interaction (Name + Tags + Remarks)\n"
#         "2️⃣ field – Media-based interaction (Image/Audio upload)\n\n"
#         "Reply with: *stall* or *field*"
#     ),
#     "field_interaction_prompt": (
#         "📸 *Field Interaction Mode*\n\n"
#         "Please upload an *image* or *audio* file to document this interaction.\n\n"
#         "You can also include text or a caption with your upload."
#     ),
#     "processing_card": (
#         "📸 Processing your visiting card, extracting details..."
#     ),
#     "card_processed": (
#         "✅ Visiting card processed successfully!\n\n"
#         "Name: {name}\n"
#         "Phone: {phone}\n"
#         "Reference: {reference}"
#     ),
#     "ocr_failed": (
#         "❌ Unable to extract details from the visiting card.\n\n"
#         "Please ensure:\n"
#         "• Image is clear and well-lit\n"
#         "• Text is readable\n"
#         "• Card is fully visible in frame\n\n"
#         "Try taking another photo or type 'new' for manual entry."
#     ),
#     "gemini_not_configured": (
#         "⚠️ OCR service not configured.\n\n"
#         "Please contact admin to enable visiting card processing.\n"
#         "Or type 'new' for manual entry."
#     ),
#     "processing_audio": (
#         "🎤 Processing your voice note with Gemini AI..."
#     ),
#     "audio_processed": (
#         "✅ Voice note processed successfully!\n\n"
#         "Summary: {remarks}\n"
#         "Reference: {reference}"
#     ),
#     "transcription_failed": (
#         "❌ Unable to transcribe the audio.\n\n"
#         "Please ensure:\n"
#         "• Audio is clear with minimal background noise\n"
#         "• Speech is audible\n"
#         "• Audio file is not corrupted\n\n"
#         "Try recording again or type 'new' for manual entry."
#     ),
#     "new_interaction_prompt": (
#         "✅ Starting a new stall interaction.\n\n"
#         "Please provide the lead's *name*:"
#     ),
#     "invalid_mode": (
#         "❌ Invalid mode selection. Please reply with *stall* or *field*."
#     ),
#     "ask_tags": (
#         "📋 *Select tags* (comma-separated numbers):\n\n"
#         "🔴 High Priority:\n"
#         "1. High Intent\n"
#         "2. Interested\n"
#         "3. Follow-up Needed\n"
#         "4. Call Tomorrow\n"
#         "5. Meeting Requested\n"
#         "6. Referred Lead\n\n"
#         "🟡 Medium Priority:\n"
#         "7. Exploring Options\n"
#         "8. Met at Stall\n"
#         "9. Networking Floor\n"
#         "10. Business Owner\n\n"
#         "🟢 Qualified:\n"
#         "11. HNI Client\n"
#         "12. Wealth Management\n"
#         "13. Tax Planning\n"
#         "14. Mutual Funds\n\n"
#         "⚫ Other:\n"
#         "15. Not Relevant\n\n"
#         "Example: 1,3,8"
#     ),
#     "ask_remarks": (
#         "📝 Add any additional notes or remarks (or send 'skip'):"
#     ),
#     "invalid_tags": (
#         "❌ Invalid tag selection. Please send comma-separated numbers from 1-15.\n"
#         "Example: 1,3,8"
#     ),
#     "prompt_new_command": (
#         "📸 Send a visiting card image to capture details instantly\n\n"
#         "Or type 'hi' for help or 'new' to start a form-based interaction."
#     ),
#     "awaiting_interaction_invalid": (
#         "❗ Please send either text, an image, or a voice note for this interaction."
#     ),
#     "interaction_failed": (
#         "⚠️ Couldn't record the interaction. Error: {error}"
#     ),
#     "user_not_found": (
#         "❌ Your phone number is not registered in our system.\n\n"
#         "Please contact support to get access."
#     ),
#     "database_error": (
#         "⚠️ Temporary database connection issue. Please try again in a moment.\n\n"
#         "If the problem persists, contact support."
#     ),
#     "login_success": (
#         "✅ Authentication successful!\n\n"
#         "Your token is cached. Use 'new' to log interactions."
#     ),
#     "login_failed": (
#         "⚠️ Authentication failed: {error}"
#     ),
#     "auto_login_attempt": (
#         "🔐 Authenticating your number..."
#     ),
#     "interaction_created": (
#         "🎉 Stall interaction saved successfully!\n\n"
#         "Lead: {name}\n"
#         "Tags: {tags}\n"
#         "Reference: {reference}"
#     ),
# }

# logger = logging.getLogger(__name__)


# @dataclass
# class ConversationEngine:
#     """Main conversation engine responsible for simple command routing."""

#     sessions: Dict[str, ConversationState] = field(default_factory=dict)
#     interaction_service: InteractionService = field(default_factory=InteractionService)
#     card_processor: CardProcessor = field(default_factory=CardProcessor)

#     def __post_init__(self):
#         # Start background worker for queued visiting cards
#         self.card_processor.start()

#     def handle_incoming(
#         self,
#         user_id: str,
#         message: str,
#         *,
#         message_type: str = "text",
#         media: Optional[Dict[str, Any]] = None,
#     ) -> str:
#         """Handle incoming message from a user."""

#         normalized = (message or "").strip().lower()
#         session = self.sessions.setdefault(user_id, ConversationState())

#         # Handle images immediately - visiting card direct processing
#         if message_type == "image" and media:
#             text_payload = self._derive_text_payload(message, media)
#             return self._process_visiting_card(
#                 session=session,
#                 user_id=user_id,
#                 media=media,
#                 caption=text_payload,
#             )

#         # Handle audio immediately - voice note transcription and analysis
#         if message_type == "audio" and media:
#             text_payload = self._derive_text_payload(message, media)
#             return self._process_voice_note(
#                 session=session,
#                 user_id=user_id,
#                 media=media,
#                 caption=text_payload,
#             )

#         if message_type == "text" and normalized == "reset":
#             session.full_reset()
#             return _message("welcome")

#         if message_type == "text" and normalized in {"hi", "hello", "hey", "start"}:
#             session.reset()
#             session.state = "IDLE"
#             return _message("greeting")

#         if message_type == "text" and normalized == "help":
#             return _message("help")

#         if message_type == "text" and normalized == "login":
#             return self._handle_login(user_id, session)

#         if message_type == "text" and normalized == "new":
#             session.state = "AWAITING_MODE_SELECTION"
#             session.context["awaiting_since"] = datetime.utcnow().isoformat()
#             session.context["interaction_data"] = {}
#             return _message("ask_mode")

#         # Handle mode selection (stall or field)
#         if message_type == "text" and session.state == "AWAITING_MODE_SELECTION":
#             return self._handle_mode_selection(session, normalized)

#         # Handle multi-step form
#         if session.state == "AWAITING_NAME":
#             return self._handle_name_input(session, message)

#         if session.state == "AWAITING_TAG_SELECTION":
#             return self._handle_tag_selection(session, message)

#         if session.state == "AWAITING_REMARKS":
#             return self._handle_remarks_input(session, user_id, message)

#         if session.state == "AWAITING_INTERACTION":
#             return self._handle_interaction_payload(
#                 session=session,
#                 user_id=user_id,
#                 message=message,
#                 message_type=message_type,
#                 media=media,
#             )

#         if message_type != "text":
#             return _message("prompt_new_command")

#         return _message("prompt_new_command")

#     # ------------------------------------------------------------------
#     def _handle_mode_selection(self, session: ConversationState, mode: str) -> str:
#         """Handle mode selection between stall and field."""
#         if mode == "stall":
#             session.state = "AWAITING_NAME"
#             return _message("new_interaction_prompt")
#         elif mode == "field":
#             session.state = "AWAITING_INTERACTION"
#             return _message("field_interaction_prompt")
#         else:
#             return _message("invalid_mode")

#     def _handle_login(self, user_id: str, session: ConversationState) -> str:
#         """Authenticate user and store token in session."""
#         try:
#             token = auth_service.get_user_token(user_id)
#             if not token:
#                 return _message("user_not_found")
            
#             # Store token and mark as authenticated
#             session.context["token"] = token
#             session.context["authenticated"] = True
#             logger.info("User %s authenticated successfully", user_id)
#             return _message("login_success")
            
#         except AuthError as exc:
#             logger.error("Login failed for %s: %s", user_id, exc)
#             return _message("login_failed", error=str(exc))

#     def _handle_name_input(self, session: ConversationState, name: str) -> str:
#         """Handle lead name input."""
#         name = name.strip()
#         if len(name) < 2 or len(name) > 120:
#             return "❌ Name must be between 2-120 characters. Please try again:"
        
#         session.context["interaction_data"]["name"] = name
#         session.state = "AWAITING_TAG_SELECTION"
#         return _message("ask_tags")

#     def _handle_tag_selection(self, session: ConversationState, selection: str) -> str:
#         """Handle tag selection input."""
#         # Parse comma-separated numbers
#         try:
#             selected_numbers = [int(n.strip()) for n in selection.split(",") if n.strip()]
            
#             # Validate all are in range 1-15
#             if not selected_numbers or not all(1 <= n <= 15 for n in selected_numbers):
#                 return _message("invalid_tags")
            
#             # Store tag IDs
#             session.context["interaction_data"]["tagIds"] = selected_numbers
#             session.state = "AWAITING_REMARKS"
#             return _message("ask_remarks")
            
#         except ValueError:
#             return _message("invalid_tags")

#     def _handle_remarks_input(self, session: ConversationState, user_id: str, remarks: str) -> str:
#         """Handle remarks input and create interaction."""
#         remarks = remarks.strip()
        
#         # Allow skip
#         if remarks.lower() != "skip":
#             session.context["interaction_data"]["remarks"] = remarks
        
#         # Now create the interaction
#         return self._create_stall_interaction(session, user_id)

#     def _create_stall_interaction(self, session: ConversationState, user_id: str) -> str:
#         """Create stall interaction from collected data."""
#         data = session.context.get("interaction_data", {})
        
#         # Get token from session or authenticate
#         user_token = session.context.get("token")
#         if not user_token:
#             logger.info("No cached token for %s, authenticating...", user_id)
#             try:
#                 user_token = auth_service.get_user_token(user_id)
#                 if not user_token:
#                     session.reset()
#                     return _message("user_not_found")
#                 # Cache token in session
#                 session.context["token"] = user_token
#                 session.context["authenticated"] = True
#             except AuthError as exc:
#                 logger.error("Auto-login failed for %s: %s", user_id, exc)
#                 return _message("login_failed", error=str(exc))

#         try:
#             api_response = self.interaction_service.create_interaction(
#                 phone_number=user_id,
#                 name=data.get("name"),
#                 tag_ids=data.get("tagIds", []),
#                 remarks=data.get("remarks"),
#                 mode="stall",
#                 user_token=user_token,
#             )
#         except InteractionError as exc:
#             logger.error("Stall interaction creation failed: %s", exc)
#             error_msg = str(exc).lower()
            
#             # Check if auth expired or invalid - clear cache and retry
#             if "401" in error_msg or "unauthorized" in error_msg or "403" in error_msg or "forbidden" in error_msg:
#                 logger.warning("Token expired for %s, clearing cache", user_id)
#                 session.context.pop("token", None)
#                 session.context["authenticated"] = False
#                 # Clear from auth service cache too
#                 auth_service.clear_token_cache(user_id)
#                 return _message("login_failed", error="Authentication expired. Please send 'login' again.")
            
#             return _message("interaction_failed", error=str(exc))

#         session.reset()
#         reference = self._extract_interaction_reference(api_response)
        
#         # Format tag names for display
#         selected_tag_ids = data.get("tagIds", [])
#         tag_names = ", ".join([TAG_OPTIONS[tid]["text"] for tid in selected_tag_ids if tid in TAG_OPTIONS])
        
#         return _message(
#             "interaction_created",
#             name=data.get("name", "Unknown"),
#             tags=tag_names,
#             reference=reference
#         )

#     def _handle_interaction_payload(
#         self,
#         *,
#         session: ConversationState,
#         user_id: str,
#         message: str,
#         message_type: str,
#         media: Optional[Dict[str, Any]],
#     ) -> str:
#         supported_types = {"text", "image", "audio"}
#         if message_type not in supported_types:
#             return _message("awaiting_interaction_invalid")

#         text_payload = self._derive_text_payload(message, media)
#         media_payload = media if message_type in {"image", "audio"} else None

#         # For images, process immediately with Gemini extraction and auto-auth
#         if message_type == "image" and media_payload:
#             return self._process_visiting_card(
#                 session=session,
#                 user_id=user_id,
#                 media=media_payload,
#                 caption=text_payload,
#             )

#         # Get token from session or authenticate
#         user_token = self._get_or_refresh_token(session, user_id)
#         if not user_token:
#             session.reset()
#             return _message("user_not_found")

#         # Try to create interaction, auto-retry once if auth fails
#         try:
#             api_response = self.interaction_service.create_interaction(
#                 phone_number=user_id,
#                 message_type=message_type,
#                 text=text_payload,
#                 media=media_payload,
#                 user_token=user_token,
#             )
#         except InteractionError as exc:
#             # Check if auth expired - clear cache and retry once
#             if self._is_auth_error(exc):
#                 logger.warning("Token expired for %s, re-authenticating...", user_id)
#                 session.context.pop("token", None)
#                 auth_service.clear_token_cache(user_id)
                
#                 # Retry with fresh token
#                 user_token = self._get_or_refresh_token(session, user_id)
#                 if not user_token:
#                     session.reset()
#                     return _message("user_not_found")
                
#                 try:
#                     api_response = self.interaction_service.create_interaction(
#                         phone_number=user_id,
#                         message_type=message_type,
#                         text=text_payload,
#                         media=media_payload,
#                         user_token=user_token,
#                     )
#                 except InteractionError as retry_exc:
#                     logger.error("Retry failed: %s", retry_exc)
#                     return _message("interaction_failed", error=str(retry_exc))
#             else:
#                 return _message("interaction_failed", error=str(exc))

#         session.reset()
#         reference = self._extract_interaction_reference(api_response)
#         return _message("interaction_created", reference=reference)

#     def _process_visiting_card(
#         self,
#         *,
#         session: ConversationState,
#         user_id: str,
#         media: Dict[str, Any],
#         caption: str,
#     ) -> str:
#         """Process visiting card image immediately with Gemini extraction and auto-auth."""
#         try:
#             media_id = media.get("media_id")
#             if not media_id:
#                 return _message("interaction_failed", error="Missing media ID")

#             # 1. Download WhatsApp media
#             logger.info("Downloading visiting card media for %s", user_id)
#             content_bytes, mime_type = self.interaction_service._download_whatsapp_media(media_id)

#             # 2. Upload to Cloudinary
#             logger.info("Uploading to Cloudinary...")
#             image_url = self.interaction_service._upload_to_cloudinary(
#                 content_bytes,
#                 resource_type="image",
#                 filename=media.get("file_name"),
#             )

#             # 3. COMPULSORY: Extract data via Gemini OCR
#             gemini = get_gemini_service()
#             if not gemini.enabled:
#                 session.reset()
#                 return _message("gemini_not_configured")
            
#             logger.info("Performing OCR extraction via Gemini...")
#             try:
#                 extracted = gemini.extract_business_card(content_bytes, mime_type)
#                 logger.info("Gemini OCR successful: %s", extracted)
#             except Exception as exc:
#                 logger.error("Gemini OCR failed: %s", exc)
#                 session.reset()
#                 return _message("ocr_failed")

#             # 4. Build payload with EXTRACTED data (mandatory)
#             name = extracted.get("name")
#             phone = extracted.get("phone")
#             email = extracted.get("email")
#             company = extracted.get("company")
#             designation = extracted.get("designation")
            
#             # Build remarks from extracted fields
#             remarks_parts = []
#             if company:
#                 remarks_parts.append(company)
#             if designation:
#                 remarks_parts.append(designation)
#             if extracted.get("remarks"):
#                 remarks_parts.append(extracted["remarks"])
#             if caption:
#                 remarks_parts.append(caption)
            
#             remarks = " | ".join(remarks_parts) if remarks_parts else "Visiting card captured via WhatsApp"
            
#             # Validate extracted phone number (must be 7-20 chars, reasonable format)
#             extracted_phone = phone
#             if phone:
#                 # Remove common formatting characters temporarily to check length
#                 phone_digits = ''.join(c for c in phone if c.isdigit())
#                 # Valid phone should have 7-15 digits typically
#                 if len(phone_digits) < 7 or len(phone_digits) > 15:
#                     logger.warning("Extracted phone '%s' from card seems invalid (digits: %d), using WhatsApp number", phone, len(phone_digits))
#                     phone = user_id
#                     if extracted_phone and name:
#                         # Add extracted phone to remarks if we had a name
#                         remarks = f"Card phone: {extracted_phone} | {remarks}"
            
#             # Fallback: use WhatsApp phone if card phone not extracted
#             if not phone:
#                 phone = user_id
#                 logger.warning("No phone on card, using WhatsApp number: %s", user_id)
            
#             # Fallback: use generated name if not extracted
#             if not name:
#                 name = f"WhatsApp Lead {user_id[-4:]}"
#                 logger.warning("No name on card, using fallback: %s", name)

#             # Normalize phone
#             if not phone.startswith("+"):
#                 phone = f"+{phone}"

#             # 5. Authenticate (with auto-refresh)
#             user_token = self._get_or_refresh_token(session, user_id)
#             if not user_token:
#                 # Check if it was a database error vs user not found BEFORE resetting
#                 last_error = str(session.context.get("last_error", "")).lower()
#                 error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
#                 session.reset()
#                 return _message(error_type)

#             # 6. Create interaction (with auto-retry on auth failure)
#             payload = {
#                 "name": name,
#                 "mobNo": phone,
#                 "tagIds": self.interaction_service.default_tag_ids,
#                 "mode": "field",
#                 "remarks": remarks,
#                 "image_url": image_url,
#             }
#             if email:
#                 payload["email"] = email

#             try:
#                 api_response = self.interaction_service.post_interaction(
#                     payload, auth_token=user_token
#                 )
#             except InteractionError as exc:
#                 # Auto-retry once if auth expired
#                 if self._is_auth_error(exc):
#                     logger.warning("Token expired, re-authenticating and retrying...")
#                     session.context.pop("token", None)
#                     auth_service.clear_token_cache(user_id)
                    
#                     user_token = self._get_or_refresh_token(session, user_id)
#                     if not user_token:
#                         last_error = str(session.context.get("last_error", "")).lower()
#                         error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
#                         return _message(error_type)
                    
#                     api_response = self.interaction_service.post_interaction(
#                         payload, auth_token=user_token
#                     )
#                 else:
#                     raise

#             session.reset()
#             reference = self._extract_interaction_reference(api_response)
            
#             return _message(
#                 "card_processed",
#                 name=name,
#                 phone=phone,
#                 reference=reference,
#             )

#         except Exception as exc:
#             logger.exception("Visiting card processing failed: %s", exc)
#             session.reset()
#             return _message("interaction_failed", error=str(exc))

#     def _process_voice_note(
#         self,
#         *,
#         session: ConversationState,
#         user_id: str,
#         media: Dict[str, Any],
#         caption: str,
#     ) -> str:
#         """Process voice note with Gemini audio transcription and analysis."""
#         try:
#             media_id = media.get("media_id")
#             if not media_id:
#                 return _message("interaction_failed", error="Missing media ID")

#             # 1. Download WhatsApp audio
#             logger.info("Downloading audio media for %s", user_id)
#             content_bytes, mime_type = self.interaction_service._download_whatsapp_media(media_id)

#             # 2. Upload audio to Cloudinary first (for storage)
#             logger.info("Uploading audio to Cloudinary...")
#             audio_url = self.interaction_service._upload_to_cloudinary(
#                 content_bytes,
#                 resource_type="video",  # WhatsApp audio is treated as video by Cloudinary
#                 filename=media.get("file_name") or "voice_note.ogg",
#             )

#             # 3. Transcribe and analyze with Gemini in ONE API call
#             gemini = get_gemini_service()
#             if not gemini.enabled:
#                 session.reset()
#                 return _message("gemini_not_configured")
            
#             logger.info("Transcribing and analyzing audio with Gemini...")
#             try:
#                 result = gemini.transcribe_and_analyze_audio(content_bytes, mime_type)
#                 logger.info("Gemini processing successful: transcript=%s, analysis=%s", 
#                            result.get("transcript", "")[:100], 
#                            {k: v for k, v in result.items() if k != "transcript"})
#             except Exception as exc:
#                 logger.error("Gemini audio processing failed: %s", exc)
#                 session.reset()
#                 return _message("transcription_failed")

#             # 4. Extract data from Gemini response
#             transcript = result.get("transcript", "")
#             name = result.get("name")
#             phone = result.get("phone")
#             email = result.get("email")
#             company = result.get("company")
            
#             # Build remarks from Gemini analysis
#             remarks_parts = []
#             if result.get("remarks"):
#                 remarks_parts.append(result["remarks"])
#             else:
#                 # Use first 150 chars of transcript if no summary
#                 remarks_parts.append(transcript[:150] + ("..." if len(transcript) > 150 else ""))
            
#             if caption:
#                 remarks_parts.append(f"Caption: {caption}")
            
#             remarks = " | ".join(remarks_parts)
            
#             # Validate extracted phone number (must be 7-20 chars, reasonable format)
#             extracted_phone = phone
#             if phone:
#                 # Remove common formatting characters temporarily to check length
#                 phone_digits = ''.join(c for c in phone if c.isdigit())
#                 # Valid phone should have 7-15 digits typically
#                 if len(phone_digits) < 7 or len(phone_digits) > 15:
#                     logger.warning("Extracted phone '%s' seems invalid (digits: %d), using WhatsApp number", phone, len(phone_digits))
#                     phone = user_id
#                     if extracted_phone and name:
#                         # Add extracted phone to remarks if we had a name
#                         remarks = f"Mentioned phone: {extracted_phone} | {remarks}"
            
#             # Fallback: use WhatsApp phone if not extracted from audio
#             if not phone:
#                 phone = user_id
#                 logger.warning("No phone in audio, using WhatsApp number: %s", user_id)
            
#             # Fallback: use generated name if not extracted
#             if not name:
#                 name = f"Voice Lead {user_id[-4:]}"
#                 logger.warning("No name in audio, using fallback: %s", name)

#             # Normalize phone
#             if not phone.startswith("+"):
#                 phone = f"+{phone}"

#             # 5. Authenticate (with auto-refresh)
#             user_token = self._get_or_refresh_token(session, user_id)
#             if not user_token:
#                 # Check if it was a database error vs user not found BEFORE resetting
#                 last_error = str(session.context.get("last_error", "")).lower()
#                 error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
#                 session.reset()
#                 return _message(error_type)

#             # 6. Create interaction (with auto-retry on auth failure)
#             payload = {
#                 "name": name,
#                 "mobNo": phone,
#                 "tagIds": self.interaction_service.default_tag_ids,
#                 "mode": "field",
#                 "remarks": f"[AUDIO] {remarks}\n\nTranscript: {transcript}",
#                 "audio_note_url": audio_url,  # Store audio URL in audio_note_url field
#             }
#             if email:
#                 payload["email"] = email

#             try:
#                 api_response = self.interaction_service.post_interaction(
#                     payload, auth_token=user_token
#                 )
#             except InteractionError as exc:
#                 # Auto-retry once if auth expired
#                 if self._is_auth_error(exc):
#                     logger.warning("Token expired, re-authenticating and retrying...")
#                     session.context.pop("token", None)
#                     auth_service.clear_token_cache(user_id)
                    
#                     user_token = self._get_or_refresh_token(session, user_id)
#                     if not user_token:
#                         last_error = str(session.context.get("last_error", "")).lower()
#                         error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
#                         return _message(error_type)
                    
#                     api_response = self.interaction_service.post_interaction(
#                         payload, auth_token=user_token
#                     )
#                 else:
#                     raise

#             session.reset()
#             reference = self._extract_interaction_reference(api_response)
            
#             return _message(
#                 "audio_processed",
#                 remarks=result.get("remarks", transcript[:100]),
#                 reference=reference,
#             )

#         except Exception as exc:
#             logger.exception("Voice note processing failed: %s", exc)
#             session.reset()
#             return _message("interaction_failed", error=str(exc))

#     def _get_or_refresh_token(self, session: ConversationState, user_id: str, retry_count: int = 0) -> Optional[str]:
#         """Get token from cache or authenticate user with retry logic for DB errors."""
#         user_token = session.context.get("token")
#         if user_token:
#             return user_token

#         logger.info("No cached token for %s, authenticating...", user_id)
#         try:
#             user_token = auth_service.get_user_token(user_id)
#             if user_token:
#                 session.context["token"] = user_token
#                 session.context["authenticated"] = True
#                 session.context.pop("last_error", None)  # Clear previous errors
#             return user_token
#         except AuthError as exc:
#             error_msg = str(exc).lower()
#             # Store the error for later checking
#             session.context["last_error"] = str(exc)
            
#             # Check if it's a database connection error
#             if any(keyword in error_msg for keyword in ["operationalerror", "server closed", "connection", "database"]) and retry_count < 2:
#                 logger.warning("Database connection error, retrying in 2 seconds... (attempt %d/2)", retry_count + 1)
#                 import time
#                 time.sleep(2)
#                 return self._get_or_refresh_token(session, user_id, retry_count + 1)
            
#             logger.error("Authentication failed for %s: %s", user_id, exc)
#             return None

#     @staticmethod
#     def _is_auth_error(exc: InteractionError) -> bool:
#         """Check if error is auth-related."""
#         error_msg = str(exc).lower()
#         return any(keyword in error_msg for keyword in ["401", "unauthorized", "403", "forbidden", "token"])

#     @staticmethod
#     def _derive_text_payload(message: str, media: Optional[Dict[str, Any]]) -> str:
#         if message:
#             return message
#         if media and media.get("caption"):
#             return media["caption"]
#         return ""

#     @staticmethod
#     def _extract_interaction_reference(api_response: Dict[str, Any]) -> str:
#         data = api_response.get("data") if isinstance(api_response, dict) else None
#         reference = None
#         if isinstance(data, dict):
#             reference = data.get("id") or data.get("lead_id")
#         return str(reference or "success")


# def default_engine() -> ConversationEngine:
#     """Create and return the default conversation engine instance."""
#     return ConversationEngine()


# def _message(key: str, **kwargs: Any) -> str:
#     template = RESPONSES.get(key, RESPONSES.get("prompt_new_command", ""))
#     if kwargs:
#         try:
#             return template.format(**kwargs)
#         except KeyError:
#             return template
#     return template
"""Main conversation engine for WhatsApp bot."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

from models import ConversationState
from services import InteractionError, InteractionService, auth_service, AuthError
from services.card_processor import CardProcessor
from services.gemini_service import get_gemini_service
from config import settings

# Tag mapping for stall interactions
TAG_OPTIONS = {
    1: {"text": "High Intent", "color": "red"},
    2: {"text": "Interested", "color": "red"},
    3: {"text": "Follow-up Needed", "color": "red"},
    4: {"text": "Call Tomorrow", "color": "red"},
    5: {"text": "Meeting Requested", "color": "red"},
    6: {"text": "Referred Lead", "color": "red"},
    7: {"text": "Exploring Options", "color": "yellow"},
    8: {"text": "Met at Stall", "color": "yellow"},
    9: {"text": "Networking Floor", "color": "yellow"},
    10: {"text": "Business Owner", "color": "yellow"},
    11: {"text": "HNI Client", "color": "green"},
    12: {"text": "Wealth Management", "color": "green"},
    13: {"text": "Tax Planning", "color": "green"},
    14: {"text": "Mutual Funds", "color": "green"},
    15: {"text": "Not Relevant", "color": "grey"},
}

RESPONSES: Dict[str, str] = {
    "welcome": (
        "👋 Welcome to your Field Interaction Assistant!\n\n"
        "📸 *Send a visiting card image* for instant OCR processing\n"
        "🎤 *Send a voice note* for AI transcription & analysis\n"
        "📝 *Send text with contact details* (Name, Email, Mobile, Remarks) for quick capture\n"
        "📋 Type 'new' to start a form-based interaction\n"
        "💡 Type 'help' to see all commands"
    ),
    "greeting": (
        "👋 Hey there! I'm ready to capture interactions.\n\n"
        "📸 Send a visiting card image for instant OCR\n"
        "🎤 Send a voice note for AI transcription\n"
        "📝 Send text with contact details for quick entry\n"
        "📋 Or type 'new' to log a form-based interaction"
    ),
    "help": (
        "ℹ️ *Commands*\n\n"
        "• 📸 Send image – Process visiting card directly (auto-authenticates)\n"
        "• 🎤 Send audio – Transcribe and analyze voice note\n"
        "• 📝 Send text – Parse contact details (Name, Email, Mobile, Remarks)\n"
        "• hi / hello – Get a friendly greeting\n"
        "• new – Start a form-based interaction (stall/field mode)\n"
        "• login – Manually authenticate (optional, happens automatically)\n"
        "• reset – Clear the session state\n"
        "• help – Show this reference"
    ),
    "ask_mode": (
        "📍 *Select interaction mode:*\n\n"
        "1️⃣ stall – Form-based interaction (Name + Tags + Remarks)\n"
        "2️⃣ field – Media-based interaction (Image/Audio upload)\n\n"
        "Reply with: *stall* or *field*"
    ),
    "field_interaction_prompt": (
        "📸 *Field Interaction Mode*\n\n"
        "Please upload an *image* or *audio* file to document this interaction.\n\n"
        "You can also include text or a caption with your upload."
    ),
    "processing_card": (
        "📸 Processing your visiting card, extracting details..."
    ),
    "card_processed": (
        "✅ Visiting card processed successfully!\n\n"
        "Name: {name}\n"
        "Phone: {phone}\n"
        "Reference: {reference}"
    ),
    "ocr_failed": (
        "❌ Unable to extract details from the visiting card.\n\n"
        "Please ensure:\n"
        "• Image is clear and well-lit\n"
        "• Text is readable\n"
        "• Card is fully visible in frame\n\n"
        "Try taking another photo or type 'new' for manual entry."
    ),
    "gemini_not_configured": (
        "⚠️ OCR service not configured.\n\n"
        "Please contact admin to enable visiting card processing.\n"
        "Or type 'new' for manual entry."
    ),
    "processing_audio": (
        "🎤 Processing your voice note with Gemini AI..."
    ),
    "audio_processed": (
        "✅ Voice note processed successfully!\n\n"
        "Summary: {remarks}\n"
        "Reference: {reference}"
    ),
    "transcription_failed": (
        "❌ Unable to transcribe the audio.\n\n"
        "Please ensure:\n"
        "• Audio is clear with minimal background noise\n"
        "• Speech is audible\n"
        "• Audio file is not corrupted\n\n"
        "Try recording again or type 'new' for manual entry."
    ),
    "processing_text_card": (
        "📝 Processing your text-based visiting card..."
    ),
    "text_card_processed": (
        "✅ Text visiting card processed successfully!\n\n"
        "Name: {name}\n"
        "Phone: {phone}\n"
        "Reference: {reference}"
    ),
    "text_card_parse_failed": (
        "❌ Unable to extract details from the text.\n\n"
        "Please format your message like:\n"
        "Name: John Doe\n"
        "Email: john@example.com\n"
        "Mobile: +1234567890\n"
        "Remarks: Met at conference\n\n"
        "Or type 'new' for manual entry."
    ),
    "new_interaction_prompt": (
        "✅ Starting a new stall interaction.\n\n"
        "Please provide the lead's *name*:"
    ),
    "invalid_mode": (
        "❌ Invalid mode selection. Please reply with *stall* or *field*."
    ),
    "ask_tags": (
        "📋 *Select tags* (comma-separated numbers):\n\n"
        "🔴 High Priority:\n"
        "1. High Intent\n"
        "2. Interested\n"
        "3. Follow-up Needed\n"
        "4. Call Tomorrow\n"
        "5. Meeting Requested\n"
        "6. Referred Lead\n\n"
        "🟡 Medium Priority:\n"
        "7. Exploring Options\n"
        "8. Met at Stall\n"
        "9. Networking Floor\n"
        "10. Business Owner\n\n"
        "🟢 Qualified:\n"
        "11. HNI Client\n"
        "12. Wealth Management\n"
        "13. Tax Planning\n"
        "14. Mutual Funds\n\n"
        "⚫ Other:\n"
        "15. Not Relevant\n\n"
        "Example: 1,3,8"
    ),
    "ask_remarks": (
        "📝 Add any additional notes or remarks (or send 'skip'):"
    ),
    "invalid_tags": (
        "❌ Invalid tag selection. Please send comma-separated numbers from 1-15.\n"
        "Example: 1,3,8"
    ),
    "prompt_new_command": (
        "📸 Send a visiting card image to capture details instantly\n\n"
        "Or type 'hi' for help or 'new' to start a form-based interaction."
    ),
    "awaiting_interaction_invalid": (
        "❗ Please send either text, an image, or a voice note for this interaction."
    ),
    "interaction_failed": (
        "⚠️ Couldn't record the interaction. Error: {error}"
    ),
    "user_not_found": (
        "❌ Your phone number is not registered in our system.\n\n"
        "Please contact support to get access."
    ),
    "database_error": (
        "⚠️ Temporary database connection issue. Please try again in a moment.\n\n"
        "If the problem persists, contact support."
    ),
    "login_success": (
        "✅ Authentication successful!\n\n"
        "Your token is cached. Use 'new' to log interactions."
    ),
    "login_failed": (
        "⚠️ Authentication failed: {error}"
    ),
    "auto_login_attempt": (
        "🔐 Authenticating your number..."
    ),
    "interaction_created": (
        "🎉 Stall interaction saved successfully!\n\n"
        "Lead: {name}\n"
        "Tags: {tags}\n"
        "Reference: {reference}"
    ),
}

logger = logging.getLogger(__name__)


@dataclass
class ConversationEngine:
    """Main conversation engine responsible for simple command routing."""

    sessions: Dict[str, ConversationState] = field(default_factory=dict)
    interaction_service: InteractionService = field(default_factory=InteractionService)
    card_processor: CardProcessor = field(default_factory=CardProcessor)

    def __post_init__(self):
        # Start background worker for queued visiting cards
        self.card_processor.start()

    def handle_incoming(
        self,
        user_id: str,
        message: str,
        *,
        message_type: str = "text",
        media: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Handle incoming message from a user."""

        normalized = (message or "").strip().lower()
        session = self.sessions.setdefault(user_id, ConversationState())

        # Handle images immediately - visiting card direct processing
        if message_type == "image" and media:
            text_payload = self._derive_text_payload(message, media)
            return self._process_visiting_card(
                session=session,
                user_id=user_id,
                media=media,
                caption=text_payload,
            )

        # Handle audio immediately - voice note transcription and analysis
        if message_type == "audio" and media:
            text_payload = self._derive_text_payload(message, media)
            return self._process_voice_note(
                session=session,
                user_id=user_id,
                media=media,
                caption=text_payload,
            )

        # Handle text-based visiting card - detect structured contact info in text
        # Only process if not in the middle of a form flow
        if (
            message_type == "text" 
            and session.state in {"IDLE", None, ""}
            and message 
            and self._is_text_visiting_card(message)
        ):
            return self._process_text_visiting_card(
                session=session,
                user_id=user_id,
                message=message,
            )

        if message_type == "text" and normalized == "reset":
            session.full_reset()
            return _message("welcome")

        if message_type == "text" and normalized in {"hi", "hello", "hey", "start"}:
            session.reset()
            session.state = "IDLE"
            return _message("greeting")

        if message_type == "text" and normalized == "help":
            return _message("help")

        if message_type == "text" and normalized == "login":
            return self._handle_login(user_id, session)

        if message_type == "text" and normalized == "new":
            session.state = "AWAITING_MODE_SELECTION"
            session.context["awaiting_since"] = datetime.utcnow().isoformat()
            session.context["interaction_data"] = {}
            return _message("ask_mode")

        # Handle mode selection (stall or field)
        if message_type == "text" and session.state == "AWAITING_MODE_SELECTION":
            return self._handle_mode_selection(session, normalized)

        # Handle multi-step form
        if session.state == "AWAITING_NAME":
            return self._handle_name_input(session, message)

        if session.state == "AWAITING_TAG_SELECTION":
            return self._handle_tag_selection(session, message)

        if session.state == "AWAITING_REMARKS":
            return self._handle_remarks_input(session, user_id, message)

        if session.state == "AWAITING_INTERACTION":
            return self._handle_interaction_payload(
                session=session,
                user_id=user_id,
                message=message,
                message_type=message_type,
                media=media,
            )

        if message_type != "text":
            return _message("prompt_new_command")

        return _message("prompt_new_command")

    # ------------------------------------------------------------------
    def _handle_mode_selection(self, session: ConversationState, mode: str) -> str:
        """Handle mode selection between stall and field."""
        if mode == "stall":
            session.state = "AWAITING_NAME"
            return _message("new_interaction_prompt")
        elif mode == "field":
            session.state = "AWAITING_INTERACTION"
            return _message("field_interaction_prompt")
        else:
            return _message("invalid_mode")

    def _handle_login(self, user_id: str, session: ConversationState) -> str:
        """Authenticate user and store token in session."""
        try:
            token = auth_service.get_user_token(user_id)
            if not token:
                return _message("user_not_found")
            
            # Store token and mark as authenticated
            session.context["token"] = token
            session.context["authenticated"] = True
            logger.info("User %s authenticated successfully", user_id)
            return _message("login_success")
            
        except AuthError as exc:
            logger.error("Login failed for %s: %s", user_id, exc)
            return _message("login_failed", error=str(exc))

    def _handle_name_input(self, session: ConversationState, name: str) -> str:
        """Handle lead name input."""
        name = name.strip()
        if len(name) < 2 or len(name) > 120:
            return "❌ Name must be between 2-120 characters. Please try again:"
        
        session.context["interaction_data"]["name"] = name
        session.state = "AWAITING_TAG_SELECTION"
        return _message("ask_tags")

    def _handle_tag_selection(self, session: ConversationState, selection: str) -> str:
        """Handle tag selection input."""
        # Parse comma-separated numbers
        try:
            selected_numbers = [int(n.strip()) for n in selection.split(",") if n.strip()]
            
            # Validate all are in range 1-15
            if not selected_numbers or not all(1 <= n <= 15 for n in selected_numbers):
                return _message("invalid_tags")
            
            # Store tag IDs
            session.context["interaction_data"]["tagIds"] = selected_numbers
            session.state = "AWAITING_REMARKS"
            return _message("ask_remarks")
            
        except ValueError:
            return _message("invalid_tags")

    def _handle_remarks_input(self, session: ConversationState, user_id: str, remarks: str) -> str:
        """Handle remarks input and create interaction."""
        remarks = remarks.strip()
        
        # Allow skip
        if remarks.lower() != "skip":
            session.context["interaction_data"]["remarks"] = remarks
        
        # Now create the interaction
        return self._create_stall_interaction(session, user_id)

    def _create_stall_interaction(self, session: ConversationState, user_id: str) -> str:
        """Create stall interaction from collected data."""
        data = session.context.get("interaction_data", {})
        
        # Get token from session or authenticate
        user_token = session.context.get("token")
        if not user_token:
            logger.info("No cached token for %s, authenticating...", user_id)
            try:
                user_token = auth_service.get_user_token(user_id)
                if not user_token:
                    session.reset()
                    return _message("user_not_found")
                # Cache token in session
                session.context["token"] = user_token
                session.context["authenticated"] = True
            except AuthError as exc:
                logger.error("Auto-login failed for %s: %s", user_id, exc)
                return _message("login_failed", error=str(exc))

        try:
            api_response = self.interaction_service.create_interaction(
                phone_number=user_id,
                name=data.get("name"),
                tag_ids=data.get("tagIds", []),
                remarks=data.get("remarks"),
                mode="stall",
                user_token=user_token,
            )
        except InteractionError as exc:
            logger.error("Stall interaction creation failed: %s", exc)
            error_msg = str(exc).lower()
            
            # Check if auth expired or invalid - clear cache and retry
            if "401" in error_msg or "unauthorized" in error_msg or "403" in error_msg or "forbidden" in error_msg:
                logger.warning("Token expired for %s, clearing cache", user_id)
                session.context.pop("token", None)
                session.context["authenticated"] = False
                # Clear from auth service cache too
                auth_service.clear_token_cache(user_id)
                return _message("login_failed", error="Authentication expired. Please send 'login' again.")
            
            return _message("interaction_failed", error=str(exc))

        session.reset()
        reference = self._extract_interaction_reference(api_response)
        
        # Format tag names for display
        selected_tag_ids = data.get("tagIds", [])
        tag_names = ", ".join([TAG_OPTIONS[tid]["text"] for tid in selected_tag_ids if tid in TAG_OPTIONS])
        
        return _message(
            "interaction_created",
            name=data.get("name", "Unknown"),
            tags=tag_names,
            reference=reference
        )

    def _handle_interaction_payload(
        self,
        *,
        session: ConversationState,
        user_id: str,
        message: str,
        message_type: str,
        media: Optional[Dict[str, Any]],
    ) -> str:
        supported_types = {"text", "image", "audio"}
        if message_type not in supported_types:
            return _message("awaiting_interaction_invalid")

        text_payload = self._derive_text_payload(message, media)
        media_payload = media if message_type in {"image", "audio"} else None

        # For images, process immediately with Gemini extraction and auto-auth
        if message_type == "image" and media_payload:
            return self._process_visiting_card(
                session=session,
                user_id=user_id,
                media=media_payload,
                caption=text_payload,
            )

        # Get token from session or authenticate
        user_token = self._get_or_refresh_token(session, user_id)
        if not user_token:
            session.reset()
            return _message("user_not_found")

        # Try to create interaction, auto-retry once if auth fails
        try:
            api_response = self.interaction_service.create_interaction(
                phone_number=user_id,
                message_type=message_type,
                text=text_payload,
                media=media_payload,
                user_token=user_token,
            )
        except InteractionError as exc:
            # Check if auth expired - clear cache and retry once
            if self._is_auth_error(exc):
                logger.warning("Token expired for %s, re-authenticating...", user_id)
                session.context.pop("token", None)
                auth_service.clear_token_cache(user_id)
                
                # Retry with fresh token
                user_token = self._get_or_refresh_token(session, user_id)
                if not user_token:
                    session.reset()
                    return _message("user_not_found")
                
                try:
                    api_response = self.interaction_service.create_interaction(
                        phone_number=user_id,
                        message_type=message_type,
                        text=text_payload,
                        media=media_payload,
                        user_token=user_token,
                    )
                except InteractionError as retry_exc:
                    logger.error("Retry failed: %s", retry_exc)
                    return _message("interaction_failed", error=str(retry_exc))
            else:
                return _message("interaction_failed", error=str(exc))

        session.reset()
        reference = self._extract_interaction_reference(api_response)
        return _message("interaction_created", reference=reference)

    def _process_visiting_card(
        self,
        *,
        session: ConversationState,
        user_id: str,
        media: Dict[str, Any],
        caption: str,
    ) -> str:
        """Process visiting card image immediately with Gemini extraction and auto-auth."""
        try:
            media_id = media.get("media_id")
            if not media_id:
                return _message("interaction_failed", error="Missing media ID")

            # 1. Download WhatsApp media
            logger.info("Downloading visiting card media for %s", user_id)
            content_bytes, mime_type = self.interaction_service._download_whatsapp_media(media_id)

            # 2. Upload to Cloudinary
            logger.info("Uploading to Cloudinary...")
            image_url = self.interaction_service._upload_to_cloudinary(
                content_bytes,
                resource_type="image",
                filename=media.get("file_name"),
            )

            # 3. COMPULSORY: Extract data via Gemini OCR
            gemini = get_gemini_service()
            if not gemini.enabled:
                session.reset()
                return _message("gemini_not_configured")
            
            logger.info("Performing OCR extraction via Gemini...")
            try:
                extracted = gemini.extract_business_card(content_bytes, mime_type)
                logger.info("Gemini OCR successful: %s", extracted)
            except Exception as exc:
                logger.error("Gemini OCR failed: %s", exc)
                session.reset()
                return _message("ocr_failed")

            # 4. Build payload with EXTRACTED data (mandatory)
            name = extracted.get("name")
            phone = extracted.get("phone")
            email = extracted.get("email")
            company = extracted.get("company")
            designation = extracted.get("designation")
            
            # Build remarks from extracted fields
            remarks_parts = []
            if company:
                remarks_parts.append(company)
            if designation:
                remarks_parts.append(designation)
            if extracted.get("remarks"):
                remarks_parts.append(extracted["remarks"])
            if caption:
                remarks_parts.append(caption)
            
            remarks = " | ".join(remarks_parts) if remarks_parts else "Visiting card captured via WhatsApp"
            
            # Validate extracted phone number (must be 7-20 chars, reasonable format)
            extracted_phone = phone
            if phone:
                # Remove common formatting characters temporarily to check length
                phone_digits = ''.join(c for c in phone if c.isdigit())
                # Valid phone should have 7-15 digits typically
                if len(phone_digits) < 7 or len(phone_digits) > 15:
                    logger.warning("Extracted phone '%s' from card seems invalid (digits: %d), using WhatsApp number", phone, len(phone_digits))
                    phone = user_id
                    if extracted_phone and name:
                        # Add extracted phone to remarks if we had a name
                        remarks = f"Card phone: {extracted_phone} | {remarks}"
            
            # Fallback: use WhatsApp phone if card phone not extracted
            if not phone:
                phone = user_id
                logger.warning("No phone on card, using WhatsApp number: %s", user_id)
            
            # Fallback: use generated name if not extracted
            if not name:
                name = f"WhatsApp Lead {user_id[-4:]}"
                logger.warning("No name on card, using fallback: %s", name)

            # Normalize phone
            if not phone.startswith("+"):
                phone = f"+{phone}"

            # 5. Authenticate (with auto-refresh)
            user_token = self._get_or_refresh_token(session, user_id)
            if not user_token:
                # Check if it was a database error vs user not found BEFORE resetting
                last_error = str(session.context.get("last_error", "")).lower()
                error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
                session.reset()
                return _message(error_type)

            # 6. Create interaction (with auto-retry on auth failure)
            payload = {
                "name": name,
                "mobNo": phone,
                "tagIds": self.interaction_service.default_tag_ids,
                "mode": "field",
                "remarks": remarks,
                "image_url": image_url,
            }
            if email:
                payload["email"] = email

            try:
                api_response = self.interaction_service.post_interaction(
                    payload, auth_token=user_token
                )
            except InteractionError as exc:
                # Auto-retry once if auth expired
                if self._is_auth_error(exc):
                    logger.warning("Token expired, re-authenticating and retrying...")
                    session.context.pop("token", None)
                    auth_service.clear_token_cache(user_id)
                    
                    user_token = self._get_or_refresh_token(session, user_id)
                    if not user_token:
                        last_error = str(session.context.get("last_error", "")).lower()
                        error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
                        return _message(error_type)
                    
                    api_response = self.interaction_service.post_interaction(
                        payload, auth_token=user_token
                    )
                else:
                    raise

            session.reset()
            reference = self._extract_interaction_reference(api_response)
            
            return _message(
                "card_processed",
                name=name,
                phone=phone,
                reference=reference,
            )

        except Exception as exc:
            logger.exception("Visiting card processing failed: %s", exc)
            session.reset()
            return _message("interaction_failed", error=str(exc))

    def _process_voice_note(
        self,
        *,
        session: ConversationState,
        user_id: str,
        media: Dict[str, Any],
        caption: str,
    ) -> str:
        """Process voice note with Gemini audio transcription and analysis."""
        try:
            media_id = media.get("media_id")
            if not media_id:
                return _message("interaction_failed", error="Missing media ID")

            # 1. Download WhatsApp audio
            logger.info("Downloading audio media for %s", user_id)
            content_bytes, mime_type = self.interaction_service._download_whatsapp_media(media_id)

            # 2. Upload audio to Cloudinary first (for storage)
            logger.info("Uploading audio to Cloudinary...")
            audio_url = self.interaction_service._upload_to_cloudinary(
                content_bytes,
                resource_type="video",  # WhatsApp audio is treated as video by Cloudinary
                filename=media.get("file_name") or "voice_note.ogg",
            )

            # 3. Transcribe and analyze with Gemini in ONE API call
            gemini = get_gemini_service()
            if not gemini.enabled:
                session.reset()
                return _message("gemini_not_configured")
            
            logger.info("Transcribing and analyzing audio with Gemini...")
            try:
                result = gemini.transcribe_and_analyze_audio(content_bytes, mime_type)
                logger.info("Gemini processing successful: transcript=%s, analysis=%s", 
                           result.get("transcript", "")[:100], 
                           {k: v for k, v in result.items() if k != "transcript"})
            except Exception as exc:
                logger.error("Gemini audio processing failed: %s", exc)
                session.reset()
                return _message("transcription_failed")

            # 4. Extract data from Gemini response
            transcript = result.get("transcript", "")
            name = result.get("name")
            phone = result.get("phone")
            email = result.get("email")
            company = result.get("company")
            
            # Build remarks from Gemini analysis
            remarks_parts = []
            if result.get("remarks"):
                remarks_parts.append(result["remarks"])
            else:
                # Use first 150 chars of transcript if no summary
                remarks_parts.append(transcript[:150] + ("..." if len(transcript) > 150 else ""))
            
            if caption:
                remarks_parts.append(f"Caption: {caption}")
            
            remarks = " | ".join(remarks_parts)
            
            # Validate extracted phone number (must be 7-20 chars, reasonable format)
            extracted_phone = phone
            if phone:
                # Remove common formatting characters temporarily to check length
                phone_digits = ''.join(c for c in phone if c.isdigit())
                # Valid phone should have 7-15 digits typically
                if len(phone_digits) < 7 or len(phone_digits) > 15:
                    logger.warning("Extracted phone '%s' seems invalid (digits: %d), using WhatsApp number", phone, len(phone_digits))
                    phone = user_id
                    if extracted_phone and name:
                        # Add extracted phone to remarks if we had a name
                        remarks = f"Mentioned phone: {extracted_phone} | {remarks}"
            
            # Fallback: use WhatsApp phone if not extracted from audio
            if not phone:
                phone = user_id
                logger.warning("No phone in audio, using WhatsApp number: %s", user_id)
            
            # Fallback: use generated name if not extracted
            if not name:
                name = f"Voice Lead {user_id[-4:]}"
                logger.warning("No name in audio, using fallback: %s", name)

            # Normalize phone
            if not phone.startswith("+"):
                phone = f"+{phone}"

            # 5. Authenticate (with auto-refresh)
            user_token = self._get_or_refresh_token(session, user_id)
            if not user_token:
                # Check if it was a database error vs user not found BEFORE resetting
                last_error = str(session.context.get("last_error", "")).lower()
                error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
                session.reset()
                return _message(error_type)

            # 6. Create interaction (with auto-retry on auth failure)
            payload = {
                "name": name,
                "mobNo": phone,
                "tagIds": self.interaction_service.default_tag_ids,
                "mode": "field",
                "remarks": f"[AUDIO] {remarks}\n\nTranscript: {transcript}",
                "audio_note_url": audio_url,  # Store audio URL in audio_note_url field
            }
            if email:
                payload["email"] = email

            try:
                api_response = self.interaction_service.post_interaction(
                    payload, auth_token=user_token
                )
            except InteractionError as exc:
                # Auto-retry once if auth expired
                if self._is_auth_error(exc):
                    logger.warning("Token expired, re-authenticating and retrying...")
                    session.context.pop("token", None)
                    auth_service.clear_token_cache(user_id)
                    
                    user_token = self._get_or_refresh_token(session, user_id)
                    if not user_token:
                        last_error = str(session.context.get("last_error", "")).lower()
                        error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
                        return _message(error_type)
                    
                    api_response = self.interaction_service.post_interaction(
                        payload, auth_token=user_token
                    )
                else:
                    raise

            session.reset()
            reference = self._extract_interaction_reference(api_response)
            
            return _message(
                "audio_processed",
                remarks=result.get("remarks", transcript[:100]),
                reference=reference,
            )

        except Exception as exc:
            logger.exception("Voice note processing failed: %s", exc)
            session.reset()
            return _message("interaction_failed", error=str(exc))

    def _process_text_visiting_card(
        self,
        *,
        session: ConversationState,
        user_id: str,
        message: str,
    ) -> str:
        """Process text-based visiting card with Gemini parsing."""
        try:
            # 1. Parse text with Gemini
            gemini = get_gemini_service()
            if not gemini.enabled:
                session.reset()
                return _message("gemini_not_configured")
            
            logger.info("Parsing text visiting card with Gemini...")
            try:
                extracted = gemini.parse_text_visiting_card(message)
                logger.info("Gemini text parsing successful: %s", extracted)
            except Exception as exc:
                logger.error("Gemini text parsing failed: %s", exc)
                session.reset()
                return _message("text_card_parse_failed")

            # 2. Extract data from Gemini response
            name = extracted.get("name")
            phone = extracted.get("phone")
            email = extracted.get("email")
            company = extracted.get("company")
            designation = extracted.get("designation")
            
            # Build remarks from extracted fields
            remarks_parts = []
            if company:
                remarks_parts.append(company)
            if designation:
                remarks_parts.append(designation)
            if extracted.get("remarks"):
                remarks_parts.append(extracted["remarks"])
            
            remarks = " | ".join(remarks_parts) if remarks_parts else "Text-based visiting card via WhatsApp"
            
            # Validate extracted phone number (must be 7-20 chars, reasonable format)
            extracted_phone = phone
            if phone:
                # Remove common formatting characters temporarily to check length
                phone_digits = ''.join(c for c in phone if c.isdigit())
                # Valid phone should have 7-15 digits typically
                if len(phone_digits) < 7 or len(phone_digits) > 15:
                    logger.warning("Extracted phone '%s' from text seems invalid (digits: %d), using WhatsApp number", phone, len(phone_digits))
                    phone = user_id
                    if extracted_phone and name:
                        # Add extracted phone to remarks if we had a name
                        remarks = f"Provided phone: {extracted_phone} | {remarks}"
            
            # Fallback: use WhatsApp phone if not extracted
            if not phone:
                phone = user_id
                logger.warning("No phone in text, using WhatsApp number: %s", user_id)
            
            # Fallback: use generated name if not extracted
            if not name:
                name = f"Text Lead {user_id[-4:]}"
                logger.warning("No name in text, using fallback: %s", name)

            # Normalize phone
            if not phone.startswith("+"):
                phone = f"+{phone}"

            # 3. Authenticate (with auto-refresh)
            user_token = self._get_or_refresh_token(session, user_id)
            if not user_token:
                # Check if it was a database error vs user not found BEFORE resetting
                last_error = str(session.context.get("last_error", "")).lower()
                error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
                session.reset()
                return _message(error_type)

            # 4. Create interaction (with auto-retry on auth failure)
            payload = {
                "name": name,
                "mobNo": phone,
                "tagIds": self.interaction_service.default_tag_ids,
                "mode": "field",
                "remarks": f"[TEXT] {remarks}",
            }
            if email:
                payload["email"] = email

            try:
                api_response = self.interaction_service.post_interaction(
                    payload, auth_token=user_token
                )
            except InteractionError as exc:
                # Auto-retry once if auth expired
                if self._is_auth_error(exc):
                    logger.warning("Token expired, re-authenticating and retrying...")
                    session.context.pop("token", None)
                    auth_service.clear_token_cache(user_id)
                    
                    user_token = self._get_or_refresh_token(session, user_id)
                    if not user_token:
                        last_error = str(session.context.get("last_error", "")).lower()
                        error_type = "database_error" if any(kw in last_error for kw in ["database", "operationalerror", "server closed", "connection"]) else "user_not_found"
                        session.reset()
                        return _message(error_type)
                    
                    api_response = self.interaction_service.post_interaction(
                        payload, auth_token=user_token
                    )
                else:
                    raise

            session.reset()
            reference = self._extract_interaction_reference(api_response)
            
            return _message(
                "text_card_processed",
                name=name,
                phone=phone,
                reference=reference,
            )

        except Exception as exc:
            logger.exception("Text visiting card processing failed: %s", exc)
            session.reset()
            return _message("interaction_failed", error=str(exc))

    @staticmethod
    def _is_text_visiting_card(message: str) -> bool:
        """
        Detect if message contains visiting card-like information.
        
        Returns True if the message contains at least 2 of the following keywords:
        - name/Name/NAME
        - email/Email/EMAIL
        - mobile/Mobile/phone/Phone/contact/Contact
        - remarks/Remarks/notes/Notes
        """
        if not message or len(message.strip()) < 10:
            return False
        
        # Keywords to look for (case-insensitive)
        keywords = [
            r'\bname\s*[:\-]',
            r'\bemail\s*[:\-]',
            r'\b(mobile|phone|contact|mob)\s*[:\-]',
            r'\b(remark|note|comment)\s*[:\-]',
        ]
        
        import re
        matches = sum(1 for pattern in keywords if re.search(pattern, message, re.IGNORECASE))
        
        # If we have at least 2 keyword matches, it's likely a visiting card
        return matches >= 2

    def _get_or_refresh_token(self, session: ConversationState, user_id: str, retry_count: int = 0) -> Optional[str]:
        """Get token from cache or authenticate user with retry logic for DB errors."""
        user_token = session.context.get("token")
        if user_token:
            return user_token

        logger.info("No cached token for %s, authenticating...", user_id)
        try:
            user_token = auth_service.get_user_token(user_id)
            if user_token:
                session.context["token"] = user_token
                session.context["authenticated"] = True
                session.context.pop("last_error", None)  # Clear previous errors
            return user_token
        except AuthError as exc:
            error_msg = str(exc).lower()
            # Store the error for later checking
            session.context["last_error"] = str(exc)
            
            # Check if it's a database connection error
            if any(keyword in error_msg for keyword in ["operationalerror", "server closed", "connection", "database"]) and retry_count < 2:
                logger.warning("Database connection error, retrying in 2 seconds... (attempt %d/2)", retry_count + 1)
                import time
                time.sleep(2)
                return self._get_or_refresh_token(session, user_id, retry_count + 1)
            
            logger.error("Authentication failed for %s: %s", user_id, exc)
            return None

    @staticmethod
    def _is_auth_error(exc: InteractionError) -> bool:
        """Check if error is auth-related."""
        error_msg = str(exc).lower()
        return any(keyword in error_msg for keyword in ["401", "unauthorized", "403", "forbidden", "token"])

    @staticmethod
    def _derive_text_payload(message: str, media: Optional[Dict[str, Any]]) -> str:
        if message:
            return message
        if media and media.get("caption"):
            return media["caption"]
        return ""

    @staticmethod
    def _extract_interaction_reference(api_response: Dict[str, Any]) -> str:
        data = api_response.get("data") if isinstance(api_response, dict) else None
        reference = None
        if isinstance(data, dict):
            reference = data.get("id") or data.get("lead_id")
        return str(reference or "success")


def default_engine() -> ConversationEngine:
    """Create and return the default conversation engine instance."""
    return ConversationEngine()


def _message(key: str, **kwargs: Any) -> str:
    template = RESPONSES.get(key, RESPONSES.get("prompt_new_command", ""))
    if kwargs:
        try:
            return template.format(**kwargs)
        except KeyError:
            return template
    return template