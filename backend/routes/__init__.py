"""Routes package - Import and register all route blueprints"""
from flask import Blueprint
from .auth_routes import auth_routes
from .basic_routes import basic_routes
from .invite_routes import invite_bp
from .interaction_routes import interaction_bp


def setup_routes(app):
    """Setup all application routes
    
    Args:
        app: Flask application instance
    """
    
    # Register basic routes directly
    basic_routes(app)
    
    # Create and register auth blueprint
    auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
    auth_routes(auth_bp)
    app.register_blueprint(auth_bp)
    
    # Register invite blueprint
    app.register_blueprint(invite_bp)
    
    # Register interaction blueprint
    app.register_blueprint(interaction_bp)
