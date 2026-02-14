from database import db
from datetime import datetime


class Interaction(db.Model):
    __tablename__ = 'interactions'

    id = db.Column(db.Integer, primary_key=True)

    lead_id = db.Column(
        db.Integer,
        db.ForeignKey('leads.id'),
        nullable=False
    )

    agent_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False
    )

    mode = db.Column(
        db.String(20),
        nullable=False  # stall / field
    )

    remarks = db.Column(db.Text, nullable=True)

    audio_note_url = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    
    # calculated positivity score
    score = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # relationships
    agent = db.relationship(
        "User",
        backref="interactions",
        lazy=True
    )

    lead = db.relationship(
        "Lead",
        back_populates="interactions",
        lazy=True
    )
    
    tags = db.relationship(
        'InteractionTag',
        backref=db.backref('interaction', lazy=True),
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            "id": self.id,
            "lead_id": self.lead_id,
            "agent_id": self.agent_id,
            "mode": self.mode,
            "remarks": self.remarks,
            "audio_note_url": self.audio_note_url,
            "image_url": self.image_url,
            "score": self.score,
            "tags": [t.to_dict() for t in self.tags],
            "created_at": self.created_at.isoformat()
        }
