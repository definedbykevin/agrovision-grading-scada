import logging

from flask import Flask
from flask_cors import CORS

from config.settings import Settings
from core.runtime import classification_runtime
from routes.api import api_blueprint


logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s")


def create_app() -> Flask:
    app = Flask(__name__)
    origins = Settings.CORS_ORIGINS if Settings.CORS_ORIGINS == "*" else Settings.CORS_ORIGINS.split(",")
    CORS(app, resources={r"/api/threshing-ebc/*": {"origins": origins}})
    app.register_blueprint(api_blueprint)
    classification_runtime.start()
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Settings.PORT, debug=Settings.FLASK_ENV == "development", threaded=True, use_reloader=False)
