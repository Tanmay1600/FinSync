"""added concurrent unique constraint

Revision ID: 9709139c9778
Revises: 92b51e138bdd
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '9709139c9778'
down_revision = '92b51e138bdd'
branch_labels = None
depends_on = None


# =========================================================
# UPGRADE
# =========================================================
def upgrade():

    # -----------------------------------------------------
    # 1️⃣ Create ENUM type safely
    # -----------------------------------------------------
    leadstate_enum = postgresql.ENUM(
        'INTERACTION',
        'FOLLOW_UP',
        'ENGAGED',
        'MEETING',
        'OUTCOME',
        'CLOSED',
        name='leadstate'
    )

    leadstate_enum.create(op.get_bind(), checkfirst=True)

    # -----------------------------------------------------
    # 2️⃣ Convert VARCHAR → ENUM safely
    # -----------------------------------------------------
    op.execute("""
        ALTER TABLE leads
        ALTER COLUMN state TYPE leadstate
        USING state::leadstate
    """)

    # -----------------------------------------------------
    # 3️⃣ Add UNIQUE constraint (DEDUP FIX)
    # -----------------------------------------------------
    op.create_unique_constraint(
        "uq_lead_mobile_org",
        "leads",
        ["mobNo", "orgId"]
    )


# =========================================================
# DOWNGRADE
# =========================================================
def downgrade():

    # remove constraint
    op.drop_constraint(
        "uq_lead_mobile_org",
        "leads",
        type_="unique"
    )

    # revert enum → varchar
    op.execute("""
        ALTER TABLE leads
        ALTER COLUMN state TYPE VARCHAR(20)
    """)

    # drop enum type
    postgresql.ENUM(name="leadstate").drop(
        op.get_bind(),
        checkfirst=True
    )
