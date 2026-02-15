"""Flask application entry point."""
from __future__ import annotations

import logging
from flask import Flask

from webhook import webhook_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(webhook_bp)

    @app.route("/")
    def healthcheck():
        return "WhatsApp Bot Template is running."

    return app


app = create_app()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,  # Changed to DEBUG for more details
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    app.run(port=6000, debug=True)
