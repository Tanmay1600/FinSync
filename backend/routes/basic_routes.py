"""Basic/Health routes"""
from flask import jsonify
from database import db


def basic_routes(app):
    """Register basic routes"""
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Check API health and database connection
        
        Response (200):
        {
            "status": "healthy",
            "message": "Backend is running",
            "database": "connected"
        }
        
        Response (500):
        {
            "status": "unhealthy",
            "message": "error details"
        }
        """
        try:
            # Test database connection
            db.session.execute('SELECT 1')
            return jsonify({
                'status': 'healthy',
                'message': 'Backend is running',
                'database': 'connected'
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'message': f'Database connection failed: {str(e)}'
            }), 500
    
    @app.route('/', methods=['GET'])
    def index():
        """Welcome endpoint
        
        Response (200):
        {
            "message": "Welcome to Hack The Tank Backend"
        }
        """
        return jsonify({
            'message': 'Welcome to Hack The Tank Backend'
        }), 200
