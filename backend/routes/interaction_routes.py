from flask import Blueprint, request, jsonify

from services.auth import get_current_user
from services.interaction import (
    add_interaction,
    get_all_leads,
    get_all_interactions,
    get_agents_for_lead,
    change_lead_owner,
    change_lead_state
)

from utils.validators import validate_required_fields


interaction_bp = Blueprint(
    "interactions",
    __name__,
    url_prefix="/api/interactions"
)


# =====================================================
# AUTH HELPER
# =====================================================
def get_user_from_request():
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        return None, jsonify({
            "success": False,
            "error": "Missing authorization token"
        }), 401

    token = auth_header.split(" ")[1]
    user = get_current_user(token)

    if not user:
        return None, jsonify({
            "success": False,
            "error": "Invalid or expired token"
        }), 401

    return user, None, None


# =====================================================
# CREATE INTERACTION
# =====================================================
@interaction_bp.route("", methods=["POST"])
def create_interaction():

    user, error_resp, status = get_user_from_request()
    if not user:
        return error_resp, status

    data = request.get_json() or {}

    valid, error = validate_required_fields(
        data,
        ["name", "mobNo", "tagIds"]
    )

    if not valid:
        return jsonify({"success": False, "error": error}), 400

    success, result, error = add_interaction(
        agent_id=user.id,
        name=data.get("name"),
        mobNo=data.get("mobNo"),
        mode=data.get("mode", "field") ,
        tagIds=data.get("tagIds"),
        email=data.get("email"),
        image_url=data.get("image_url"),
        audio_url=data.get("audio_url"),
        remarks=data.get("remarks"),
         # default to stall if not provided
    )

    if not success:
        return jsonify({"success": False, "error": error}), 400

    return jsonify({"success": True, "data": result}), 200


# =====================================================
# GET LEADS
# =====================================================
@interaction_bp.route("/leads", methods=["GET"])
def fetch_leads():

    user, error_resp, status = get_user_from_request()
    if not user:
        return error_resp, status

    success, data, error = get_all_leads(user.id)

    if not success:
        return jsonify({"success": False, "error": error}), 500

    return jsonify({"success": True, "data": data}), 200


# =====================================================
# GET INTERACTIONS
# =====================================================
@interaction_bp.route("/all", methods=["GET"])
def fetch_interactions():

    user, error_resp, status = get_user_from_request()
    if not user:
        return error_resp, status

    success, data, error = get_all_interactions(user.id)

    if not success:
        return jsonify({"success": False, "error": error}), 500

    return jsonify({"success": True, "data": data}), 200


# =====================================================
# GET AGENTS FOR A LEAD
# =====================================================
@interaction_bp.route("/leads/<int:lead_id>/agents", methods=["GET"])
def fetch_agents_for_lead(lead_id):
    """Get all agents who have interacted with a lead (admin only)"""
    
    user, error_resp, status = get_user_from_request()
    if not user:
        return error_resp, status
    
    success, agents, error = get_agents_for_lead(user.id, lead_id)
    
    if not success:
        status_code = 403 if "admin" in error else (404 if "not found" in error.lower() else 500)
        return jsonify({"success": False, "error": error}), status_code
    
    return jsonify({"success": True, "data": agents}), 200


# =====================================================
# CHANGE LEAD OWNER
# =====================================================
@interaction_bp.route("/leads/<int:lead_id>/owner", methods=["PUT"])
def update_lead_owner(lead_id):
    """Change the owner of a lead (admin only)"""
    
    user, error_resp, status = get_user_from_request()
    if not user:
        return error_resp, status
    
    data = request.get_json() or {}
    
    # Validate required fields
    if "new_owner_id" not in data:
        return jsonify({
            "success": False,
            "error": "Missing required field: new_owner_id"
        }), 400
    
    success, lead_data, error = change_lead_owner(user.id, lead_id, data.get("new_owner_id"))
    
    if not success:
        status_code = 403 if "admin" in error else (404 if "not found" in error.lower() else 400)
        return jsonify({"success": False, "error": error}), status_code
    
    return jsonify({"success": True, "data": lead_data}), 200


# =====================================================
# CHANGE LEAD STATE
# =====================================================
@interaction_bp.route("/leads/<int:lead_id>/state", methods=["PUT"])
def update_lead_state(lead_id):
    """Change the state of a lead (admin or lead owner)"""
    
    user, error_resp, status = get_user_from_request()
    if not user:
        return error_resp, status
    
    data = request.get_json() or {}
    
    # Validate required fields
    if "state" not in data:
        return jsonify({
            "success": False,
            "error": "Missing required field: state"
        }), 400
    
    success, lead_data, error = change_lead_state(user.id, lead_id, data.get("state"))
    
    if not success:
        # Determine appropriate status code
        is_permission_error = "admin" in error or "owner" in error
        status_code = 403 if is_permission_error else (404 if "not found" in error.lower() else 400)
        return jsonify({"success": False, "error": error}), status_code
    
    return jsonify({"success": True, "data": lead_data}), 200
