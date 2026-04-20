import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from auth import get_password_hash

def create_initial_admin(username, password):
    db: Session = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
        if existing_admin:
            print(f"Admin '{username}' already exists.")
            return

        # Create new admin
        hashed_pw = get_password_hash(password)
        new_admin = models.AdminUser(
            username=username,
            hashed_password=hashed_pw,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print(f"✅ Admin user '{username}' created successfully!")
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Default credentials for setup - User should change these immediately
    admin_user = os.getenv("INITIAL_ADMIN_USER", "admin")
    admin_pass = os.getenv("INITIAL_ADMIN_PASSWORD", "GovAdmin2026!")
    
    create_initial_admin(admin_user, admin_pass)
