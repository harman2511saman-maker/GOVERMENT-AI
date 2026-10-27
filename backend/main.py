import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from database import engine, get_db, Base
from auth import get_current_admin, create_access_token, verify_password
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
import models
from models import Document, DocumentChunk, ChatSession, ChatMessage, Suggestion
import os
import uuid
import datetime
import re
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

# --- Shared AI Components ---
# Initialize embeddings singleton (Google Multi-lingual model or deterministic fallback)
google_api_key = os.getenv("GOOGLE_API_KEY")
if google_api_key:
    embeddings_model = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=google_api_key)
else:
    class FallbackEmbeddings:
        def embed_query(self, text: str):
            import hashlib
            h = hashlib.sha256(text.encode('utf-8')).digest()
            vec = [(b / 255.0) for b in h]
            return (vec * 24)[:768]
        def embed_documents(self, texts: list):
            return [self.embed_query(t) for t in texts]
    embeddings_model = FallbackEmbeddings()
    print("ℹ️ GOOGLE_API_KEY not found in .env; using fallback embeddings model.")

# Updated chunking for better legal/gov context (Suggested: 500-800 size, 50-100 overlap)
text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)

# Load threshold from .env for dynamic tuning
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.28"))
print(f"🔍 AI Retrieval Threshold set to: {SIMILARITY_THRESHOLD}")


def clean_text(text: str) -> str:
    """Removes extra noise, symbols like +, -, | and redundant whitespace."""
    if not text: return ""
    # Remove table symbols and special characters that hurt embeddings
    text = re.sub(r'[|+\-_*#]', ' ', text)
    # Remove multiple spaces and newlines
    text = re.sub(r'\s+', ' ', text).strip()
    return text

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

# Setup Rate Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost,http://localhost:3000,http://127.0.0.1,http://localhost:5173,http://127.0.0.1:5173,http://localhost:80")
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.api_route("/", methods=["GET", "HEAD"])
def root_health():
    return {"status": "online", "service": "Government AI API", "docs": "/docs"}

# --- Authentication API ---

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = db.query(models.AdminUser).filter(models.AdminUser.username == form_data.username).first()
    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ناوی بەکارهێنەر یان پاسوۆرد هەڵەیە",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": admin.username})
    return {"access_token": access_token, "token_type": "bearer"}

# ─────────────────────── Chat endpoint ───────────────────────
# --- Schemas ---
class ChatRequest(BaseModel):
    message: str
    session_id: str
    user_id: str
    language: Optional[str] = "ku"
    stream: Optional[bool] = False

class SuggestionCreate(BaseModel):
    name: str = ""
    message: str

class FeedbackRequest(BaseModel):
    message_id: int
    score: int
    note: str = None

