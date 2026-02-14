from flask import Blueprint, request, jsonify

from services.auth import get_current_user
from services.admin import get_org_agents_summary


admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin"
)


# =====================================================
# AUTH HELPER
# =====================================================
def get_admin_from_request():
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

    # ✅ Admin check
    if user.role != "admin":
        return None, jsonify({
            "success": False,
            "error": "Admin access required"
        }), 403

    return user, None, None


# =====================================================
# GET AGENT ANALYTICS (ADMIN ONLY)
# =====================================================
@admin_bp.route("/agents-summary", methods=["GET"])
def fetch_agents_summary():
    """
    Returns analytics of all agents in admin's organization.

    Output per agent:
        name
        email
        mobNo
        no_of_interactions
        no_of_leads
    """

    user, error_resp, status = get_admin_from_request()
    if not user:
        return error_resp, status

    success, data, error = get_org_agents_summary(user.id)

    if not success:
        return jsonify({
            "success": False,
            "error": error
        }), 500

    return jsonify({
        "success": True,
        "data": data
    }), 200
