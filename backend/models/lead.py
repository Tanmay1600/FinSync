from database import db
from datetime import datetime
from .all_enums import LeadState
from sqlalchemy import Enum as SqlEnum


class Lead(db.Model):
    __tablename__ = 'leads'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    mobNo = db.Column(db.String(20), nullable=False, index=True)

    ownerId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    orgId = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)

    # ✅ ENUM STATE
    state = db.Column(
        SqlEnum(LeadState),
        default=LeadState.INTERACTION,
        nullable=False
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    interactions = db.relationship(
        'Interaction',
        back_populates='lead',
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'mobNo': self.mobNo,
            'ownerId': self.ownerId,
            'orgId': self.orgId,
            'state': self.state.value,  # IMPORTANT
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
