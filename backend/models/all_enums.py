from enum import Enum


class LeadState(Enum):
    INTERACTION = "INTERACTION"
    FOLLOW_UP = "FOLLOW_UP"
    ENGAGED = "ENGAGED"
    MEETING = "MEETING"
    OUTCOME = "OUTCOME"
    CLOSED = "CLOSED"