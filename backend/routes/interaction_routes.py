"""Interaction routes for adding and managing interactions"""
from flask import Blueprint, request, jsonify
from services.auth import get_current_user
from services.interaction import add_interaction
from utils.validators import validate_required_fields

interaction_bp = Blueprint('interactions', __name__, url_prefix='/api/interactions')


@interaction_bp.route('', methods=['POST'])
def create_interaction():
    """Add a new interaction to a lead
    
    **Authorization:** Requires agent JWT token in Authorization header
    
    **Request Body:**
    {
        "name": "John Doe",
        "mobNo": "+1234567890",
        "email": "john@example.com",  (optional)
        "image_url": "https://...",    (optional)
        "audio_url": "https://...",    (optional)
        "tagIds": [1, 2, 3],
        "remarks": "Some notes"        (optional)
    }
    
    **Success Response (200):**
    {
        "success": true,
        "data": {
            "id": 1,
            "lead_id": 1,
            "agent_id": 5,
            "mode": "field",
            "remarks": "Some notes",
            "audio_note_url": "https://...",
            "image_url": "https://...",
            "score": 15,
            "tags": [
                {"id": 1, "tag_id": 1, "tag": {...}, "created_at": "..."}
            ],
            "created_at": "2026-02-14T10:30:00"
        }
    }
    
    **Error Responses:**
    - 400: Invalid input or validation error
    - 401: Missing or invalid authorization token
    - 404: Lead or tag not found
    - 409: Lead state conflict (cannot change owner)
    - 500: Server error
    """
    
    try:
        # Get authorization token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'Missing authorization token'
            }), 401
        
        token = auth_header.split(' ')[1]
        
        # Get current user (agent)
        agent = get_current_user(token)
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired token'
            }), 401
        
        # Get request data
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['name', 'mobNo', 'tagIds']
        is_valid, error = validate_required_fields(data, required_fields)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        # Call service to add interaction
        success, interaction_data, error = add_interaction(
            agent_id=agent.id,
            name=data.get('name'),
            mobNo=data.get('mobNo'),
            tagIds=data.get('tagIds'),
            email=data.get('email'),
            image_url=data.get('image_url'),
            audio_url=data.get('audio_url'),
            remarks=data.get('remarks')
        )
        
        if not success:
            # Check error type for status code
            if 'not found' in error.lower():
                return jsonify({
                    'success': False,
                    'error': error
                }), 404
            else:
                return jsonify({
                    'success': False,
                    'error': error
                }), 400
        
        return jsonify({
            'success': True,
            'data': interaction_data
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@interaction_bp.route('/leads', methods=['GET'])
def get_leads():
    """Get all leads (based on user role)
    
    **Authorization:** Requires agent JWT token in Authorization header
    
    **Role-based filtering:**
    - agent → returns only their owned leads
    - admin → returns all org leads
    
    **Success Response (200):**
    {
        "success": true,
        "data": [
            {
                "id": 1,
                "name": "John Doe",
                "email": "john@example.com",
                "mobNo": "+1234567890",
                "ownerId": 5,
                "orgId": 1,
                "state": "INTERACTION",
                "created_at": "2026-02-14T10:30:00",
                "updated_at": "2026-02-14T10:30:00",
                "interaction": {
                    "id": 1,
                    "lead_id": 1,
                    "agent_id": 5,
                    "mode": "field",
                    "score": 12,
                    "remarks": "...",
                    "created_at": "2026-02-14T10:30:00"
                }
            }
        ]
    }
    
    **Error Responses:**
    - 401: Missing or invalid authorization token
    - 500: Server error
    """
    
    try:
        # Get authorization token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'Missing authorization token'
            }), 401
        
        token = auth_header.split(' ')[1]
        
        # Get current user
        user = get_current_user(token)
        if not user:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired token'
            }), 401
        
        # Get all leads
        success, leads_data, error = get_all_leads(user.id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': error
            }), 500
        
        return jsonify({
            'success': True,
            'data': leads_data
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@interaction_bp.route('/all', methods=['GET'])
def get_interactions_all():
    """Get all interactions (based on user role)
    
    **Authorization:** Requires agent JWT token in Authorization header
    
    **Role-based filtering:**
    - agent → returns only their own interactions
    - admin → returns all org interactions
    
    **Success Response (200):**
    {
        "success": true,
        "data": [
            {
                "id": 1,
                "lead_id": 1,
                "agent_id": 5,
                "mode": "field",
                "remarks": "Some notes",
                "audio_note_url": "https://...",
                "image_url": "https://...",
                "score": 15,
                "tags": [
                    {"id": 1, "tag_id": 1, "tag": {...}, "created_at": "..."}
                ],
                "created_at": "2026-02-14T10:30:00"
            }
        ]
    }
    
    **Error Responses:**
    - 401: Missing or invalid authorization token
    - 500: Server error
    """
    
    try:
        # Get authorization token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                'success': False,
                'error': 'Missing authorization token'
            }), 401
        
        token = auth_header.split(' ')[1]
        
        # Get current user
        user = get_current_user(token)
        if not user:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired token'
            }), 401
        
        # Get all interactions
        success, interactions_data, error = get_all_interactions(user.id)
        
        if not success:
            return jsonify({
                'success': False,
                'error': error
            }), 500
        
        return jsonify({
            'success': True,
            'data': interactions_data
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500
