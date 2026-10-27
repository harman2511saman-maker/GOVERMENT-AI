import sys
import os
from database import SessionLocal
import models
from auth import get_password_hash

def change_admin(username, new_password):
    db = SessionLocal()
    try:
        admin = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
        if not admin:
            admin = db.query(models.AdminUser).first()
        if not admin:
            print("❌ هیچ بەکارهێنەرێکی ئەدمین نەدۆزرایەوە!")
            return
        admin.hashed_password = get_password_hash(new_password)
        db.commit()
        print(f"✅ پاسوۆردی ئەدمینی '{admin.username}' بە سەرکەوتوویی نوێکرایەوە!")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 2:
        change_admin(sys.argv[1], sys.argv[2])
    elif len(sys.argv) == 2:
        change_admin("admin", sys.argv[1])
    else:
        print("بەکارهێنان: python change_admin.py <new_password>")
