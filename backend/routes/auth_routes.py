"""Authentication routes"""
from flask import request, jsonify
from utils.validators import validate_required_fields
from services.auth import register_user, login_user


def auth_routes(blueprint):
    """Register authentication routes
    
    Args:
        blueprint: Flask Blueprint for auth routes
    """
    
    @blueprint.route('/register', methods=['POST'])
    def register():
        """Register a new user with organization
        
        Request JSON:
        {
            "name": "John Doe",
            "email": "john@example.com",
            "mobNo": "+1234567890",
            "password": "securePassword123",
            "orgName": "Acme Corp",
            "orgDescription": "Leading tech company (optional)",
            "orgWebsite": "https://acmecorp.com (optional)"
        }
        
        Response (201):
        {
            "message": "User and organization created successfully",
            "user": {
                "id": 1,
                "name": "John Doe",
                "email": "john@example.com",
                "mobno": "+1234567890",
                "orgId": 1,
                "role": "admin",
                "created_at": "2026-02-14T...",
                "updated_at": "2026-02-14T..."
            },
            "organization": {
                "id": 1,
                "name": "Acme Corp",
                "description": "Leading tech company",
                "website": "https://acmecorp.com",
                "created_at": "2026-02-14T...",
                "updated_at": "2026-02-14T..."
            },
            "token": "eyJhbGc..."
        }
        
        Response (400/409/500):
        {
            "error": "error message"
        }
        """
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'mobNo', 'password', 'orgName']
        is_valid, error = validate_required_fields(data, required_fields)
        if not is_valid:
            return jsonify({'error': error}), 400
        
        # Call service to register user and organization
        success, user, organization, token, error = register_user(
            name=data['name'],
            email=data['email'],
            mobno=data['mobNo'],
            password=data['password'],
            org_name=data['orgName'],
            org_description=data.get('orgDescription'),
            org_website=data.get('orgWebsite')
        )
        
        if not success:
            # Determine error code based on error message
            if "already registered" in error:
                return jsonify({'error': error}), 409
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': 'User and organization created successfully',
            'user': user,
            'organization': organization,
            'token': token
        }), 201
    
    @blueprint.route('/login', methods=['POST'])
    def login():
        """Login user and return JWT token with organization info
        
        Request JSON:
        {
            "email": "john@example.com",
            "password": "securePassword123"
        }
        
        Response (200):
        {
            "message": "Login successful",
            "user": {
                "id": 1,
                "name": "John Doe",
                "email": "john@example.com",
                "mobno": "+1234567890",
                "orgId": 1,
                "role": "admin",
                "created_at": "2026-02-14T...",
                "updated_at": "2026-02-14T..."
            },
            "organization": {
                "id": 1,
                "name": "Acme Corp",
                "description": "Leading tech company",
                "website": "https://acmecorp.com",
                "created_at": "2026-02-14T...",
                "updated_at": "2026-02-14T..."
            },
            "token": "eyJhbGc..."
        }
        
        Response (400/401/500):
        {
            "error": "error message"
        }
        """
        data = request.get_json()
        
        # Validate required fields
        is_valid, error = validate_required_fields(data, ['email', 'password'])
        if not is_valid:
            return jsonify({'error': error}), 400
        
        # Call service to login user
        success, user, organization, token, error = login_user(
            email=data['email'],
            password=data['password']
        )
        
        if not success:
            return jsonify({'error': error}), 401
        
        return jsonify({
            'message': 'Login successful',
            'user': user,
            'organization': organization,
            'token': token
        }), 200
