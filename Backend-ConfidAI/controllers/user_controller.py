from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.user_model import User


from services.auth_service import hash_password

def registrar_usuario(db: Session, data):
    existe = db.query(User).filter(User.correo == data.correo).first()
    if existe:
        raise HTTPException(status_code=400, detail="Correo ya registrado")

    usuario = User(
        nombre=data.nombre,
        apellido=data.apellido,
        correo=data.correo,
        telefono=data.telefono,
        password=hash_password(data.password)
    )

    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    return {
        "mensaje": "Usuario registrado correctamente",
        "usuario": {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "apellido": usuario.apellido,
            "correo": usuario.correo,
            "telefono": usuario.telefono
        }
    }


def actualizar_usuario(db, user_id: int, datos):
    usuario = db.query(User).filter(User.id == user_id).first()

    if not usuario:
        return {"error": "Usuario no encontrado"}

    if datos.nombre is not None:
        usuario.nombre = datos.nombre

    if datos.apellido is not None:
        usuario.apellido = datos.apellido

    if datos.correo is not None:
        usuario.correo = datos.correo

    if datos.password:
        usuario.password = hash_password(datos.password)

    db.commit()
    db.refresh(usuario)

    return {"mensaje": "Perfil actualizado correctamente"}