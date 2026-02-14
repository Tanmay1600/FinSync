"""Authentication service with business logic"""
import jwt
import os
from datetime import datetime, timedelta
from database import db
from models import User, Organization, InviteToken
from utils.validators import (
    validate_email, validate_password, validate_name, validate_phone,
    validate_website, validate_description
)
from services.email import email_service

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this')


def generate_token(user_id: int) -> str:
    """Generate JWT token for a user
    
    Args:
        user_id: User ID to encode in token
        
    Returns:
        JWT token string
    """
    payload = {
        'user_id': user_id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(days=30)  # Token valid for 30 days
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token


def verify_token(token: str) -> dict:
    """Verify and decode JWT token
    
    Args:
        token: JWT token to verify
        
    Returns:
        Decoded payload dict or None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user(token: str) -> User:
    """Get user from JWT token
    
    Args:
        token: JWT token
        
    Returns:
        User object or None if invalid token
    """
    payload = verify_token(token)
    if not payload:
        return None
    
    user = User.query.get(payload.get('user_id'))
    return user


def register_user(name: str, email: str, mobno: str, password: str, org_name: str, org_description: str = None, org_website: str = None) -> tuple:
    """Register a new user with their organization - ATOMIC TRANSACTION
    
    Both user and organization creation must succeed or both are rolled back.
    
    Args:
        name: User full name
        email: User email
        mobno: User mobile number
        password: User password (will be hashed)
        org_name: Organization name
        org_description: Organization description (optional)
        org_website: Organization website (optional)
        
    Returns:
        Tuple of (success, user_dict, organization_dict, token, error_message)
    """
    
    # ===== Validate User Fields =====
    is_valid, error = validate_name(name)
    if not is_valid:
        return False, None, None, None, error
    
    is_valid, error = validate_email(email)
    if not is_valid:
        return False, None, None, None, error
    
    is_valid, error = validate_phone(mobno)
    if not is_valid:
        return False, None, None, None, error
    
    is_valid, error = validate_password(password)
    if not is_valid:
        return False, None, None, None, error
    
    # ===== Validate Organization Fields =====
    is_valid, error = validate_name(org_name, "Organization name")
    if not is_valid:
        return False, None, None, None, error
    
    if org_description:
        is_valid, error = validate_description(org_description)
        if not is_valid:
            return False, None, None, None, error
    
    if org_website:
        is_valid, error = validate_website(org_website)
        if not is_valid:
            return False, None, None, None, error
    
    # Check if email already exists
    existing_user = User.query.filter_by(email=email.lower().strip()).first()
    if existing_user:
        return False, None, None, None, "Email already registered"
    
    # ===== ATOMIC TRANSACTION: Create Organization and User =====
    try:
        # Create organization
        organization = Organization(
            name=org_name.strip(),
            description=org_description.strip() if org_description else None,
            website=org_website.strip() if org_website else None
        )
        
        db.session.add(organization)
        db.session.flush()  # Flush to get the organization ID without committing
        
        # Create user with organization reference
        user = User(
            name=name.strip(),
            email=email.lower().strip(),
            mobno=mobno.strip(),
            role='admin',  # Default role on registration
            orgId=organization.id
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()  # Commit both together
        
        # Generate JWT token
        token = generate_token(user.id)
        
        return True, user.to_dict(), organization.to_dict(), token, None
    
    except Exception as e:
        db.session.rollback()
        return False, None, None, None, f"Registration failed: {str(e)}"


def login_user(email: str, password: str) -> tuple:
    """Authenticate user and return token
    
    Args:
        email: User email
        password: User password
        
    Returns:
        Tuple of (success, user_dict, organization_dict, token, error_message)
    """
    
    # Validate inputs
    is_valid, error = validate_email(email)
    if not is_valid:
        return False, None, None, None, error
    
    is_valid, error = validate_password(password)
    if not is_valid:
        return False, None, None, None, error
    
    try:
        # Find user by email
        user = User.query.filter_by(email=email.lower().strip()).first()
        
        if not user:
            return False, None, None, None, "Invalid email or password"
        
        # Verify password
        if not user.verify_password(password):
            return False, None, None, None, "Invalid email or password"
        
        # Get user's organization
        organization = Organization.query.get(user.orgId)
        
        # Generate JWT token
        token = generate_token(user.id)
        
        return True, user.to_dict(), organization.to_dict() if organization else None, token, None
    
    except Exception as e:
        return False, None, None, None, f"Login failed: {str(e)}"


def create_invite(admin_user_id: int, agent_name: str, agent_email: str, agent_mobno: str, frontend_url: str) -> tuple:
    """Create invitation for a new agent and send email
    
    Only admin users can invite new agents. An InviteToken is created and sent via email.
    Agent is created without password and will set it during onboarding.
    
    Args:
        admin_user_id: ID of admin user creating the invite
        agent_name: Name of agent being invited
        agent_email: Email of agent being invited
        agent_mobno: Mobile number of agent being invited
        frontend_url: Frontend URL for agent to accept invitation
        
    Returns:
        Tuple of (success, invite_data, error_message)
    """
    
    # Validate admin user exists and is admin
    admin_user = User.query.get(admin_user_id)
    if not admin_user:
        return False, None, "Admin user not found"
    
    if admin_user.role != 'admin':
        return False, None, "Only admins can invite agents"
    
    # Validate agent input fields
    is_valid, error = validate_name(agent_name)
    if not is_valid:
        return False, None, error
    
    is_valid, error = validate_email(agent_email)
    if not is_valid:
        return False, None, error
    
    is_valid, error = validate_phone(agent_mobno)
    if not is_valid:
        return False, None, error
    
    # Check if email already exists
    existing_user = User.query.filter_by(email=agent_email.lower().strip()).first()
    if existing_user:
        return False, None, "Email already registered"
    
    try:
        # Create user without password
        user = User(
            name=agent_name.strip(),
            email=agent_email.lower().strip(),
            mobno=agent_mobno.strip(),
            role='agent',
            orgId=admin_user.orgId,
            password_hash=None  # No password initially
        )
        
        db.session.add(user)
        db.session.flush()  # Flush to get the user ID
        
        # Create invite token (24 hour expiry)
        invite_token = InviteToken(
            token=InviteToken.generate_token(),
            user_id=user.id,
            org_id=admin_user.orgId,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        db.session.add(invite_token)
        db.session.commit()
        
        # Send invite email
        success, email_error = email_service.send_invite_email(
            recipient_email=agent_email,
            recipient_name=agent_name,
            invite_token=invite_token.token,
            frontend_url=frontend_url
        )
        
        if not success:
            # Rollback if email fails
            db.session.rollback()
            return False, None, f"Failed to send email: {email_error}"
        
        # Return invite data
        invite_data = {
            'user_id': user.id,
            'agent_name': user.name,
            'agent_email': user.email,
            'token_created_at': invite_token.created_at.isoformat(),
            'token_expires_at': invite_token.expires_at.isoformat(),
            'message': 'Invitation email sent successfully'
        }
        
        return True, invite_data, None
        
    except Exception as e:
        db.session.rollback()
        return False, None, f"Invite creation failed: {str(e)}"


def verify_and_set_password(invite_token_str: str, password: str) -> tuple:
    """Verify invite token and set user password
    
    Agent uses this endpoint to accept invitation and set their password.
    Returns JWT login token upon successful completion.
    
    Args:
        invite_token_str: Invite token from email link
        password: New password to set
        
    Returns:
        Tuple of (success, user_dict, organization_dict, token, error_message)
    """
    
    # Validate password
    is_valid, error = validate_password(password)
    if not is_valid:
        return False, None, None, None, error
    
    try:
        # Find invite token
        invite_token = InviteToken.query.filter_by(token=invite_token_str).first()
        
        if not invite_token:
            return False, None, None, None, "Invalid invite token"
        
        # Check if token is valid
        if not invite_token.is_valid():
            return False, None, None, None, "Invite token has expired or already used"
        
        # Get user and set password
        user = User.query.get(invite_token.user_id)
        if not user:
            return False, None, None, None, "User not found"
        
        # Set password
        user.set_password(password)
        
        # Mark token as used
        invite_token.mark_used()
        
        db.session.commit()
        
        # Get user's organization
        organization = Organization.query.get(user.orgId)
        
        # Generate JWT token for login
        token = generate_token(user.id)
        
        return True, user.to_dict(), organization.to_dict() if organization else None, token, None
        
    except Exception as e:
        db.session.rollback()
        return False, None, None, None, f"Password setup failed: {str(e)}"
