"""
admin.py — Admin-only API routes for managing users and viewing platform stats.
All endpoints require a valid JWT from an is_admin=True account.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
import models
from auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Admin dependency ──────────────────────────────────────────────────────────

def require_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required.")
    return current_user


def _user_dict(u: models.User, p: Optional[models.Profile]) -> dict:
    return {
        "id":                 u.id,
        "email":              u.email,
        "is_active":          u.is_active,
        "is_admin":           u.is_admin,
        "created_at":         u.created_at.isoformat() if u.created_at else None,
        "full_name":          p.full_name          if p else None,
        "phone":              p.phone              if p else None,
        "village":            p.village            if p else None,
        "state":              p.state              if p else None,
        "crop_type":          p.crop_type          if p else None,
        "land_holding_acres": p.land_holding_acres if p else None,
        "preferred_language": p.preferred_language if p else "en",
    }


# ── Schemas ───────────────────────────────────────────────────────────────────

class RoleUpdate(BaseModel):
    is_admin: bool

class StatusUpdate(BaseModel):
    is_active: bool

class AdminUserEdit(BaseModel):
    full_name:           Optional[str]   = None
    phone:               Optional[str]   = None
    village:             Optional[str]   = None
    state:               Optional[str]   = None
    crop_type:           Optional[str]   = None
    land_holding_acres:  Optional[float] = None
    is_admin:            Optional[bool]  = None
    is_active:           Optional[bool]  = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def platform_stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    total   = db.query(models.User).count()
    active  = db.query(models.User).filter(models.User.is_active == True).count()
    pending = db.query(models.User).filter(models.User.is_active == False).count()
    admins  = db.query(models.User).filter(models.User.is_admin  == True).count()
    return {"total_users": total, "active_users": active, "pending_verification": pending, "admin_count": admins}


@router.get("/users")
def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    result = []
    for u in users:
        p = db.query(models.Profile).filter(models.Profile.user_id == u.id).first()
        result.append(_user_dict(u, p))
    return {"users": result}


@router.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found.")
    p = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    return _user_dict(u, p)


@router.patch("/users/{user_id}/role")
def update_role(user_id: int, payload: RoleUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found.")
    if u.id == admin.id:
        raise HTTPException(400, "Cannot modify your own admin role.")
    u.is_admin = payload.is_admin
    db.commit()
    return {"message": f"{'Promoted to Admin' if payload.is_admin else 'Revoked Admin'} for {u.email}"}


@router.patch("/users/{user_id}/status")
def update_status(user_id: int, payload: StatusUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found.")
    if u.id == admin.id:
        raise HTTPException(400, "Cannot modify your own account status.")
    u.is_active = payload.is_active
    db.commit()
    return {"message": f"{'Activated' if payload.is_active else 'Suspended'} account for {u.email}"}


@router.patch("/users/{user_id}/edit")
def edit_user(user_id: int, payload: AdminUserEdit, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found.")

    if payload.is_admin is not None and u.id != admin.id:
        u.is_admin = payload.is_admin
    if payload.is_active is not None and u.id != admin.id:
        u.is_active = payload.is_active

    p = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    if not p:
        p = models.Profile(user_id=user_id)
        db.add(p)

    for field in ("full_name", "phone", "village", "state", "crop_type", "land_holding_acres"):
        val = getattr(payload, field)
        if val is not None:
            setattr(p, field, val)

    db.commit()
    p2 = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    return {"message": "User updated.", "user": _user_dict(u, p2)}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found.")
    if u.id == admin.id:
        raise HTTPException(400, "Cannot delete your own admin account.")
    email = u.email
    db.delete(u)
    db.commit()
    return {"message": f"User '{email}' permanently deleted."}