class IngestRequest(BaseModel):
    title: str
    department: str = "گشتی"
    content: str
    link: Optional[str] = None

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
@limiter.limit("120/minute")
def chat(request: Request, req: ChatRequest, db: Session = Depends(get_db)):
    user_question = req.message.strip()
    session_id = req.session_id
    user_id = req.user_id
    user_lang = getattr(req, "language", "ku") or "ku"

    if not user_question:
        raise HTTPException(status_code=400, detail="پرسیار بەتاڵە")

    # Ensure Session Exists
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    is_new_session = False
    if not session:
        session = ChatSession(id=session_id, user_id=user_id)
        db.add(session)
        is_new_session = True
    else:
        session.last_activity = datetime.datetime.utcnow()
    
    # Save User Message
    user_msg = ChatMessage(session_id=session_id, role="user", content=user_question)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # ── 1. Instant Politeness & Greeting Engine (Sub-0.05s response) ──
    clean_low = re.sub(r'[^\w\s]', '', user_question.strip().lower())
    words = clean_low.split()
    greetings = {"سڵاو", "سلاو", "چۆنی", "چونی", "باشی", "مەرحەبا", "مرحبا", "سلام", "hi", "hello", "hey", "سوپاس", "دەستخۆش"}
    if len(words) <= 3 and any(w in greetings for w in words):
        if user_lang == "ar":
            greeting_ans = "أهلاً وسهلاً بك عزيزي المواطن في المنصة الرسمية لحكومة إقليم كوردستان للخدمات والمعاملات الإدارية.\n\nيسعدني جداً مساعدتك والإجابة عن استفساراتك حول أي معاملة رسمية أو إجراءات الوزارات والدوائر الحكومية.\n\nتفضل، كيف يمكنني خدمتك اليوم؟"
        elif user_lang == "en":
            greeting_ans = "Dear citizen, warm greetings and welcome to the official digital portal of the Kurdistan Regional Government.\n\nI am pleased to assist you with any inquiries regarding official governmental procedures, ministerial guidelines, and public services.\n\nHow may I help you today?"
        else:
            greeting_ans = "هاوڵاتیی بەڕێز، سڵاو و ڕێز! بەخێربێیت بۆ سەکۆی فەرمیی خزمەتگوزاری و ڕێنماییە کارگێڕییەکانی حکومەتی هەرێمی کوردستان.\n\nخۆشحاڵم بە خزمەتکردنت. دەتوانیت پرسیار لەسەر هەر مامەڵەیەکی فەرمی (وەک: دەرهێنانی پاسپۆرت، کارتی نیشتمانی، مۆڵەتی شۆفێری، باج، تاپۆ، یان ڕێنمایی وەزارەتەکان) بکەیت.\n\nتکایە بفرمێ، چۆن دەتوانم ئەمڕۆ یارمەتیت بدەم؟"

        bot_msg = ChatMessage(session_id=session_id, role="bot", content=greeting_ans)
        db.add(bot_msg)
        db.commit()
        db.refresh(bot_msg)

        if req.stream:
            def greet_stream():
                import json
                yield f"data: {json.dumps({'type': 'meta', 'sources': [], 'session_title': 'سڵاو و ڕێز'})}\n\n"
                yield f"data: {json.dumps({'type': 'chunk', 'content': greeting_ans})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'message_id': bot_msg.id})}\n\n"

            return StreamingResponse(
                greet_stream(),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
            )
        return {"answer": greeting_ans, "sources": [], "message_id": bot_msg.id, "session_title": "سڵاو و ڕێز"}

    context_text = ""
    sources = []

    # ── 2. Hybrid Search (Keyword Booster + Vector Search with Links) ──
    try:
        cleaned_question = clean_text(user_question)
        print(f"--- Searching for: {cleaned_question} ---")
        
        valid_chunks = []
        seen_titles = set()

        # A. Keyword Booster Search (Matches ANY document in the database by title/content keywords)
        kw_words = [w for w in cleaned_question.split() if len(w) >= 3 and w not in ["چۆن", "کەی", "چەند", "چییە", "دەکرێت", "بۆچی", "ئایا", "تکایە"]]
        if kw_words:
            for term in kw_words[:3]:
                kw_results = db.execute(
                    text("""
                        SELECT dc.chunk_text, d.title, d.content, d.department, 1.0 AS similarity, d.link
                        FROM document_chunks dc
                        JOIN documents d ON dc.document_id = d.id
                        WHERE d.title ILIKE :kw OR dc.chunk_text ILIKE :kw
                        LIMIT 3
                    """),
                    {"kw": f"%{term}%"}
                ).fetchall()
                for kr in kw_results:
                    if kr[1] not in seen_titles:
                        chunk_str = f"[{kr[1]}]\n{kr[0]}"
                        if kr[5]:
                            chunk_str += f"\nلینکی فەرمی: {kr[5]}"
                        valid_chunks.append(chunk_str)
                        sources.append({
                            "title": kr[1],
                            "content": kr[2],
                            "department": kr[3],
                            "link": kr[5]
                        })
                        seen_titles.add(kr[1])

        # B. Vector Similarity Search
        try:
            query_embedding = embeddings_model.embed_query(cleaned_question)
            results = db.execute(
                text("""
                    SELECT dc.chunk_text, d.title, d.content, d.department,
                           1 - (dc.embedding <=> CAST(:emb AS vector)) AS similarity,
                           d.link
                    FROM document_chunks dc
                    JOIN documents d ON dc.document_id = d.id
                    ORDER BY dc.embedding <=> CAST(:emb AS vector)
                    LIMIT 5
                """),
                {"emb": str(query_embedding)}
            ).fetchall()

            for row in results:
                score = float(row[4])
                if score >= SIMILARITY_THRESHOLD and row[1] not in seen_titles:
                    chunk_str = f"[{row[1]}]\n{row[0]}"
                    if row[5]:
                        chunk_str += f"\nلینکی فەرمی: {row[5]}"
                    valid_chunks.append(chunk_str)
                    sources.append({
                        "title": row[1],
                        "content": row[2],
                        "department": row[3],
                        "link": row[5]
                    })
                    seen_titles.add(row[1])
        except Exception as ve:
            print(f"Vector search skipped/failed: {ve}")

        if valid_chunks:
            context_text = "\n\n".join(valid_chunks)
            print(f"--- RAG Context Found ({len(valid_chunks)} chunks, {len(sources)} sources) ---")
        else:
            print("--- No specific document found; AI will provide intelligent guidance ---")
            try:
                missed = db.query(models.MissedQuestion).filter(models.MissedQuestion.query_text == cleaned_question).first()
                if missed:
                    missed.occurrence_count += 1
                    missed.last_asked = datetime.datetime.utcnow()
                else:
                    new_missed = models.MissedQuestion(query_text=cleaned_question)
                    db.add(new_missed)
                db.commit()
            except Exception as me:
                print(f"Failed to log missed question: {me}")

    except Exception as e:
        print(f"Search failed: {e}")

    # ── 3. High-Intelligence Official Prompts ──
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        groq_key = os.getenv("GROQ_API_KEY")

        if user_lang == "ar":
            if context_text:
                system_prompt = (
                    "أنت المساعد الذكي الرسمي لحكومة إقليم كوردستان. "
                    "يجب أن تبدأ إجابتك دائماً بـ 'عزيزي المواطن،' بأعلى درجات اللباقة والاحترام. "
                    "قدم المعلومات بدقة واختصار على شكل نقاط أو خطوات مرقمة. "
                    "إذا كان هناك رابط رسمي في المعلومات، اذكره في نهاية إجابتك بصيغة: [اسم الرابط](الرابط الرسمي) لكي يتمكن المواطن من النقر عليه مباشرة. "
                    "إذا كانت هناك خيارات متعددة ذات صلة، اذكرها بين أقواس مربعة مثل: [رسوم جواز السفر]."
                )
                user_prompt = f"المعلومات الرسمية:\n{context_text}\n\nسؤال المواطن: {user_question}\n\nالإجابة الرسمية:"
            else:
                system_prompt = (
                    "أنت المساعد الذكي الرسمي لحكومة إقليم كوردستان. "
                    "يجب أن تبدأ إجابتك دائماً بـ 'عزيزي المواطن،' بأعلى درجات اللباقة والاحترام. "
                    "قدم إرشادات عامة واضحة ومختصرة حول هذا الإجراء الحكومي، ووجّه المواطن إلى الوزارة أو المديرية المختصة لإتمام معاملته."
                )
                user_prompt = f"سؤال المواطن: {user_question}\n\nالإجابة الرسمية:"
        elif user_lang == "en":
            if context_text:
                system_prompt = (
                    "You are the official, highly intelligent AI assistant of the Kurdistan Regional Government. "
                    "Always start your response with 'Dear Citizen,' with the utmost respect. "
                    "Present guidelines clearly and concisely with numbered steps or bullet points. "
                    "If an official link or website is mentioned in the official data, format it at the end as [Link Name](URL) so the citizen can click it directly."
                )
                user_prompt = f"Official Information:\n{context_text}\n\nCitizen Inquiry: {user_question}\n\nOfficial Answer:"
            else:
                system_prompt = (
                    "You are the official, highly intelligent AI assistant of the Kurdistan Regional Government. "
                    "Always start your response with 'Dear Citizen,' with the utmost respect. "
                    "Provide clear, concise administrative guidance and guide the citizen to the relevant Ministry or Directorate to complete their procedure."
                )
                user_prompt = f"Citizen Inquiry: {user_question}\n\nOfficial Answer:"
        else:
            if context_text:
                system_prompt = (
                    "تۆ یاریدەدەری فەرمی، زۆر زیرەک و میهرەبانی حکومەتی هەرێمی کوردستانی بۆ خزمەتی هاوڵاتییان. "
                    "دەبێت هەموو وەڵامەکانت بە 'هاوڵاتی بەڕێز،' دەستپێ بکات و لەوپەڕی ڕێز و شکۆمەندیدا بێت. "
                    "زانیارییە فەرمییەکان بە شێوەی خاڵبەندی (Bullet points) یان هەنگاوی ژمارەکراوی کورت و پوخت پێشکەش بکە بەبێ درێژدادڕی. "
                    "ئەگەر لە زانیارییەکاندا لینکی فەرمی یان ماڵپەڕ هەبوو، لە کۆتایی وەڵامەکەتدا بە شێوەی [ناوی بەستەر](لینکی فەرمی) بینوسە بۆ ئەوەی هاوڵاتی ڕاستەوخۆ کلیکی لێبکات. "
                    "گرنگ: وەڵامەکانت هەمیشە دەبێت بە زمانی کوردی (شێوەزاری سۆرانی) بن، مەگەر هاوڵاتییەکە بە بادینی بپرسێت. "
                    "ئەگەر هاوڵاتی پرسیارێکی کرد کە لە زانیارییەکاندا چەندین جۆری هەبوو، بژاردەکان لە ناو کەوانەی چوارگۆشەدا بنووسە. بۆ نموونە: [تێچووی پاسپۆرت]."
                )
                user_prompt = f"زانیارییە فەرمییەکان:\n{context_text}\n\nپرسیاری هاوڵاتی: {user_question}\n\nتێبینی گرنگ: تەنها لەسەر ئەم پرسیارە زانیاری بدە بەبێ زیادەڕۆیی.\n\nوەڵامی فەرمی:"
            else:
                system_prompt = (
                    "تۆ یاریدەدەری فەرمی، زۆر زیرەک و میهرەبانی حکومەتی هەرێمی کوردستانی بۆ خزمەتی هاوڵاتییان. "
                    "دەبێت هەموو وەڵامەکانت بە 'هاوڵاتی بەڕێز،' دەستپێ بکات و لەوپەڕی ڕێز و خزمەتگوزاریدا بێت. "
                    "ڕوونکردنەوەی فەرمیی گشتی دەربارەی ئەم بابەتە یان دامودەزگایە بدە و هاوڵاتی ئاراستەی وەزارەت یان بەڕێوەبەرایەتیی پەیوەندیدار بکە بۆ تەواوکردنی مامەڵەکەی."
                )
                user_prompt = f"پرسیاری هاوڵاتی: {user_question}\n\nوەڵامی فەرمی:"

        # Auto-title new session immediately
        if is_new_session:
            try:
                clean_title = user_question.strip().replace('"', '').replace("'", "")
                session.title = (clean_title[:38] + "...") if len(clean_title) > 38 else clean_title
                db.commit()
            except Exception as e:
                print("Auto-titling failed:", e)

        # ── Branch A: High-Speed Token Streaming (SSE) ──
        if req.stream:
            def event_stream():
                import json
                yield f"data: {json.dumps({'type': 'meta', 'sources': sources, 'session_title': session.title})}\n\n"

                accumulated = []
                stream_success = False

                # 1. Primary: Groq for sub-second lightning streaming
                if groq_key:
                    try:
                        from langchain_groq import ChatGroq
                        groq_model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
                        llm = ChatGroq(api_key=groq_key, model_name=groq_model, temperature=0, max_tokens=500)
                        for chunk in llm.stream([("system", system_prompt), ("human", user_prompt)]):
                            if chunk.content:
                                accumulated.append(chunk.content)
                                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk.content})}\n\n"
                        stream_success = True
                    except Exception as ge:
                        print(f"Groq stream issue: {ge}, attempting OpenAI fallback...")

                # 2. Resilient Fallback: OpenAI gpt-4o-mini streaming
                if not stream_success and openai_key:
                    try:
                        import openai
                        client = openai.OpenAI(api_key=openai_key)
                        stream_obj = client.chat.completions.create(
                            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            temperature=0,
                            max_tokens=500,
                            stream=True
                        )
                        for chunk in stream_obj:
                            delta = chunk.choices[0].delta.content or ""
                            if delta:
                                accumulated.append(delta)
                                yield f"data: {json.dumps({'type': 'chunk', 'content': delta})}\n\n"
                        stream_success = True
                    except Exception as oe:
                        print(f"OpenAI stream issue: {oe}")

                full_answer = "".join(accumulated)
                if not full_answer:
                    full_answer = "هاوڵاتی بەڕێز، داوای لێبووردن دەکەین کێشەیەکی کاتی لە پەیوەندی بە ژیری دەستکرد هەیە. تکایە دووبارە هەوڵ بدەرەوە."
                    yield f"data: {json.dumps({'type': 'chunk', 'content': full_answer})}\n\n"

                # Save Bot Message to DB
                msg_id = None
                try:
                    with Session(engine) as sdb:
                        bot_msg = ChatMessage(session_id=session_id, role="bot", content=full_answer)
                        sdb.add(bot_msg)
                        sdb.commit()
                        sdb.refresh(bot_msg)
                        msg_id = bot_msg.id
                except Exception as dbe:
                    print(f"Failed to save bot msg: {dbe}")

                yield f"data: {json.dumps({'type': 'done', 'message_id': msg_id})}\n\n"

            return StreamingResponse(
                event_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            )

        # ── Branch B: Non-Streaming Standard JSON (Sub-second response) ──
        answer = ""
        # 1. Primary: Groq (0.6s generation)
        if groq_key:
            try:
                from langchain_groq import ChatGroq
                groq_model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
                llm = ChatGroq(api_key=groq_key, model_name=groq_model, temperature=0, max_tokens=500)
                resp = llm.invoke([("system", system_prompt), ("human", user_prompt)])
                answer = resp.content
            except Exception as ge:
                print(f"Groq generation issue: {ge}")
                answer = ""

        # 2. Resilient Fallback: OpenAI gpt-4o-mini
        if not answer and openai_key:
            try:
                import urllib.request
                import json
                openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
                payload = json.dumps({
                    "model": openai_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0,
                    "max_tokens": 500
                }).encode("utf-8")
                
                req_ai = urllib.request.Request(
                    "https://api.openai.com/v1/chat/completions",
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json"
                    }
                )
                with urllib.request.urlopen(req_ai, timeout=15) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    answer = resp_data["choices"][0]["message"]["content"]
            except Exception as oai_err:
                print(f"OpenAI call issue ({oai_err})")

    except Exception as e:
        print(f"LLM error: {e}")
        answer = "هاوڵاتی بەڕێز، داوای لێبووردن دەکەین کێشەیەکی کاتی لە پەیوەندی بە سێرڤەری ژیری دەستکرد هەیە. تکایە دواتر هەوڵ بدەرەوە."

    # Save Bot Message
    bot_msg = ChatMessage(session_id=session_id, role="bot", content=answer)
    db.add(bot_msg)
    db.commit()
    db.refresh(bot_msg)
    msg_id = bot_msg.id

    return {"answer": answer, "sources": sources, "message_id": msg_id, "session_title": session.title}

