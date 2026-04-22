import os
import sys
from sqlalchemy import text, create_engine

# Manually set environment variables to avoid .env null character issues
os.environ["DATABASE_URL"] = "postgresql+pg8000://neondb_owner:npg_zgR8UySblQc2@ep-noisy-violet-amus6pxs.c-5.us-east-1.aws.neon.tech/neondb"
os.environ["GROQ_API_KEY"] = "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"

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Monkey-patch load_dotenv
import dotenv
dotenv.load_dotenv = lambda **kwargs: None

from database import engine, SessionLocal, Base
from models import Document, DocumentChunk
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings

def run_ingestion():
    print("Initializing Ingestion (Manual ENV)...")
    
    # Path to sample data
    sample_data_path = os.path.join(os.getcwd(), 'backend', 'sample_data.txt')
    
    if not os.path.exists(sample_data_path):
        print(f"Error: {sample_data_path} not found.")
        return

    print(f"Loading document from {sample_data_path}...")
    loader = TextLoader(sample_data_path, encoding="utf-8")
    docs = loader.load()

    print("Splitting document...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, 
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(docs)

    print("Initializing embeddings model...")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

    print(f"Generating embeddings for {len(chunks)} chunks...")
    
    db = SessionLocal()
    try:
        # Check if already ingested
        existing = db.query(Document).filter(Document.title == "دەرهێنانی پاسپۆرت و نوێکردنەوە").first()
        if existing:
            print("Document already exists. Skipping ingestion.")
            return

        doc_entry = Document(title="دەرهێنانی پاسپۆرت و نوێکردنەوە", content=docs[0].page_content)
        db.add(doc_entry)
        db.commit()
        db.refresh(doc_entry)

        for i, chunk in enumerate(chunks):
            embedding_vector = embeddings.embed_query(chunk.page_content)
            chunk_entry = DocumentChunk(
                document_id=doc_entry.id,
                chunk_text=chunk.page_content,
                embedding=embedding_vector
            )
            db.add(chunk_entry)
        
        db.commit()
        print("Successfully ingested all data into Neon!")
    except Exception as e:
        print(f"Error during ingestion: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_ingestion()
