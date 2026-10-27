import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from auth import get_password_hash

def set_admin(username, password):
    db: Session = SessionLocal()
    try:
        existing_admin = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
        hashed_pw = get_password_hash(password)
        if existing_admin:
            existing_admin.hashed_password = hashed_pw
            db.commit()
            print(f"✅ پاسوۆردی ئەدمینی '{username}' بە سەرکەوتوویی گۆڕدرا!")
            return

        new_admin = models.AdminUser(
            username=username,
            hashed_password=hashed_pw,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print(f"✅ ئەدمینی نوێ '{username}' بە سەرکەوتوویی دروستکرا!")
    except Exception as e:
        print(f"❌ هەڵە لە دانانی ئەدمین: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        user = sys.argv[1]
        pw = sys.argv[2]
        set_admin(user, pw)
    else:
        admin_user = os.getenv("INITIAL_ADMIN_USER", "admin")
        admin_pass = os.getenv("INITIAL_ADMIN_PASSWORD", "GovAdmin2026!")
        set_admin(admin_user, admin_pass)
