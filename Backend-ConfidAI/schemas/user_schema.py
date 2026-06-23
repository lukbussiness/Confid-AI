from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserCreate(BaseModel):
    nombre: str
    apellido: str
    correo: EmailStr
    telefono: str
    password: str

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    correo: Optional[str] = None
    password: Optional[str] = None