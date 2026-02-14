"""Interaction service with business logic"""
from database import db
from models import Interaction, InteractionTag, Lead, Tag, User
from models.all_enums import LeadState
from utils.validators import validate_email, validate_phone, validate_name
from typing import Tuple, Optional, Dict


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
    """
    Add/Update interaction for a lead. Creates lead if not exists, otherwise updates or creates based on conditions.
    
    Logic:
    1. Check if lead exists by mobNo and orgId (from agent's org)
    2. If NOT EXISTS:
       - Create interaction with tags
       - Create lead with ownerId=agentId, orgId=user.orgId, state=interaction
    3. If EXISTS (lead found):
       - If userId == ownerId: Update the latest interaction with provided fields (tags, score, image_url, audio_url, remarks)
       - Else if state == interaction: Create new interaction (check score for owner update)
       - Else (state != interaction): Create new interaction with message, no owner change
    
    Args:
        agent_id: ID of agent adding interaction (from JWT token)
        name: Lead name
        mobNo: Lead mobile number
        tagIds: List of tag IDs for scoring (optional, required only for creation)
        email: Lead email (optional)
        image_url: Interaction image URL (optional)
        audio_url: Interaction audio URL (optional)
        remarks: Interaction remarks (optional)
    
    Returns:
        Tuple of (success, interaction_data, error_message)
    """
    
    try:
        # Get agent user to access orgId
        agent = User.query.get(agent_id)
        if not agent:
            return False, None, "Agent user not found"
        
        # Validate required fields
        is_valid, error = validate_name(name)
        if not is_valid:
            return False, None, error
        
        is_valid, error = validate_phone(mobNo)
        if not is_valid:
            return False, None, error
        if mode not in ["stall", "field"]:
            return False, None, "Invalid mode"
        lead = Lead.query.filter_by(
            mobNo=mobNo.strip(),
            orgId=agent.orgId
        ).first()
        
        # Check if tagIds is required for new lead creation
        if not lead and not tagIds:
            return False, None, "tagIds is required when creating a new lead"
        
        # Validate tagIds (optional but if provided must be non-empty)
        new_score = 0
        tags = []
        if tagIds:
            if not isinstance(tagIds, list) or len(tagIds) == 0:
                return False, None, "tagIds must be a non-empty array"
            
            # Fetch all tags and calculate score
            tags = Tag.query.filter(Tag.id.in_(tagIds)).all()
            if len(tags) != len(tagIds):
                return False, None, "One or more tag IDs are invalid"
            
            new_score = sum(tag.score for tag in tags)
        
        # Check if lead exists
        
        
        # ===== CASE 1: Lead does not exist =====
        if not lead:
            # Create new lead
            lead = Lead(
                name=name.strip(),
                email=email.strip() if email else f"{mobNo.strip()}@temp.email",
                mobNo=mobNo.strip(),
                ownerId=agent_id,
                orgId=agent.orgId,
                state=LeadState.INTERACTION
            )
            db.session.add(lead)
            db.session.flush()  # Get lead ID
            
            # Create interaction
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
            
            # Create interaction tags
            for tag in tags:
                interaction_tag = InteractionTag(
                    interaction_id=interaction.id,
                    tag_id=tag.id
                )
                db.session.add(interaction_tag)
            
            db.session.commit()
            
            return True, interaction.to_dict(), None
        
        # After lead check, check again if tagIds required for creation
        if agent_id != lead.ownerId and lead.state.value != 'INTERACTION' and not tagIds:
            return False, None, "tagIds is required for creating new interactions"
        
        # ===== CASE 2: Lead exists =====
        
        # Sub-case 2a: userId == ownerId → Update existing interaction (only provided fields)
        if agent_id == lead.ownerId:
            # Get the latest interaction for this lead
            last_interaction = Interaction.query.filter_by(
                lead_id=lead.id
            ).order_by(Interaction.created_at.desc()).first()
            
            if last_interaction:
                # Update fields that are present in request
                
                # Update tags if provided
                if tagIds:
                    # Delete old tags for this interaction
                    InteractionTag.query.filter_by(interaction_id=last_interaction.id).delete()
                    
                    # Add new tags
                    for tag in tags:
                        interaction_tag = InteractionTag(
                            interaction_id=last_interaction.id,
                            tag_id=tag.id
                        )
                        db.session.add(interaction_tag)
                    
                    # Update score
                    last_interaction.score = new_score
                
                # Update other fields if provided
                if image_url is not None:
                    last_interaction.image_url = image_url
                
                if audio_url is not None:
                    last_interaction.audio_note_url = audio_url
                
                if remarks is not None:
                    last_interaction.remarks = remarks
                
                db.session.commit()
                
                return True, last_interaction.to_dict(), None
            else:
                # No previous interaction, create one if tagIds provided
                if not tagIds:
                    return False, None, "No existing interaction and tagIds not provided for creating new interaction"
                
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
                
                # Create interaction tags
                for tag in tags:
                    interaction_tag = InteractionTag(
                        interaction_id=interaction.id,
                        tag_id=tag.id
                    )
                    db.session.add(interaction_tag)
                
                db.session.commit()
                
                return True, interaction.to_dict(), None
        
        # Sub-case 2b: state != interaction (still create interaction, but cannot change owner)
        if lead.state.value != LeadState.INTERACTION:
            # Create interaction anyway, just don't change owner
            interaction = Interaction(
                lead_id=lead.id,
                agent_id=agent_id,
                mode=mode,  # Default mode
                image_url=image_url,
                audio_note_url=audio_url,
                remarks=remarks,
                score=new_score
            )
            db.session.add(interaction)
            db.session.flush()
            
            # Create interaction tags
            for tag in tags:
                interaction_tag = InteractionTag(
                    interaction_id=interaction.id,
                    tag_id=tag.id
                )
                db.session.add(interaction_tag)
            
            db.session.commit()
            
            # Return success with message that owner couldn't be changed
            result = interaction.to_dict()
            result['message'] = f"Interaction added successfully. Lead state is {lead.state.value}, owner cannot be changed."
            return True, result, None
        
        # Sub-case 2b: state == interaction
        # Get previous interaction
        previous_interaction = Interaction.query.filter_by(
            lead_id=lead.id,
            agent_id=lead.ownerId
        ).order_by(Interaction.created_at.desc()).first()
        
        previous_score = previous_interaction.score if previous_interaction else 0
        
        # Check if new score > previous_score + 5
        if new_score > (previous_score + 5):
            # Update lead owner
            lead.ownerId = agent_id
        
        # Create interaction
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
        
        # Create interaction tags
        for tag in tags:
            interaction_tag = InteractionTag(
                interaction_id=interaction.id,
                tag_id=tag.id
            )
            db.session.add(interaction_tag)
        
        db.session.commit()
        
        return True, interaction.to_dict(), None
    
    except Exception as e:
        db.session.rollback()
        return False, None, f"Failed to add interaction: {str(e)}"
