# """Gemini vision helper for business card extraction."""
# from __future__ import annotations

# import base64
# import json
# import logging
# from typing import Dict, Optional

# import requests

# from config import settings

# logger = logging.getLogger(__name__)


# class GeminiService:
#     """Call Gemini to extract structured data from visiting card images."""

#     def __init__(self, api_key: Optional[str] = None) -> None:
#         self.api_key = api_key or settings.gemini_api_key
#         # Use 1.5 Pro for stable OCR without extended thinking overhead
#         self.endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"

#     @property
#     def enabled(self) -> bool:
#         return bool(self.api_key)

#     def extract_business_card(self, image_bytes: bytes, mime_type: Optional[str]) -> Dict[str, Optional[str]]:
#         if not self.api_key:
#             raise RuntimeError("GEMINI_API_KEY not configured")

#         prompt = (
#             "You are an OCR specialist extracting data from a business/visiting card image. "
#             "Perform precise text recognition and return ONLY valid JSON.\n\n"
#             "REQUIRED OUTPUT FORMAT:\n"
#             '{"name": "<full name>", "email": "<email>", "phone": "<phone>", "company": "<company>", "designation": "<job title>", "remarks": "<brief summary>"}\n\n'
#             "EXTRACTION RULES:\n"
#             "1. 'name': Full name from the card (REQUIRED - extract largest/prominent name text)\n"
#             "2. 'email': Valid email address if present, else null\n"
#             "3. 'phone': Complete phone number with country code if visible (preserve + prefix), else null\n"
#             "4. 'company': Company/organization name if present, else null\n"
#             "5. 'designation': Job title/role if present, else null\n"
#             "6. 'remarks': Brief 1-2 line summary combining company, designation, and any key info (max 120 chars)\n\n"
#             "IMPORTANT:\n"
#             "- Extract ALL visible text accurately\n"
#             "- Return null for missing fields, never guess\n"
#             "- Phone: Keep + prefix if present, include country code\n"
#             "- Name is MANDATORY - if multiple names, choose the most prominent one\n"
#             "- Output ONLY the JSON object, no markdown, no explanations\n\n"
#             "Perform OCR now and return the JSON:"
#         )

#         payload = {
#             "contents": [
#                 {
#                     "parts": [
#                         {"text": prompt},
#                         {
#                             "inline_data": {
#                                 "mime_type": mime_type or "image/jpeg",
#                                 "data": base64.b64encode(image_bytes).decode("utf-8"),
#                             }
#                         },
#                     ]
#                 }
#             ],
#             "generationConfig": {
#                 "temperature": 0.2,
#                 "maxOutputTokens": 2048  # Increased for reliable OCR output
#             },
#         }

#         url = f"{self.endpoint}?key={self.api_key}"
#         resp = requests.post(url, json=payload, timeout=40)
#         if resp.status_code >= 400:
#             logger.error("Gemini error %s: %s", resp.status_code, resp.text)
#             raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text}")

#         data = resp.json()
#         text = None
#         try:
#             text = data["candidates"][0]["content"]["parts"][0]["text"]
#         except Exception:
#             logger.warning("Gemini response missing text: %s", data)

#         if not text:
#             return {}

#         parsed = self._parse_json_from_text(text)
#         logger.info("Gemini extracted: %s", parsed)
        
#         # Validate that we got at least name or phone
#         if not parsed.get("name") and not parsed.get("phone"):
#             logger.error("Gemini extraction failed: no name or phone found in: %s", parsed)
#             raise RuntimeError("OCR extraction failed - unable to read name or phone from card")
        
#         return parsed

#     def analyze_transcript(self, transcript: str) -> Dict[str, Optional[str]]:
#         """
#         Analyze audio transcript to extract structured information
        
#         Args:
#             transcript: Text transcript of audio recording
            
#         Returns:
#             Dict with name, phone, company, and remarks
#         """
#         if not self.api_key:
#             raise RuntimeError("GEMINI_API_KEY not configured")

