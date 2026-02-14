"""Interaction service with business logic"""

from database import db
from models import Interaction, InteractionTag, Lead, Tag, User
from models.all_enums import LeadState

from utils.validators import validate_phone, validate_name

from typing import List, Tuple, Optional, Dict
from sqlalchemy.orm import joinedload
from sqlalchemy import desc, func


# =========================================================
# ADD INTERACTION
# =========================================================
from database import db
from models import Interaction, InteractionTag, Lead, Tag, User
from models.all_enums import LeadState

from utils.validators import validate_name, validate_phone

from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc, func

from typing import Optional, Tuple, Dict


def add_interaction(
    agent_id: int,
    name: str,
    mobNo: str,
    tagIds: list = None,
    email: Optional[str] = None,
    image_url: Optional[str] = None,
    audio_url: Optional[str] = None,
    remarks: Optional[str] = None,
    mode: str = "field"
) -> Tuple[bool, Optional[Dict], Optional[str]]:

    try:
        # =====================================================
        # FETCH AGENT
        # =====================================================
        agent = db.session.get(User, agent_id)
        if not agent:
            return False, None, "Agent not found"

        # =====================================================
        # VALIDATION
        # =====================================================
        is_valid, error = validate_name(name)
        if not is_valid:
            return False, None, error

        is_valid, error = validate_phone(mobNo)
        if not is_valid:
            return False, None, error

        if mode not in ["stall", "field"]:
            return False, None, "Invalid mode"

        mobNo = mobNo.strip()

        # =====================================================
        # FIND EXISTING LEAD
        # =====================================================
        lead = Lead.query.filter_by(
            mobNo=mobNo,
            orgId=agent.orgId
        ).first()

        if not lead and not tagIds:
            return False, None, "tagIds required when creating new lead"

        # =====================================================
        # TAGS + SCORE
        # =====================================================
        tags = []
        new_score = 0

        if tagIds:
            tags = Tag.query.filter(Tag.id.in_(tagIds)).all()

            if len(tags) != len(tagIds):
                return False, None, "Invalid tagIds"

            new_score = sum(tag.score for tag in tags)

        # =====================================================
        # CASE 1 — CREATE LEAD (RACE CONDITION SAFE)
        # =====================================================
        if not lead:

            lead = Lead(
                name=name.strip(),
                email=email.strip() if email else None,
                mobNo=mobNo,
                ownerId=agent_id,
                orgId=agent.orgId,
                state=LeadState.INTERACTION
            )

            db.session.add(lead)

            try:
                db.session.flush()  # attempt insert
            except IntegrityError:
                # another request created same lead
                db.session.rollback()

                lead = Lead.query.filter_by(
                    mobNo=mobNo,
                    orgId=agent.orgId
                ).first()

                if not lead:
                    return False, None, "Failed creating lead"

        # =====================================================
        # CASE 2 — OWNER UPDATES LAST INTERACTION
        # =====================================================
        if agent_id == lead.ownerId:

            last_interaction = (
                Interaction.query
                .filter_by(lead_id=lead.id)
                .order_by(desc(Interaction.created_at))
                .first()
            )

            if last_interaction:

                if tagIds:
                    InteractionTag.query.filter_by(
                        interaction_id=last_interaction.id
                    ).delete()

                    db.session.add_all([
                        InteractionTag(
                            interaction_id=last_interaction.id,
                            tag_id=tag.id
                        ) for tag in tags
                    ])

                    last_interaction.score = new_score

                if image_url is not None:
                    last_interaction.image_url = image_url

                if audio_url is not None:
                    last_interaction.audio_note_url = audio_url

                if remarks is not None:
                    last_interaction.remarks = remarks

                db.session.commit()
                return True, last_interaction.to_dict(), None

        # =====================================================
        # CASE 3 — OWNER LOCKED
        # =====================================================
        if lead.state != LeadState.INTERACTION:

            interaction = Interaction(
                lead_id=lead.id,
                agent_id=agent_id,
                mode=mode,
                image_url=image_url,
                audio_note_url=audio_url,
                remarks=remarks,
                score=new_score
            )

            db.session.add(interaction)
            db.session.flush()

            db.session.add_all([
                InteractionTag(
                    interaction_id=interaction.id,
                    tag_id=tag.id
                ) for tag in tags
            ])

            db.session.commit()

            result = interaction.to_dict()
            result["message"] = "Owner locked due to lead state"

            return True, result, None

        # =====================================================
        # CASE 4 — OWNERSHIP SCORING
        # =====================================================
        owner_score = db.session.query(
            func.coalesce(func.sum(Interaction.score), 0)
        ).filter(
            Interaction.lead_id == lead.id,
            Interaction.agent_id == lead.ownerId
        ).scalar()

        agent_score = db.session.query(
            func.coalesce(func.sum(Interaction.score), 0)
        ).filter(
            Interaction.lead_id == lead.id,
            Interaction.agent_id == agent_id
        ).scalar()

        if agent_score > owner_score + 5:
            lead.ownerId = agent_id

        # =====================================================
        # CREATE NEW INTERACTION
        # =====================================================
        interaction = Interaction(
            lead_id=lead.id,
            agent_id=agent_id,
            mode=mode,
            image_url=image_url,
            audio_note_url=audio_url,
            remarks=remarks,
            score=new_score
        )

        db.session.add(interaction)
        db.session.flush()

        db.session.add_all([
            InteractionTag(
                interaction_id=interaction.id,
                tag_id=tag.id
            ) for tag in tags
        ])

        db.session.commit()

        return True, interaction.to_dict(), None

    except Exception as e:
        db.session.rollback()
        return False, None, str(e)