# --- Chat History & Feedback API ---

@app.get("/api/sessions/{session_id}/messages")
@app.get("/api/sessions/history/{session_id}")
def get_session_history(session_id: str, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return [{"id": m.id, "role": m.role, "content": m.content, "feedback_score": m.feedback_score, "created_at": m.created_at} for m in messages]

@app.get("/api/sessions/{user_id}")
def get_user_sessions(user_id: str, db: Session = Depends(get_db)):
    # 30 days ago limit can be enforced here natively
    thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == user_id, 
        ChatSession.last_activity >= thirty_days_ago
    ).order_by(ChatSession.last_activity.desc()).all()
    
    return [{"id": s.id, "title": s.title, "last_activity": s.last_activity} for s in sessions]

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        db.delete(session)
        db.commit()
    return {"success": True}

@app.post("/api/feedback")
def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db)):
    msg = db.query(ChatMessage).filter(ChatMessage.id == req.message_id).first()
    if msg:
        msg.feedback_score = req.score
        msg.feedback_note = req.note
        db.commit()
    return {"success": True}

@app.post("/api/suggestions")
def create_suggestion(req: SuggestionCreate, db: Session = Depends(get_db)):
    new_sug = Suggestion(name=req.name, message=req.message)
    db.add(new_sug)
    db.commit()
    return {"success": True}

