"""Configuration helpers for the WhatsApp bot."""
from dataclasses import dataclass, field
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    verify_token: str = os.getenv("VERIFY_TOKEN")
    access_token: Optional[str] = os.getenv("ACCESS_TOKEN")
    phone_number_id: Optional[str] = os.getenv("PHONE_NUMBER_ID")
    api_version: str = os.getenv("WHATSAPP_API_VERSION", "v17.0")
    app_id: Optional[str] = os.getenv("APP_ID")
    app_secret: Optional[str] = os.getenv("APP_SECRET")
    business_account_id: Optional[str] = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
    test_number: Optional[str] = os.getenv("TEST_NUMBER")
    interactions_api_url: Optional[str] = os.getenv("INTERACTIONS_API_URL")
    interactions_api_token: Optional[str] = os.getenv("INTERACTIONS_API_TOKEN")
    default_tag_ids_raw: str = os.getenv("DEFAULT_TAG_IDS", "")
    default_tag_ids: List[int] = field(init=False, default_factory=list)
    cloudinary_cloud_name: Optional[str] = os.getenv("CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key: Optional[str] = os.getenv("CLOUDINARY_API_KEY")
    cloudinary_api_secret: Optional[str] = os.getenv("CLOUDINARY_API_SECRET")
    cloudinary_folder: Optional[str] = os.getenv("CLOUDINARY_FOLDER")
    aes_key: Optional[str] = os.getenv("AES_KEY")
    auth_api_url: str = os.getenv("AUTH_API_URL", "http://localhost:5000/api/auth/encrypted-login")
    gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")

    # Offline queue configuration
    queue_db_path: str = os.getenv("QUEUE_DB_PATH", "offline_queue.db")
    queue_poll_interval: int = int(os.getenv("QUEUE_POLL_INTERVAL", "8"))

    def credentials_ready(self) -> bool:
        return bool(self.access_token and self.phone_number_id)

    def __post_init__(self) -> None:
        self.default_tag_ids = self._parse_tag_ids(self.default_tag_ids_raw)
        if self.cloudinary_folder:
            self.cloudinary_folder = self.cloudinary_folder.strip() or None

    @staticmethod
    def _parse_tag_ids(raw_tag_ids: str) -> List[int]:
        parsed: List[int] = []
        for chunk in raw_tag_ids.split(","):
            chunk = chunk.strip()
            if not chunk:
                continue
            try:
                parsed.append(int(chunk))
            except ValueError:
                continue
        return parsed


settings = Settings()