#         prompt = (
#             "You are analyzing a conversation transcript to extract key information. "
#             "Return ONLY valid JSON.\n\n"
#             "REQUIRED OUTPUT FORMAT:\n"
#             '{"name": "<person name>", "phone": "<phone number>", "company": "<company>", "remarks": "<summary>"}\n\n'
#             "EXTRACTION RULES:\n"
#             "1. 'name': Person's name if mentioned (first name + last name), else null\n"
#             "2. 'phone': Phone number if mentioned (preserve + prefix and country code), else null\n"
#             "3. 'company': Company/organization name if mentioned, else null\n"
#             "4. 'remarks': Brief 2-3 line summary of the conversation including key topics, action items, sentiment (max 200 chars)\n\n"
#             "IMPORTANT:\n"
#             "- Extract only explicitly mentioned information, never guess\n"
#             "- Return null for missing fields\n"
#             "- Phone: Keep + prefix if present, include country code\n"
#             "- Remarks should capture the essence of the conversation\n"
#             "- Output ONLY the JSON object, no markdown, no explanations\n\n"
#             f"TRANSCRIPT:\n{transcript}\n\n"
#             "Analyze the transcript and return JSON:"
#         )

#         payload = {
#             "contents": [
#                 {
#                     "parts": [
#                         {"text": prompt}
#                     ]
#                 }
#             ],
#             "generationConfig": {
#                 "temperature": 0.3,
#                 "maxOutputTokens": 1024
#             },
#         }

#         url = f"{self.endpoint}?key={self.api_key}"
#         resp = requests.post(url, json=payload, timeout=30)
#         if resp.status_code >= 400:
#             logger.error("Gemini error %s: %s", resp.status_code, resp.text)
#             raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text}")

#         data = resp.json()
#         text = None
#         try:
#             text = data["candidates"][0]["content"]["parts"][0]["text"]
#         except Exception:
#             logger.warning("Gemini response missing text: %s", data)

#         if not text:
#             return {}

#         parsed = self._parse_json_from_text(text)
#         logger.info("Gemini analyzed transcript: %s", parsed)
        
#         return parsed

#     def transcribe_and_analyze_audio(self, audio_bytes: bytes, mime_type: Optional[str] = None) -> Dict[str, Optional[str]]:
#         """
#         Transcribe audio and extract structured information in one API call
        
#         Args:
#             audio_bytes: Audio file bytes
#             mime_type: MIME type of audio (e.g., 'audio/ogg', 'audio/mp3')
            
#         Returns:
#             Dict with transcript, name, email, phone, company, and remarks
#         """
#         if not self.api_key:
#             raise RuntimeError("GEMINI_API_KEY not configured")

#         prompt = (
#             "You are transcribing and analyzing an audio conversation. "
#             "First transcribe the speech accurately, then extract key information.\n\n"
#             "REQUIRED OUTPUT FORMAT:\n"
#             '{"transcript": "<full transcription>", "name": "<person name>", "email": "<email>", "phone": "<phone number>", "company": "<company>", "remarks": "<summary>"}\n\n'
#             "EXTRACTION RULES:\n"
#             "1. 'transcript': Complete word-for-word transcription of the audio\n"
#             "2. 'name': Person's name if mentioned (first name + last name), else null\n"
#             "3. 'email': Email address if mentioned, else null\n"
#             "4. 'phone': Phone number if mentioned (preserve + prefix and country code), else null\n"
#             "5. 'company': Company/organization name if mentioned, else null\n"
#             "6. 'remarks': Brief 2-3 line summary of the conversation including key topics, action items, sentiment (max 200 chars)\n\n"
#             "IMPORTANT:\n"
#             "- Transcribe EVERYTHING you hear accurately\n"
#             "- Extract only explicitly mentioned information, never guess\n"
#             "- Return null for missing fields (name, email, phone, company)\n"
#             "- Phone: Keep + prefix if present, include country code\n"
#             "- Email: Extract full email address if mentioned\n"
#             "- Remarks should capture the essence of the conversation\n"
#             "- Output ONLY the JSON object, no markdown, no explanations\n\n"
#             "Listen to the audio and return JSON:"
#         )

