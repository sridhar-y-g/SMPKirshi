"""
profile.py — Farmer profile CRUD (view + update own profile).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
import models
from auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["Profile"])


class ProfileUpdate(BaseModel):
    full_name:           Optional[str]   = None
    phone:               Optional[str]   = None
    village:             Optional[str]   = None
    district:            Optional[str]   = None
    state:               Optional[str]   = None
    crop_type:           Optional[str]   = None
    land_holding_acres:  Optional[float] = None
    farming_stage:       Optional[str]   = None
    preferred_language:  Optional[str]   = None


def _profile_response(user: models.User, profile: Optional[models.Profile]) -> dict:
    return {
        "id":                  user.id,
        "email":               user.email,
        "is_admin":            user.is_admin,
        "full_name":           profile.full_name          if profile else None,
        "phone":               profile.phone              if profile else None,
        "village":             profile.village            if profile else None,
        "district":            profile.district           if profile else None,
        "state":               profile.state              if profile else None,
        "crop_type":           profile.crop_type          if profile else None,
        "land_holding_acres":  profile.land_holding_acres if profile else None,
        "farming_stage":       profile.farming_stage      if profile else None,
        "preferred_language":  profile.preferred_language if profile else "en",
    }


@router.get("/")
def get_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if not profile:
        profile = models.Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return _profile_response(current_user, profile)


@router.put("/")
def update_profile(
    updates: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if not profile:
        profile = models.Profile(user_id=current_user.id)
        db.add(profile)

    for field, value in updates.dict(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return {"message": "Profile updated successfully.", "profile": _profile_response(current_user, profile)}
