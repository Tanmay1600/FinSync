from database import db
from datetime import datetime


class InteractionTag(db.Model):
    __tablename__ = 'interaction_tags'

    id = db.Column(db.Integer, primary_key=True)

    interaction_id = db.Column(
        db.Integer,
        db.ForeignKey('interactions.id'),
        nullable=False
    )

    tag_id = db.Column(
        db.Integer,
        db.ForeignKey('tags.id'),
        nullable=False
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "tag_id": self.tag_id,
            "tag": self.tag.to_dict() if self.tag else None,
            "created_at": self.created_at.isoformat()
        }
