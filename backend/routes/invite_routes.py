"""Invite routes for agent onboarding"""
from flask import Blueprint, request, jsonify
from services.auth import create_invite, verify_and_set_password, get_current_user
from utils.validators import validate_required_fields

invite_bp = Blueprint('invite', __name__, url_prefix='/api/auth')


@invite_bp.route('/invite', methods=['POST'])
def invite_agent():
    """Invite a new agent to join the organization
    
    **Authorization:** Requires admin JWT token in Authorization header
    
    **Request Body:**
    {
        "agent_name": "John Doe",
        "agent_email": "john@example.com",
        "agent_mobno": "+1234567890",
        "frontend_url": "https://app.example.com"
    }
    
    **Success Response (200):**
    {
        "success": true,
        "data": {
            "user_id": 2,
            "agent_name": "John Doe",
            "agent_email": "john@example.com",
            "token_created_at": "2026-01-15T10:30:00",
            "token_expires_at": "2026-01-16T10:30:00",
            "message": "Invitation email sent successfully"
        }
    }
    
    **Error Responses:**
    - 400: Missing required fields
    - 401: Unauthorized (no token or invalid token)
    - 403: User is not an admin
    - 409: Email already registered
    - 500: Server error
    """
    
    try:
        # Get authorization token from header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing authorization token'}), 401
        
        token = auth_header.split(' ')[1]
        
        # Get current user from token
        admin_user = get_current_user(token)
        if not admin_user:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401
        
        # Get request data
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['agent_name', 'agent_email', 'agent_mobno', 'frontend_url']
        is_valid, error = validate_required_fields(data, required_fields)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Create invite
        success, invite_data, error = create_invite(
            admin_user_id=admin_user.id,
            agent_name=data['agent_name'],
            agent_email=data['agent_email'],
            agent_mobno=data['agent_mobno'],
            frontend_url=data['frontend_url']
        )
        
        if not success:
            if 'admin' in error.lower():
                return jsonify({'success': False, 'error': error}), 403
            elif 'already registered' in error.lower():
                return jsonify({'success': False, 'error': error}), 409
            else:
                return jsonify({'success': False, 'error': error}), 400
        
        return jsonify({'success': True, 'data': invite_data}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'}), 500


@invite_bp.route('/set-password', methods=['POST'])
def set_password():
    """Set password for invited agent and receive JWT login token
    
    Agent uses the invite token from email to verify their identity and set their password.
    
    **Request Body:**
    {
        "invite_token": "abc123...token...xyz",
        "password": "StrongPassword@123"
    }
    
    **Success Response (200):**
    {
        "success": true,
        "data": {
            "user": {
                "id": 2,
                "name": "John Doe",
                "email": "john@example.com",
                "mobno": "+1234567890",
                "role": "agent",
                "orgId": 1,
                "created_at": "2026-01-15T10:30:00"
            },
            "organization": {
                "id": 1,
                "name": "My Company",
                "description": "Company Description",
                "website": "https://example.com",
                "created_at": "2026-01-14T12:00:00"
            },
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "message": "Password set successfully. You can now log in."
        }
    }
    
    **Error Responses:**
    - 400: Invalid invite token, expired token, weak password, or missing fields
    - 422: Validation error (password requirements)
    - 500: Server error
    """
    
    try:
        # Get request data
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['invite_token', 'password']
        is_valid, error = validate_required_fields(data, required_fields)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Verify token and set password
        success, user_dict, org_dict, token, error = verify_and_set_password(
            invite_token_str=data['invite_token'],
            password=data['password']
        )
        
        if not success:
            if 'expired' in error.lower() or 'invalid' in error.lower():
                return jsonify({'success': False, 'error': error}), 400
            elif 'requirement' in error.lower() or 'weak' in error.lower():
                return jsonify({'success': False, 'error': error}), 422
            else:
                return jsonify({'success': False, 'error': error}), 400
        
        response_data = {
            'user': user_dict,
            'organization': org_dict,
            'token': token,
            'message': 'Password set successfully. You can now log in.'
        }
        
        return jsonify({'success': True, 'data': response_data}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': f'Server error: {str(e)}'}), 500