#         payload = {
#             "contents": [
#                 {
#                     "parts": [
#                         {"text": prompt},
#                         {
#                             "inline_data": {
#                                 "mime_type": mime_type or "audio/ogg",
#                                 "data": base64.b64encode(audio_bytes).decode("utf-8"),
#                             }
#                         },
#                     ]
#                 }
#             ],
#             "generationConfig": {
#                 "temperature": 0.2,
#                 "maxOutputTokens": 2048
#             },
#         }

#         url = f"{self.endpoint}?key={self.api_key}"
#         resp = requests.post(url, json=payload, timeout=60)
#         if resp.status_code >= 400:
#             logger.error("Gemini error %s: %s", resp.status_code, resp.text)
#             raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text}")

#         data = resp.json()
#         text = None
#         try:
#             text = data["candidates"][0]["content"]["parts"][0]["text"]
#         except Exception:
#             logger.warning("Gemini response missing text: %s", data)

#         if not text:
#             return {}

#         parsed = self._parse_json_from_text(text)
#         logger.info("Gemini transcribed and analyzed audio: %s", parsed)
        
#         # Validate that we got a transcript
#         if not parsed.get("transcript"):
#             logger.error("Gemini audio transcription failed: no transcript in response")
#             raise RuntimeError("Audio transcription failed - unable to transcribe audio")
        
#         return parsed

#     @staticmethod
#     def _parse_json_from_text(text: str) -> Dict[str, Optional[str]]:
#         try:
#             return json.loads(text)
#         except json.JSONDecodeError:
#             # Try to salvage JSON substring
#             import re

#             match = re.search(r"\{[\s\S]*\}", text)
#             if match:
#                 try:
#                     return json.loads(match.group(0))
#                 except json.JSONDecodeError:
#                     return {}
#             return {}


# def get_gemini_service() -> GeminiService:
#     return GeminiService()
"""Gemini vision helper for business card extraction."""
from __future__ import annotations

import base64
import json
import logging
from typing import Dict, Optional

import requests

