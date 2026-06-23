import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Cargar el archivo .env si existe localmente en tu PC
load_dotenv()

# 1. Intenta leer la variable "DATABASE_URL" que configuramos en Render.
# 2. Si no la encuentra (porque estás en tu PC), usa por defecto tu localhost.
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "mysql+pymysql://root:@localhost:3306/confidai"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
