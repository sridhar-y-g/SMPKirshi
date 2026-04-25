"""
auth.py — Registration, OTP verification, Login, and JWT-protected /me endpoint.
"""
import os
import random
import smtplib
import logging
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()
from database import get_db
import models, security

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""

class OTPVerify(BaseModel):
    email: EmailStr
    otp_code: str


# ── JWT dependency ────────────────────────────────────────────────────────────

def get_current_user(
    token: str = Depends(security.oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise exc
    except JWTError:
        raise exc
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise exc
    return user


# ── OTP helpers ───────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _build_otp_email(otp_code: str, farmer_name: str = "Farmer") -> str:
    digits = list(otp_code)
    digit_boxes = "".join([
        f'<td style="width:52px;height:64px;background:#14532d;border:2px solid #16a34a;border-radius:12px;'
        f'text-align:center;vertical-align:middle;font-size:32px;font-weight:800;color:#86efac;'
        f'font-family:monospace;padding:0 4px;">{d}</td>'
        f'<td style="width:8px;"></td>'
        for d in digits
    ])
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Sampoorna Krishi Verification</title></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:linear-gradient(135deg,#15803d,#16a34a);border-radius:16px;padding:12px 28px;">
              <span style="font-size:22px;font-weight:900;color:#fff;">🌿 Sampoorna Krishi</span>
              <span style="font-size:11px;color:#bbf7d0;display:block;text-align:center;letter-spacing:3px;margin-top:2px;">AI-POWERED FARM PLATFORM</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#fff;border-radius:24px;border:1px solid #bbf7d0;overflow:hidden;">

          <!-- Green top bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#15803d,#16a34a,#84cc16);"></td></tr>

          <!-- Body -->
          <tr><td style="padding:48px 48px 40px;">
            <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#14532d;">Namaste, {farmer_name}! 🙏</p>
            <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.6;">
              Welcome to Sampoorna Krishi! Enter your verification code below to activate your account and access AI-powered farming tools.
            </p>

            <!-- OTP Boxes -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>{digit_boxes}</tr>
            </table>

            <!-- Expiry notice -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr><td style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;">
                <span style="font-size:13px;color:#a16207;font-weight:600;">⏰ This code expires in {security.OTP_EXPIRE_MINUTES} minutes.</span>
                <span style="font-size:13px;color:#92400e;"> Do not share it with anyone.</span>
              </td></tr>
            </table>

            <hr style="border:none;border-top:1px solid #d1fae5;margin:0 0 24px;"/>
            <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
              🔒 If you did not create a Sampoorna Krishi account, please ignore this email.
            </p>
          </td></tr>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:12px;color:#6b7280;">Sampoorna Krishi — AI-Powered FinTech Platform for Indian Farmers</p>
          <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">© 2025 Sampoorna Krishi. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send_otp_email(to_email: str, otp_code: str, farmer_name: str = "Farmer"):
    smtp_pwd  = os.getenv("SMTP_PASSWORD", "")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))

    if smtp_pwd and smtp_user and smtp_pwd != "your_app_password":
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "🌿 Sampoorna Krishi — Your Verification Code"
            msg["From"]    = f"Sampoorna Krishi <{smtp_user}>"
            msg["To"]      = to_email

            plain = f"Your Sampoorna Krishi OTP is: {otp_code}\nExpires in {security.OTP_EXPIRE_MINUTES} minutes."
            msg.attach(MIMEText(plain, "plain"))
            msg.attach(MIMEText(_build_otp_email(otp_code, farmer_name), "html"))

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.ehlo(); server.starttls(); server.ehlo()
                server.login(smtp_user, smtp_pwd)
                server.sendmail(smtp_user, to_email, msg.as_string())

            logger.info(f"OTP email sent to {to_email}")
            return

        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP auth failed — check Gmail App Password in backend/.env")
        except Exception as e:
            logger.error(f"Email send error: {e}")

    # Fallback: print to terminal
    print(f"\n{'='*50}")
    print(f"  📧  OTP FOR {to_email}")
    print(f"  Code: {otp_code}  (valid {security.OTP_EXPIRE_MINUTES} min)")
    print(f"{'='*50}\n")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    hashed = security.get_password_hash(user_in.password)
    new_user = models.User(email=user_in.email, hashed_password=hashed, is_active=False)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create profile with name from registration
    profile = models.Profile(user_id=new_user.id, full_name=user_in.full_name or None)
    db.add(profile)

    # OTP
    otp_code = _generate_otp()
    expires  = datetime.utcnow() + timedelta(minutes=security.OTP_EXPIRE_MINUTES)
    db.add(models.OTP(user_id=new_user.id, otp_code=otp_code, expires_at=expires, purpose="registration"))
    db.commit()

    _send_otp_email(new_user.email, otp_code, user_in.full_name or "Farmer")
    return {"message": "Registered! Check your email for the OTP.", "email": new_user.email}


@router.post("/verify-otp")
def verify_otp(payload: OTPVerify, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    otp = db.query(models.OTP).filter(
        models.OTP.user_id == user.id,
        models.OTP.otp_code == payload.otp_code,
    ).first()

    if not otp or otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    user.is_active = True
    db.delete(otp)
    db.commit()
    return {"message": "Account activated! You can now log in."}


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account not verified. Please check your email for the OTP.")

    token = security.create_access_token(
        data={"sub": user.email, "is_admin": user.is_admin},
        expires_delta=timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer", "is_admin": user.is_admin}


@router.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
    }
