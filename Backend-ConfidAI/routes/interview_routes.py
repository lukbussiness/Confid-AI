from fastapi import APIRouter, UploadFile, File, Form
from controllers.interview_controller import procesar_respuesta_voz, procesar_silencio

router = APIRouter()

@router.post("/iniciar")
async def iniciar(nombre: str = Form(...)):
    from controllers.interview_controller import iniciar_sesion
    return iniciar_sesion(nombre)

@router.post("/responder-voz")
async def responder_por_voz(
    audio: UploadFile = File(...),
    historial: str = Form(...),
):
    return procesar_respuesta_voz(audio, historial)


@router.post("/silencio")
async def avisar_silencio(
    historial: str = Form(...)
):
    return procesar_silencio(historial)
    




@router.post("/generar-reporte")
async def generar_reporte(
    historial: str = Form(...),
    metricas_voz: str = Form(...)
):
    from controllers.interview_controller import procesar_reporte_final
    return procesar_reporte_final(historial, metricas_voz)