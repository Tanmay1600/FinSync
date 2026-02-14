from database import db
from datetime import datetime


class UserTag(db.Model):
    __tablename__ = 'user_tags'
    
    id = db.Column(db.Integer, primary_key=True)
    tagid = db.Column(db.Integer, db.ForeignKey('tags.id'), nullable=False)
    leadid = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'tagid': self.tagid,
            'leadid': self.leadid,
            'tag': self.tag.to_dict() if self.tag else None,
            'created_at': self.created_at.isoformat()
        }
