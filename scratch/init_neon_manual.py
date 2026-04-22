import os
import sys
from sqlalchemy import text, create_engine

# Manually set environment variables
os.environ["DATABASE_URL"] = "postgresql+pg8000://neondb_owner:npg_zgR8UySblQc2@ep-noisy-violet-amus6pxs.c-5.us-east-1.aws.neon.tech/neondb"
os.environ["GROQ_API_KEY"] = "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"
os.environ["JWT_SECRET_KEY"] = "9e8b7c6d5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8"
os.environ["JWT_ALGORITHM"] = "HS256"

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Monkey-patch load_dotenv to do nothing
import dotenv
dotenv.load_dotenv = lambda **kwargs: None

import models
from database import engine, Base, SessionLocal
from auth import get_password_hash

def init_neon_db():
    print("Initializing Neon Database (Manual ENV)...")
    
    try:
        with engine.connect() as conn:
            print("  - Creating 'vector' extension...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
            
        print("  - Creating all tables...")
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error during table creation: {e}")
        return

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
            print(f"Admin user '{username}' created successfully!")
        else:
            print(f"Admin user '{username}' already exists.")
            
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_neon_db()
