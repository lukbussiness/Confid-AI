from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas.user_schema import UserCreate
from controllers.user_controller import registrar_usuario
from config.database import SessionLocal
from services.jwt_service import verificar_token
from schemas.user_schema import UserUpdate
from controllers.user_controller import actualizar_usuario
from models.user_model import User


router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/registro")
def registro(usuario: UserCreate, db: Session = Depends(get_db)):
    return registrar_usuario(db, usuario)

@router.get("/perfil")
def perfil_usuario(
    token_data: dict = Depends(verificar_token),
    db: Session = Depends(get_db)
):
    user_id = token_data.get("user_id")

    usuario = db.query(User).filter(User.id == user_id).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "correo": usuario.correo
    }
@router.put("/perfil")
def editar_perfil(
    datos: UserUpdate,
    token_data: dict = Depends(verificar_token),
    db: Session = Depends(get_db)
):
    user_id = token_data.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")

    return actualizar_usuario(db, user_id, datos)