from config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    """Call Gemini to extract structured data from visiting card images."""

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or settings.gemini_api_key
        # Use 1.5 Pro for stable OCR without extended thinking overhead
        self.endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def extract_business_card(self, image_bytes: bytes, mime_type: Optional[str]) -> Dict[str, Optional[str]]:
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")

        prompt = (
            "You are an OCR specialist extracting data from a business/visiting card image. "
            "Perform precise text recognition and return ONLY valid JSON.\n\n"
            "REQUIRED OUTPUT FORMAT:\n"
            '{"name": "<full name>", "email": "<email>", "phone": "<phone>", "company": "<company>", "designation": "<job title>", "remarks": "<brief summary>"}\n\n'
            "EXTRACTION RULES:\n"
            "1. 'name': Full name from the card (REQUIRED - extract largest/prominent name text)\n"
            "2. 'email': Valid email address if present, else null\n"
            "3. 'phone': Complete phone number with country code if visible (preserve + prefix), else null\n"
            "4. 'company': Company/organization name if present, else null\n"
            "5. 'designation': Job title/role if present, else null\n"
            "6. 'remarks': Brief 1-2 line summary combining company, designation, and any key info (max 120 chars)\n\n"
            "IMPORTANT:\n"
            "- Extract ALL visible text accurately\n"
            "- Return null for missing fields, never guess\n"
            "- Phone: Keep + prefix if present, include country code\n"
            "- Name is MANDATORY - if multiple names, choose the most prominent one\n"
            "- Output ONLY the JSON object, no markdown, no explanations\n\n"
            "Perform OCR now and return the JSON:"
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type or "image/jpeg",
                                "data": base64.b64encode(image_bytes).decode("utf-8"),
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048  # Increased for reliable OCR output
            },
        }

        url = f"{self.endpoint}?key={self.api_key}"
        resp = requests.post(url, json=payload, timeout=40)
        if resp.status_code >= 400:
            logger.error("Gemini error %s: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text}")

        data = resp.json()
        text = None
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            logger.warning("Gemini response missing text: %s", data)

        if not text:
            return {}

        parsed = self._parse_json_from_text(text)
        logger.info("Gemini extracted: %s", parsed)
        
        # Validate that we got at least name or phone
        if not parsed.get("name") and not parsed.get("phone"):
            logger.error("Gemini extraction failed: no name or phone found in: %s", parsed)
            raise RuntimeError("OCR extraction failed - unable to read name or phone from card")
        
        return parsed

    def analyze_transcript(self, transcript: str) -> Dict[str, Optional[str]]:
        """
        Analyze audio transcript to extract structured information
        
        Args:
            transcript: Text transcript of audio recording
            
        Returns:
            Dict with name, phone, company, and remarks
        """
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")

        prompt = (
            "You are analyzing a conversation transcript to extract key information. "
            "Return ONLY valid JSON.\n\n"
            "REQUIRED OUTPUT FORMAT:\n"
            '{"name": "<person name>", "phone": "<phone number>", "company": "<company>", "remarks": "<summary>"}\n\n'
            "EXTRACTION RULES:\n"
            "1. 'name': Person's name if mentioned (first name + last name), else null\n"
            "2. 'phone': Phone number if mentioned (preserve + prefix and country code), else null\n"
            "3. 'company': Company/organization name if mentioned, else null\n"
            "4. 'remarks': Brief 2-3 line summary of the conversation including key topics, action items, sentiment (max 200 chars)\n\n"
            "IMPORTANT:\n"
            "- Extract only explicitly mentioned information, never guess\n"
            "- Return null for missing fields\n"
            "- Phone: Keep + prefix if present, include country code\n"
            "- Remarks should capture the essence of the conversation\n"
            "- Output ONLY the JSON object, no markdown, no explanations\n\n"
            f"TRANSCRIPT:\n{transcript}\n\n"
            "Analyze the transcript and return JSON:"
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 1024
            },
        }

        url = f"{self.endpoint}?key={self.api_key}"
        resp = requests.post(url, json=payload, timeout=30)
        if resp.status_code >= 400:
            logger.error("Gemini error %s: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text}")

        data = resp.json()
        text = None
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            logger.warning("Gemini response missing text: %s", data)

        if not text:
            return {}

        parsed = self._parse_json_from_text(text)
        logger.info("Gemini analyzed transcript: %s", parsed)
        
        return parsed

    def parse_text_visiting_card(self, text: str) -> Dict[str, Optional[str]]:
        """
        Parse text-based visiting card information (name, email, mobile, remarks)
        
        Args:
            text: Text message containing visiting card details
            
        Returns:
            Dict with name, email, phone, and remarks
        """
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")

        prompt = (
            "You are parsing a text message that contains visiting card or contact information. "
            "Extract structured data and return ONLY valid JSON.\n\n"
            "REQUIRED OUTPUT FORMAT:\n"
            '{"name": "<full name>", "email": "<email>", "phone": "<phone>", "company": "<company>", "designation": "<job title>", "remarks": "<summary>"}\n\n'
            "EXTRACTION RULES:\n"
            "1. 'name': Full name of the person (REQUIRED - look for 'name:', 'Name:', or person identifier)\n"
            "2. 'email': Valid email address if present (look for 'email:', 'Email:', or email pattern), else null\n"
            "3. 'phone': Phone/mobile number with country code if present (look for 'phone:', 'mobile:', 'Mobile:', 'contact:', etc.), else null\n"
            "4. 'company': Company/organization name if mentioned, else null\n"
            "5. 'designation': Job title/role if mentioned, else null\n"
            "6. 'remarks': Combine any additional notes, remarks, or comments from the text (max 200 chars)\n\n"
            "IMPORTANT:\n"
            "- Look for common patterns like 'Name: John Doe', 'Email: john@example.com', 'Mobile: +1234567890'\n"
            "- Handle variations: 'name', 'Name', 'NAME', 'email', 'Email', 'mobile', 'Mobile', 'phone', 'Phone'\n"
            "- Extract ONLY information present in the text, never guess\n"
            "- Return null for missing fields\n"
            "- Phone: Preserve + prefix and country code if present\n"
            "- Name is MANDATORY - if not found, extract the most likely person name from text\n"
            "- Output ONLY the JSON object, no markdown, no explanations\n\n"
            f"TEXT MESSAGE:\n{text}\n\n"
            "Parse the information and return JSON:"
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024
            },
        }

        url = f"{self.endpoint}?key={self.api_key}"
        resp = requests.post(url, json=payload, timeout=30)
        if resp.status_code >= 400:
            logger.error("Gemini error %s: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text}")

        data = resp.json()
        text_response = None
        try:
            text_response = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            logger.warning("Gemini response missing text: %s", data)

        if not text_response:
            return {}

        parsed = self._parse_json_from_text(text_response)
        logger.info("Gemini parsed text card: %s", parsed)
        
        # Validate that we got at least name or phone
        if not parsed.get("name") and not parsed.get("phone"):
            logger.error("Gemini text parsing failed: no name or phone found in: %s", parsed)
            raise RuntimeError("Text card parsing failed - unable to extract name or phone from text")
        
        return parsed

    def transcribe_and_analyze_audio(self, audio_bytes: bytes, mime_type: Optional[str] = None) -> Dict[str, Optional[str]]:
        """
        Transcribe audio and extract structured information in one API call
        
        Args:
            audio_bytes: Audio file bytes
            mime_type: MIME type of audio (e.g., 'audio/ogg', 'audio/mp3')
            
        Returns:
            Dict with transcript, name, email, phone, company, and remarks
        """
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")

        prompt = (
            "You are transcribing and analyzing an audio conversation. "
            "First transcribe the speech accurately, then extract key information.\n\n"
            "REQUIRED OUTPUT FORMAT:\n"
            '{"transcript": "<full transcription>", "name": "<person name>", "email": "<email>", "phone": "<phone number>", "company": "<company>", "remarks": "<summary>"}\n\n'
            "EXTRACTION RULES:\n"
            "1. 'transcript': Complete word-for-word transcription of the audio\n"
            "2. 'name': Person's name if mentioned (first name + last name), else null\n"
            "3. 'email': Email address if mentioned, else null\n"
            "4. 'phone': Phone number if mentioned (preserve + prefix and country code), else null\n"
            "5. 'company': Company/organization name if mentioned, else null\n"
            "6. 'remarks': Brief 2-3 line summary of the conversation including key topics, action items, sentiment (max 200 chars)\n\n"
            "IMPORTANT:\n"
            "- Transcribe EVERYTHING you hear accurately\n"
            "- Extract only explicitly mentioned information, never guess\n"
            "- Return null for missing fields (name, email, phone, company)\n"
            "- Phone: Keep + prefix if present, include country code\n"
            "- Email: Extract full email address if mentioned\n"
            "- Remarks should capture the essence of the conversation\n"
            "- Output ONLY the JSON object, no markdown, no explanations\n\n"
            "Listen to the audio and return JSON:"
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type or "audio/ogg",
                                "data": base64.b64encode(audio_bytes).decode("utf-8"),
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048
            },
        }

        url = f"{self.endpoint}?key={self.api_key}"
        resp = requests.post(url, json=payload, timeout=60)
        if resp.status_code >= 400:
            logger.error("Gemini error %s: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text}")

        data = resp.json()
        text = None
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            logger.warning("Gemini response missing text: %s", data)

        if not text:
            return {}

        parsed = self._parse_json_from_text(text)
        logger.info("Gemini transcribed and analyzed audio: %s", parsed)
        
        # Validate that we got a transcript
        if not parsed.get("transcript"):
            logger.error("Gemini audio transcription failed: no transcript in response")
            raise RuntimeError("Audio transcription failed - unable to transcribe audio")
        
        return parsed

    @staticmethod
    def _parse_json_from_text(text: str) -> Dict[str, Optional[str]]:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to salvage JSON substring
            import re

            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    return {}
            return {}


def get_gemini_service() -> GeminiService:
    return GeminiService()