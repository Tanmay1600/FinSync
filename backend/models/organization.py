from database import db
from datetime import datetime


class Organization(db.Model):
    __tablename__ = 'organizations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    website = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = db.relationship('User', backref=db.backref('organization', lazy=True), cascade='all, delete-orphan')
    leads = db.relationship('Lead', backref=db.backref('organization', lazy=True), cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'website': self.website,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
