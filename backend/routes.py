def register_routes(app):
    """Register all application routes"""
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {'status': 'healthy', 'message': 'Backend is running'}, 200
    
    @app.route('/', methods=['GET'])
    def index():
        return {'message': 'Welcome to Hack The Tank Backend'}, 200
