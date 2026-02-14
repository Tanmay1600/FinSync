from database import db
from datetime import datetime


class Lead(db.Model):
    __tablename__ = 'leads'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    mobNo = db.Column(db.String(20), nullable=False)
    remarks = db.Column(db.Text, nullable=True)
    ownerId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    orgId = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tags = db.relationship('UserTag', backref=db.backref('lead', lazy=True), cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'mobNo': self.mobNo,
            'remarks': self.remarks,
            'ownerId': self.ownerId,
            'orgId': self.orgId,
            'tags': [tag.to_dict() for tag in self.tags],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
