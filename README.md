# Government AI Knowledge Base (KRG) 🏛️🤖

A professional, enterprise-grade AI-powered knowledge base designed for the Kurdistan Regional Government (KRG). This system allows citizens to query official government regulations in Kurdish (Sorani & Badini) and provides administrators with a powerful dashboard to manage information in real-time.

## 🌟 Key Features

### 🔍 Citizen Chat Interface
- **Multilingual RAG:** High-accuracy retrieval using `pgvector` and multilingual embeddings.
- **Official Branding:** Premium UI with glassmorphism, video backgrounds, and KRG aesthetics.
- **Smart Responses:** Handles Kurdish dialects (Sorani/Badini) automatically based on the user's query.
- **Transparency:** Links every AI response to the official source document for verification.
- **Utility Tools:** One-click response copying, PDF generation for printing official guides, and chat history management.
- **Feedback Loop:** Citizens can rate responses (Thumbs Up/Down) to help improve the system.

### 🛡️ Administrative Dashboard
- **Knowledge Management:** Full CRUD for government regulations with automatic re-indexing.
- **Knowledge Gaps:** Tracks "Missed Questions" where the AI lacked information, allowing admins to bridge gaps immediately.
- **Feedback Analysis:** View negative feedback and specific user notes to refine AI accuracy.
- **Suggestion Box:** Centralized hub for citizen suggestions and feedback.
- **System Health:** Monitor AI indexing status and re-build the vector "brain" with one click.
- **Security:** JWT-based authentication and rate-limiting to prevent abuse.

## 🚀 Tech Stack

- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL with `pgvector` extension
- **AI/LLM:** Llama 3.3 (via Groq) & HuggingFace Embeddings
- **Frontend:** React + Tailwind CSS + Framer Motion
- **DevOps:** Docker & Docker Compose

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd gov
   ```

2. **Configure Environment Variables:**
   Create a `.env` file based on `.env.example`:
   ```bash
   GROQ_API_KEY=your_key_here
   JWT_SECRET_KEY=your_secure_secret
   ```

3. **Launch with Docker:**
   ```bash
   docker-compose up --build
   ```

4. **Access the System:**
   - **Frontend:** [http://localhost](http://localhost)
   - **Admin Dashboard:** [http://localhost/admin](http://localhost/admin) (Default Login: `admin/admin`)
   - **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

## 📊 Project Readiness
- [x] Multilingual Support (Sorani/Badini)
- [x] Vector Database Integration (pgvector)
- [x] Admin Authentication
- [x] Rate Limiting & Security
- [x] Mobile Responsiveness
- [x] Deployment Optimized (Docker/Render)
- [x] Documentation & User Feedback loops

## 🌍 Production Deployment

To deploy this system for official use, follow these steps:

### 1. Database (Neon PostgreSQL)
- Create a project on [Neon.tech](https://neon.tech).
- Enable the `pgvector` extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- Copy the **Connection String** (use the pooled version for better performance).

### 2. Backend (Render)
- Create a new **Web Service** on Render.
- Connect your GitHub repository.
- **Runtime:** Docker
- **Environment Variables:**
  - `DATABASE_URL`: Your Neon connection string (convert `postgres://` to `postgresql+pg8000://`).
  - `GROQ_API_KEY`: Your API key from Groq.
  - `JWT_SECRET_KEY`: A long, random string.
  - `ALLOWED_ORIGINS`: Your frontend URL.

### 3. Frontend (Render Static Site)
- Create a new **Static Site** on Render.
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Rewrites/Redirects:** Add a rewrite rule for `/api/*` to point to your Backend URL.

---
*Developed for the Kurdistan Regional Government.*
