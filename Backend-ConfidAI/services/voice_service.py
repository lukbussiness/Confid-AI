import os
import uuid
import asyncio
import edge_tts

# Crear carpetas necesarias
os.makedirs("temp_audio", exist_ok=True)
os.makedirs("static/audio", exist_ok=True)

VOZ = "es-CO-SalomeNeural"

async def _generar_audio(texto: str, filepath: str):
    communicate = edge_tts.Communicate(texto, voice=VOZ)
    await communicate.save(filepath)

def texto_a_audio(texto: str) -> str:
    filename = f"response_{uuid.uuid4()}.mp3"
    filepath = f"static/audio/{filename}"

    try:
        # Si ya hay un loop corriendo (FastAPI), úsalo
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, _generar_audio(texto, filepath))
                future.result()
        else:
            loop.run_until_complete(_generar_audio(texto, filepath))
    except RuntimeError:
        asyncio.run(_generar_audio(texto, filepath))

    return filepath