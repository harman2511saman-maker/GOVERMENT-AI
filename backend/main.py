from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database import engine, get_db, Base
import models
import os
from dotenv import load_dotenv

load_dotenv()

# Create all tables
try:
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables ready.")
except Exception as e:
    print("⚠️ Warning: Database issue:", e)

app = FastAPI(title="Government AI System - Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────── Chat endpoint ───────────────────────

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def root():
    return {"message": "Government AI API is running ✅"}

@app.get("/api/health")
def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "healthy", "database": db_status}


@app.post("/api/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    user_question = req.message.strip()
    if not user_question:
        raise HTTPException(status_code=400, detail="پرسیار بەتاڵە")

    context_text = ""

    # ── Step 1: try vector search ───────────────────────────────
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
        embeddings_model = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        query_embedding = embeddings_model.embed_query(user_question)

        # pgvector cosine similarity search (top 4 chunks)
        results = db.execute(
            text("""
                SELECT chunk_text,
                       1 - (embedding <=> CAST(:emb AS vector)) AS similarity
                FROM document_chunks
                ORDER BY embedding <=> CAST(:emb AS vector)
                LIMIT 4
            """),
            {"emb": str(query_embedding)}
        ).fetchall()

        if results:
            context_text = "\n\n".join([row[0] for row in results])
    except Exception as e:
        print(f"Vector search failed (continuing without context): {e}")

    # ── Step 2: call Groq (Llama 3.3) ───────────────────────────
    try:
        from langchain_groq import ChatGroq
        
        llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY", ""),
            model_name="llama-3.3-70b-versatile",
            temperature=0
        )

        if context_text:
            system_prompt = "تۆ یاریدەدەری فەرمی حکومەتی هەرێمی کوردستانی. بەپێی زانیارییەکان وەڵام بدەرەوە بە کوردی (سۆرانی) بە شێوەیەکی ڕوون و فەرمی."
            user_prompt = f"زانیاری:\n{context_text}\n\nپرسیار: {user_question}\n\nوەڵام:"
        else:
            system_prompt = "تۆ یاریدەدەری فەرمی حکومەتی هەرێمی کوردستانی. وەڵامی پرسیارەکان بدەرەوە بە کوردی (سۆرانی) بە شێوەیەکی ڕوون و فەرمی."
            user_prompt = f"پرسیار: {user_question}\n\nوەڵام:"

        messages = [
            ("system", system_prompt),
            ("human", user_prompt),
        ]
        
        response = llm.invoke(messages)
        answer = response.content

    except Exception as e:
        print(f"Groq error: {e}")
        answer = "ببورە، ئێستا کێشەیەک هەیە لە پەیوەندیکردن بە سێرڤەری AI. تکایە دواتر هەوڵ بدەرەوە."

    return {"answer": answer}
