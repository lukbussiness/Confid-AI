from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.auth_schema import LoginRequest
from controllers.auth_controller import login_usuario
from config.database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return login_usuario(db, data)
