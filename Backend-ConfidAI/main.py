import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from fastapi import FastAPI
from config.database import Base, engine
from routes.user_routes import router as user_router
from routes.auth_routes import router as auth_router
from routes import interview_routes
from fastapi.middleware.cors import CORSMiddleware
Base.metadata.create_all(bind=engine)
from fastapi.staticfiles import StaticFiles
import os
import google.generativeai as genai
from dotenv import load_dotenv
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n--- 🔍 MODELOS GEMINI DISPONIBLES (GRATUITOS/PAGO) ---")
    try:
        load_dotenv()
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        # Iterar sobre todos los modelos disponibles en la API principal
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"✅ {m.name}")
    except Exception as e:
        print("❌ Error obteniendo modelos:", e)
    print("------------------------------------------------------\n")
    yield
    
app = FastAPI(lifespan=lifespan)


app.include_router(user_router)
app.include_router(user_router, prefix="/usuarios", tags=["Usuarios"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(interview_routes.router, prefix="/interview", tags=["Interview"])

os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
