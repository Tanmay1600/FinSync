from flask import Flask
from flask_cors import CORS
from database import db
import os
from dotenv import load_dotenv
from flask_migrate import Migrate
# Load environment variables
load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Database Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

print(f"[INFO] Loading database configuration from .env")
print(f"[INFO] Database Host: db.hinyiocfpoymedswlrro.supabase.co")

# Replace postgresql:// with postgresql+psycopg2:// if needed
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg2://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Email Configuration (Gmail SMTP)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('EMAIL')
app.config['MAIL_PASSWORD'] = os.getenv('APP_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('EMAIL')

# Initialize SQLAlchemy with app
db.init_app(app)
migrate = Migrate(app, db) 

# Flask Configuration
app.config['ENV'] = os.getenv('FLASK_ENV', 'development')
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', True)

# Import models and routes (after db is initialized)
from models import register_models
from routes import setup_routes

# Register models
register_models()

# Register all routes
setup_routes(app)

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        try:
            db.create_all()
            print("[OK] Database connected successfully!")
            print(f"[OK] Tables created/verified")
        except Exception as e:
            print(f"[ERROR] Database connection error: {str(e)}")
            print(f"[ERROR] Error type: {type(e).__name__}")
    
    print("\n[STARTING] Flask server on http://0.0.0.0:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
