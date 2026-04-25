"""
main.py — Sampoorna Krishi FastAPI application entry point.
Run with: uvicorn main:app --reload --port 8000
"""
import os
import smtplib
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

from database import engine
import models
import auth
import profile
import admin

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Startup checks ────────────────────────────────────────────────────────────

# 1. Database
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("[OK] MySQL connected to 'Sampoorna_Krishi' database.")
except Exception as e:
    logger.error(f"[ERROR] MySQL connection failed: {e}")
    logger.error("    -> Check DATABASE_URL in backend/.env and ensure MySQL is running.")

# 2. Email
smtp_user = os.getenv("SMTP_USER", "")
smtp_pwd  = os.getenv("SMTP_PASSWORD", "")
if smtp_user and smtp_pwd:
    try:
        with smtplib.SMTP(os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", 587))) as s:
            s.starttls()
            s.login(smtp_user, smtp_pwd)
        logger.info("[OK] Gmail SMTP connected - OTP emails will be sent.")
    except Exception as e:
        logger.warning(f"[WARN] Gmail SMTP failed ({e}). OTPs will print to console instead.")
else:
    logger.warning("[WARN] SMTP credentials not set - OTPs will print to console.")

# ── Auto-create tables ────────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=engine)
logger.info("[OK] Database tables verified/created.")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sampoorna Krishi API",
    description="Backend for the Sampoorna Krishi AI-Powered FinTech Platform for Indian Farmers",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9002", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(admin.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Sampoorna Krishi API", "version": "1.0.0"}
