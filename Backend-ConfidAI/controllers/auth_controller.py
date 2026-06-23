from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.user_model import User
from services.auth_service import verify_password
from config.jwt_config import crear_token

def login_usuario(db: Session, data):
    usuario = db.query(User).filter(User.correo == data.correo).first()

    if not usuario or not verify_password(data.password, usuario.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = crear_token({
        "sub": usuario.correo,
        "user_id": usuario.id
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }
