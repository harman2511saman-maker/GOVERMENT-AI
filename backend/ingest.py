import os
from sqlalchemy import text
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from database import engine, SessionLocal, Base
from models import Document, DocumentChunk

def init_db():
    print("Ensuring pgvector extension is enabled...")
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

def ingest_data():
    print("Loading document...")
    loader = TextLoader("sample_data.txt", encoding="utf-8")
    docs = loader.load()

    print("Splitting document...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, 
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(docs)

    print("Initializing embeddings model (this may take a moment to download)...")
    # paraphrase-multilingual-MiniLM-L12-v2 is compact (384 dims) and supports Kurdish out of the box.
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

    print(f"Generating embeddings for {len(chunks)} chunks...")
    
    db = SessionLocal()
    try:
        # First, add the document
        doc_entry = Document(title="دەرهێنانی پاسپۆرت و نوێکردنەوە", content=docs[0].page_content)
        db.add(doc_entry)
        db.commit()
        db.refresh(doc_entry)

        # Generate embeddings and add chunks
        for i, chunk in enumerate(chunks):
            embedding_vector = embeddings.embed_query(chunk.page_content)
            chunk_entry = DocumentChunk(
                document_id=doc_entry.id,
                chunk_text=chunk.page_content,
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
