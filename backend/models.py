from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, default=False)   # True after OTP verified
    is_admin        = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    otps    = relationship("OTP",     back_populates="user", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name           = Column(String(150), nullable=True)
    phone               = Column(String(20),  nullable=True)
    # Farmer-specific fields
    village             = Column(String(100), nullable=True)
    district            = Column(String(100), nullable=True)
    state               = Column(String(100), nullable=True)
    crop_type           = Column(String(100), nullable=True)   # primary crop
    land_holding_acres  = Column(Float,       nullable=True)
    farming_stage       = Column(String(50),  nullable=True)   # e.g. sowing, growing, harvest
    preferred_language  = Column(String(20),  default="en")

    user = relationship("User", back_populates="profile")


class OTP(Base):
    __tablename__ = "user_otps"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    otp_code   = Column(String(10), nullable=False)
    purpose    = Column(String(50), default="registration")
    expires_at = Column(DateTime,   nullable=False)

    user = relationship("User", back_populates="otps")
