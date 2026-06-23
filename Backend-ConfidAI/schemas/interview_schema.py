from pydantic import BaseModel
from typing import List

class MensajeHistorial(BaseModel):
    rol: str
    contenido: str

class IniciarEntrevista(BaseModel):
    nombre: str

class ProcesarRespuesta(BaseModel):
    historial: List[MensajeHistorial]
    respuesta_actual: str