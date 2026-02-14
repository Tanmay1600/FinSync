"""InviteToken model for managing invitation tokens"""
from datetime import datetime, timedelta
from database import db
import secrets


class InviteToken(db.Model):
    """Model for invitation tokens sent via email"""
    
    __tablename__ = "invite_tokens"
    
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    used_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship("User", backref="invite_tokens")
    organization = db.relationship("Organization", backref="invite_tokens")
    
    def __repr__(self):
        return f"<InviteToken token={self.token[:10]}... user_id={self.user_id} used={self.used}>"
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token
        
        Returns:
            Secure random token string (64 characters)
        """
        return secrets.token_urlsafe(48)  # 64 characters when urlsafe encoded
    
    def is_valid(self) -> bool:
        """Check if token is still valid
        
        Returns:
            True if token is not expired and not used
        """
        if self.used:
            return False
        
        if datetime.utcnow() > self.expires_at:
            return False
        
        return True
    
    def mark_used(self):
        """Mark token as used"""
        self.used = True
        self.used_at = datetime.utcnow()
