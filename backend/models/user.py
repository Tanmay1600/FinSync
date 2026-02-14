from database import db
from datetime import datetime
import bcrypt


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    mobno = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)  # nullable for invited users
    role = db.Column(db.String(50), default='admin', nullable=False)  # admin, agent
    orgId = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    leads = db.relationship('Lead', backref=db.backref('owner', lazy=True), foreign_keys='Lead.ownerId')
    
    def set_password(self, password):
        """Hash and set the password"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password):
        """Verify a password against the hash"""
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'mobno': self.mobno,
            'role': self.role,
            'orgId': self.orgId,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
