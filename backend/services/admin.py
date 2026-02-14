from typing import Tuple, List, Dict
from sqlalchemy import func
from database import db
from models import User, Interaction, Lead


def get_org_agents_summary(user_id: int) -> Tuple[bool, List[Dict], str]:
    """
    Admin-only API:
    Returns all agents of admin's org with analytics.

    Fields:
        name
        email
        mobNo
        no_of_interactions
        no_of_leads
    """

    try:
        # ---------------------------------------
        # Validate admin
        # ---------------------------------------
        admin = User.query.get(user_id)

        if not admin:
            return False, None, "User not found"

        if admin.role != "admin":
            return False, None, "Access denied (admin only)"

        # ---------------------------------------
        # Subquery: interaction counts
        # ---------------------------------------
        interaction_counts = (
            db.session.query(
                Interaction.agent_id.label("agent_id"),
                func.count(Interaction.id).label("interaction_count")
            )
            .group_by(Interaction.agent_id)
            .subquery()
        )

        # ---------------------------------------
        # Subquery: lead counts
        # ---------------------------------------
        lead_counts = (
            db.session.query(
                Lead.ownerId.label("agent_id"),
                func.count(Lead.id).label("lead_count")
            )
            .group_by(Lead.ownerId)
            .subquery()
        )

        # ---------------------------------------
        # Main Query
        # ---------------------------------------
        agents = (
            db.session.query(
                User.id,
                User.name,
                User.email,
                User.mobno,
                func.coalesce(interaction_counts.c.interaction_count, 0),
                func.coalesce(lead_counts.c.lead_count, 0)
            )
            .outerjoin(
                interaction_counts,
                interaction_counts.c.agent_id == User.id
            )
            .outerjoin(
                lead_counts,
                lead_counts.c.agent_id == User.id
            )
            .filter(
                User.orgId == admin.orgId,
                User.role == "agent"
            )
            .order_by(User.name)
            .all()
        )

        # ---------------------------------------
        # Format response
        # ---------------------------------------
        result = []

        for a in agents:
            result.append({
                "name": a.name,
                "email": a.email,
                "mobNo": a.mobno,
                "no_of_interactions": int(a[4]),
                "no_of_leads": int(a[5])
            })

        return True, result, None

    except Exception as e:
        return False, None, str(e)
