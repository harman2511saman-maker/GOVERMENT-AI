from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime
import pgvector.sqlalchemy

class AdminUser(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    department = Column(String(100), index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_text = Column(Text)
    # Using pgvector to store 768 dimensional embeddings for Google models
    embedding = Column(pgvector.sqlalchemy.Vector(768))
    
    document = relationship("Document", backref="chunks")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(50), primary_key=True, index=True) # UUID for session_id
    user_id = Column(String(100), index=True) # UUID from LocalStorage
    title = Column(String(200), default="چاتی نوێ")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.datetime.utcnow)

    messages = relationship("ChatMessage", backref="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20)) # 'user' or 'bot'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Feedback tracking
    feedback_score = Column(Integer, default=0) # 1 for like, -1 for dislike, 0 for none
    feedback_note = Column(Text, nullable=True) # Text if they explain why they disliked

class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MissedQuestion(Base):
    __tablename__ = "missed_questions"

    id = Column(Integer, primary_key=True, index=True)
    query_text = Column(String(500), unique=True, index=True)
    occurrence_count = Column(Integer, default=1)
    last_asked = Column(DateTime, default=datetime.datetime.utcnow)
