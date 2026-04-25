"""
create_admin.py — One-time script to create or promote an admin account.

Usage:
    python create_admin.py --email admin@sampoorna.com --password Admin@1234
"""
import argparse, sys
from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal, engine
import models, security

models.Base.metadata.create_all(bind=engine)

def make_admin(email: str, password: str):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            user.is_admin  = True
            user.is_active = True
            db.commit()
            print(f"\n[OK] Existing user '{email}' promoted to ADMIN.\n")
        else:
            hashed = security.get_password_hash(password)
            user = models.User(email=email, hashed_password=hashed, is_active=True, is_admin=True)
            db.add(user); db.commit(); db.refresh(user)
            p = models.Profile(user_id=user.id, full_name="Administrator", preferred_language="en")
            db.add(p); db.commit()
            print(f"\n[OK] Admin account created!")
            print(f"    Email    : {email}")
            print(f"    Password : (as provided)")
            print(f"    Role     : Admin (no OTP required)\n")
    except Exception as e:
        print(f"\n[ERROR] Error: {e}\n"); sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or promote admin user.")
    parser.add_argument("--email",    required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()
    make_admin(args.email, args.password)
