"""Input validation utilities"""
import re
from typing import Tuple, Optional


def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """Validate email format"""
    if not email or not isinstance(email, str):
        return False, "Email is required and must be a string"
    
    email = email.strip()
    if len(email) > 120:
        return False, "Email must be less than 120 characters"
    
    # Simple email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "Invalid email format"
    
    return True, None


def validate_name(name: str, field_name: str = "Name") -> Tuple[bool, Optional[str]]:
    """Validate name field"""
    if not name or not isinstance(name, str):
        return False, f"{field_name} is required and must be a string"
    
    name = name.strip()
    if len(name) < 2:
        return False, f"{field_name} must be at least 2 characters"
    
    if len(name) > 120:
        return False, f"{field_name} must be less than 120 characters"
    
    return True, None


def validate_phone(phone: str) -> Tuple[bool, Optional[str]]:
    """Validate phone number"""
    if not phone or not isinstance(phone, str):
        return False, "Phone number is required and must be a string"
    
    phone = phone.strip()
    if len(phone) < 7:
        return False, "Phone number must be at least 7 characters"
    
    if len(phone) > 20:
        return False, "Phone number must be less than 20 characters"
    
    # Phone can contain digits, +, -, (, ), and spaces
    if not re.match(r'^[\d+\-\(\)\s]{7,20}$', phone):
        return False, "Invalid phone number format"
    
    return True, None


def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """Validate password strength"""
    if not password or not isinstance(password, str):
        return False, "Password is required and must be a string"
    
    if len(password) < 6:
        return False, "Password must be at least 6 characters"
    
    if len(password) > 255:
        return False, "Password must be less than 255 characters"
    
    return True, None


def validate_role(role: str) -> Tuple[bool, Optional[str]]:
    """Validate user role"""
    if not role or not isinstance(role, str):
        return False, "Role is required and must be a string"
    
    valid_roles = ['admin', 'agent']
    if role.lower() not in valid_roles:
        return False, f"Role must be one of: {', '.join(valid_roles)}"
    
    return True, None


def validate_text(text: str, field_name: str = "Text", min_length: int = 1, max_length: int = 500) -> Tuple[bool, Optional[str]]:
    """Validate general text field"""
    if not text or not isinstance(text, str):
        return False, f"{field_name} is required and must be a string"
    
    text = text.strip()
    if len(text) < min_length:
        return False, f"{field_name} must be at least {min_length} characters"
    
    if len(text) > max_length:
        return False, f"{field_name} must be less than {max_length} characters"
    
    return True, None


def validate_required_fields(data: dict, required_fields: list) -> Tuple[bool, Optional[str]]:
    """Validate that all required fields are present"""
    if not data or not isinstance(data, dict):
        return False, "Request body must be valid JSON"
    
    missing_fields = [field for field in required_fields if field not in data or data[field] is None]
    
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    return True, None


def validate_website(website: str) -> Tuple[bool, Optional[str]]:
    """Validate website URL"""
    if not website:
        return True, None  # Website is optional
    
    if not isinstance(website, str):
        return False, "Website must be a string"
    
    website = website.strip()
    if len(website) > 255:
        return False, "Website must be less than 255 characters"
    
    # Simple URL validation
    url_pattern = r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    if not re.match(url_pattern, website):
        return False, "Invalid website format"
    
    return True, None


def validate_description(description: str) -> Tuple[bool, Optional[str]]:
    """Validate organization description"""
    if not description:
        return True, None  # Description is optional
    
    if not isinstance(description, str):
        return False, "Description must be a string"
    
    description = description.strip()
    if len(description) > 1000:
        return False, "Description must be less than 1000 characters"
    
    return True, None


def sanitize_string(value: str) -> str:
    """Sanitize string input"""
    if not value:
        return ""
    return value.strip()
