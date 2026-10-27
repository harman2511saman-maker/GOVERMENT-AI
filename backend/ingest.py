import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import os
from sqlalchemy import text
from langchain_text_splitters import RecursiveCharacterTextSplitter
from database import engine, SessionLocal, Base
from models import Document, DocumentChunk
from main import embeddings_model

def init_db():
    print("Ensuring pgvector extension is enabled...")
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

def ingest_data():
    print("Loading document...")
    with open("sample_data.txt", "r", encoding="utf-8") as f:
        file_content = f.read()

    print("Splitting document...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, 
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_text(file_content)

    print("Using configured embeddings model...")
    embeddings = embeddings_model

    print(f"Generating embeddings for {len(chunks)} chunks...")
    
    db = SessionLocal()
    try:
        # First, add the document
        doc_entry = Document(title="دەرهێنانی پاسپۆرت و نوێکردنەوە", content=file_content)
        db.add(doc_entry)
        db.commit()
        db.refresh(doc_entry)

        # Generate embeddings and add chunks
        for i, chunk_text in enumerate(chunks):
            embedding_vector = embeddings.embed_query(chunk_text)
            chunk_entry = DocumentChunk(
                document_id=doc_entry.id,
                chunk_text=chunk_text,
                embedding=embedding_vector
            )
            db.add(chunk_entry)
        
        db.commit()
        print("Successfully ingested all data into PostgreSQL!")
    except Exception as e:
        print(f"Error during ingestion: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    ingest_data()