# =========================================================
# GET ALL LEADS (ROLE BASED)
# =========================================================
def get_all_leads(user_id: int):

    try:
        user = User.query.get(user_id)
        if not user:
            return False, None, "User not found"

        query = Lead.query

        if user.role == "admin":
            query = query.filter(Lead.orgId == user.orgId)
        else:
            query = query.filter(Lead.ownerId == user_id)

        leads = (
            query.options(
                joinedload(Lead.interactions)
                    .joinedload(Interaction.agent),
                joinedload(Lead.interactions)
                    .joinedload(Interaction.tags)
                    .joinedload(InteractionTag.tag)
            )
            .order_by(desc(Lead.created_at))
            .all()
        )

        result = []

        for lead in leads:
            lead_dict = lead.to_dict()

            latest = (
                max(lead.interactions, key=lambda x: x.created_at)
                if lead.interactions else None
            )

            if latest:
                interaction_data = latest.to_dict()

                interaction_data["agent"] = (
                    latest.agent.to_dict()
                    if latest.agent else None
                )
            else:
                interaction_data = None

            lead_dict["interaction"] = interaction_data
            result.append(lead_dict)

        return True, result, None

    except Exception as e:
        return False, None, str(e)

# =========================================================
# GET ALL INTERACTIONS (ROLE BASED)
# =========================================================
def get_all_interactions(user_id: int):

    try:
        user = User.query.get(user_id)
        if not user:
            return False, None, "User not found"

        query = Interaction.query

        if user.role == "admin":
            query = query.join(
                Lead,
                Interaction.lead_id == Lead.id
            ).filter(
                Lead.orgId == user.orgId
            )
        else:
            query = query.filter(
                Interaction.agent_id == user_id
            )

        interactions = (
            query.options(
                joinedload(Interaction.agent),
                joinedload(Interaction.lead),
                joinedload(Interaction.tags)
                    .joinedload(InteractionTag.tag)
            )
            .order_by(desc(Interaction.created_at))
            .all()
        )

        result = []

        for interaction in interactions:
            data = interaction.to_dict()

            # agent info
            data["agent"] = (
                interaction.agent.to_dict()
                if interaction.agent else None
            )

            # only lead name
            data["lead_name"] = (
                interaction.lead.name
                if interaction.lead else None
            )

            result.append(data)

        return True, result, None

    except Exception as e:
        return False, None, str(e)