# --- Admin API Endpoints ---

@app.post("/api/admin/ingest")
async def ingest_document(req: IngestRequest, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    try:
        # Clean content before storing and chunking
        cleaned_content = clean_text(req.content)
        
        # Create Document with optional official link
        doc_entry = Document(title=req.title, department=req.department, content=cleaned_content, link=req.link)
        db.add(doc_entry)
        db.commit()
        db.refresh(doc_entry)

        # Chunk the cleaned content
        chunks = text_splitter.split_text(cleaned_content)

        # Generate embeddings and store
        for chunk in chunks:
            vector = embeddings_model.embed_query(chunk)
            chunk_entry = DocumentChunk(
                document_id=doc_entry.id,
                chunk_text=chunk,
                embedding=vector
            )
            db.add(chunk_entry)

        db.commit()
        return {"success": True, "message": "Document ingested successfully", "doc_id": doc_entry.id, "chunks": len(chunks)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/documents")
async def get_documents(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    result = []
    for d in docs:
        result.append({
            "id": d.id,
            "title": d.title,
            "department": d.department,
            "content": d.content,
            "link": d.link,
            "created_at": d.created_at
        })
    return result

@app.get("/api/admin/documents/{doc_id}")
async def get_document(doc_id: int, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"id": doc.id, "title": doc.title, "department": doc.department, "content": doc.content, "link": doc.link, "created_at": doc.created_at}

@app.put("/api/admin/documents/{doc_id}")
async def update_document(doc_id: int, req: IngestRequest, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        # Step 1: Delete all old chunks for this document (Clean the brain)
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).delete()
        
        # Step 2: Clean new content
        cleaned_content = clean_text(req.content)
        
        # Update fields
        doc.title = req.title
        doc.department = req.department
        doc.content = cleaned_content
        doc.link = req.link
        db.commit()

        # Re-chunk and re-embed cleaned content
        chunks = text_splitter.split_text(cleaned_content)
        for chunk in chunks:
            vector = embeddings_model.embed_query(chunk)
            chunk_entry = DocumentChunk(
                document_id=doc.id,
                chunk_text=chunk,
                embedding=vector
            )
            db.add(chunk_entry)

        db.commit()
        return {"success": True, "message": "Document updated successfully", "doc_id": doc.id, "chunks": len(chunks)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/documents/{doc_id}")
async def delete_document(doc_id: int, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc) # Cascade will delete chunks
    db.commit()
    return {"success": True, "message": "Document deleted"}
@app.get("/api/admin/suggestions")
def get_admin_suggestions(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    suggestions = db.query(Suggestion).order_by(Suggestion.created_at.desc()).all()
    return suggestions

@app.get("/api/admin/feedback/negative")
def get_admin_negative_feedback(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    # Get bot messages that were disliked, along with the user message immediately before it if possible
    # For now, just getting the disliked messages and their notes
    feedback = db.query(ChatMessage).filter(ChatMessage.feedback_score == -1).order_by(ChatMessage.created_at.desc()).all()
    results = []
    for f in feedback:
        # Find the preceding user message in the same session
        user_msg = db.query(ChatMessage).filter(
            ChatMessage.session_id == f.session_id,
            ChatMessage.role == 'user',
            ChatMessage.created_at < f.created_at
        ).order_by(ChatMessage.created_at.desc()).first()
        
        results.append({
            "id": f.id,
            "session_id": f.session_id,
            "bot_response": f.content,
            "user_query": user_msg.content if user_msg else "Unknown",
            "feedback_note": f.feedback_note,
            "created_at": f.created_at
        })
    return results

@app.delete("/api/admin/suggestions/{sug_id}")
def delete_suggestion(sug_id: int, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    sug = db.query(Suggestion).filter(Suggestion.id == sug_id).first()
    if sug:
        db.delete(sug)
        db.commit()
    return {"success": True}

@app.delete("/api/admin/suggestions/all/clear")
def delete_all_suggestions(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    db.query(Suggestion).delete()
    db.commit()
    return {"success": True}

@app.delete("/api/admin/feedback/negative/{msg_id}")
def clear_negative_feedback(msg_id: int, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    msg = db.query(ChatMessage).filter(ChatMessage.id == msg_id).first()
    if msg:
        msg.feedback_score = 0
        msg.feedback_note = None
        db.commit()
    return {"success": True}

@app.delete("/api/admin/feedback/negative/all/clear")
def clear_all_negative_feedback(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    db.query(ChatMessage).filter(ChatMessage.feedback_score == -1).update({
        ChatMessage.feedback_score: 0,
        ChatMessage.feedback_note: None
    }, synchronize_session=False)
    db.commit()
    return {"success": True}

@app.post("/api/admin/reindex")
async def reindex_all_documents(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    try:
        # Step 1: Wipe all existing chunks
        db.query(models.DocumentChunk).delete()
        db.commit()
        
        # Step 2: Fetch all documents
        docs = db.query(models.Document).all()
        total_chunks = 0
        
        for doc in docs:
            # Re-chunk with current settings (600/100)
            chunks = text_splitter.split_text(doc.content)
            for chunk in chunks:
                vector = embeddings_model.embed_query(chunk)
                chunk_entry = models.DocumentChunk(
                    document_id=doc.id,
                    chunk_text=chunk,
                    embedding=vector
                )
                db.add(chunk_entry)
                total_chunks += 1
        
        db.commit()
        return {"success": True, "message": f"Re-indexed {len(docs)} documents into {total_chunks} chunks."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/missed-questions")
def get_missed_questions(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    # Returns top missed questions ordered by count
    questions = db.query(models.MissedQuestion).order_by(models.MissedQuestion.occurrence_count.desc()).all()
    return [
        {
            "id": q.id,
            "query_text": q.query_text,
            "count": q.occurrence_count,
            "last_asked": q.last_asked
        } for q in questions
    ]

@app.delete("/api/admin/missed-questions/{q_id}")
def delete_missed_question(q_id: int, db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    q = db.query(models.MissedQuestion).filter(models.MissedQuestion.id == q_id).first()
    if q:
        db.delete(q)
        db.commit()
    return {"success": True}

@app.delete("/api/admin/missed-questions/all/clear")
def clear_all_missed_questions(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    db.query(models.MissedQuestion).delete()
    db.commit()
    return {"success": True}

@app.delete("/api/admin/logs/clear")
def clear_all_logs(db: Session = Depends(get_db), admin: models.AdminUser = Depends(get_current_admin)):
    # Specifically for the user's request, cleans the MissedQuestion table
    db.query(models.MissedQuestion).delete()
    db.commit()
    return {"success": True, "message": "Logs cleared successfully"}
