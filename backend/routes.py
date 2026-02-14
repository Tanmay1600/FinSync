"""Main routes registration file"""
from routes import register_routes as register_all_routes


def setup_routes(app):
    """Setup all application routes
    
    This is called from app.py to register all route blueprints and endpoints.
    All route organization is handled in the routes package.
    
    Args:
        app: Flask application instance
    """
    register_all_routes(app)
