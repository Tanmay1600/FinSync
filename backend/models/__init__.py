from .organization import Organization
from .user import User
from .lead import Lead
from .tag import Tag
from .user_tag import UserTag
from .invite_token import InviteToken

__all__ = ['Organization', 'User', 'Lead', 'Tag', 'UserTag', 'InviteToken']


def register_models():
    """Register all models - models are automatically registered when imported"""
    pass
