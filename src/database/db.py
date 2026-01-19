from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from configs.config import get_settings
from sqlalchemy.ext.declarative import declarative_base

settings = get_settings()

engine = create_engine(settings.db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base = declarative_base()