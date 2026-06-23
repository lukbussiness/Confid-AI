from sqlalchemy import Column, Integer, String
from config.database import Base

class User(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    correo = Column(String(150), unique=True, index=True, nullable=False)
    telefono = Column(String(20), nullable=False)
    password = Column(String(255), nullable=False)
