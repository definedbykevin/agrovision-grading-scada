# WSGI Runner for PM2 / Gunicorn Production Deployment
from app import app

if __name__ == "__main__":
    app.run()
