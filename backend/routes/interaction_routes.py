from flask import Blueprint, request, jsonify

from services.auth import get_current_user
from services.interaction import (
    add_interaction,
    get_all_leads,
    get_all_interactions
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
        tagIds=data.get("tagIds"),
        email=data.get("email"),
        image_url=data.get("image_url"),
        audio_url=data.get("audio_url"),
        remarks=data.get("remarks"),
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
