from database import db
from datetime import datetime


class Tag(db.Model):
    __tablename__ = 'tags'
    
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(100), unique=True, nullable=False)
    color = db.Column(db.String(20), nullable=False)  # red/yellow/green/grey

    # OPTIONAL: score weight (VERY USEFUL)
    score = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    interaction_tags = db.relationship(
        'InteractionTag',
        backref=db.backref('tag', lazy=True),
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'color': self.color,
            'score': self.score,
            'created_at': self.created_at.isoformat()
        }
