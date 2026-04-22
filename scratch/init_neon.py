import os
import sys
from sqlalchemy import text, create_engine
from dotenv import load_dotenv

# Add backend to path to import models and auth
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import models
from database import engine, Base, SessionLocal
from auth import get_password_hash

load_dotenv()

def init_neon_db():
    print("🚀 Initializing Neon Database...")
    
    # 1. Create Extension and Tables
    try:
        with engine.connect() as conn:
            print("  - Creating 'vector' extension...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
            
        print("  - Creating all tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully.")
    except Exception as e:
        print(f"❌ Error during table creation: {e}")
        return

    # 2. Create Admin User
    db = SessionLocal()
    try:
        username = "admin"
        password = "GovAdmin2026!"
        
        existing_admin = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
        if not existing_admin:
            print(f"  - Creating admin user '{username}'...")
            hashed_pw = get_password_hash(password)
            new_admin = models.AdminUser(
                username=username,
                hashed_password=hashed_pw,
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print(f"✅ Admin user '{username}' created successfully!")
        else:
            print(f"ℹ️ Admin user '{username}' already exists.")
            
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_neon_db()
