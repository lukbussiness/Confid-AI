from fastapi import HTTPException
import os
import time
import uuid
import traceback
import random
from groq import Groq
from dotenv import load_dotenv
from services.gemini_service import procesar_audio_entrevista, iniciar_entrevista_adso
from services.voice_service import texto_a_audio

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ============================================
# TEMPORIZADOR INTERNO DEL BACKEND
#
# FIX: El backend es la fuente de verdad del tiempo.
# El frontend ya NO envía segundos_restantes.
# Aquí se registra el timestamp de inicio y se
# calcula el tiempo restante en cada llamada.
#
# DURACIÓN TOTAL: 15 minutos = 900 segundos
# ============================================

DURACION_ENTREVISTA = 900  # segundos

_sesion_inicio: float = None        # timestamp cuando arranca la entrevista
_contador_silencios: int = 0
MAX_SILENCIOS = 3


def _segundos_restantes() -> int:
    """Calcula cuántos segundos quedan basándose en el tiempo real transcurrido."""
    if _sesion_inicio is None:
        return DURACION_ENTREVISTA
    transcurrido = time.time() - _sesion_inicio
    restantes = DURACION_ENTREVISTA - int(transcurrido)
    return max(0, restantes)


def _log_tiempo():
    """Imprime el tiempo restante de forma legible en consola."""
    seg = _segundos_restantes()
    minutos = seg // 60
    segundos = seg % 60
    if seg <= 60:
        print(f"⏰ TIEMPO RESTANTE: {seg}s — Luvani cerrará la entrevista")
    elif seg <= 180:
        print(f"⏰ TIEMPO RESTANTE: {minutos}m {segundos}s — Luvani comenzará a cerrar")
    else:
        print(f"⏰ TIEMPO RESTANTE: {minutos}m {segundos}s")


# ============================================
# INICIAR SESIÓN DE ENTREVISTA
#
# FIX: Ahora existe un endpoint/función de inicio
# que debe llamarse desde el frontend al arrancar.
# Registra el timestamp y devuelve el saludo de Luvani.
# ============================================

def iniciar_sesion(nombre_estudiante: str):
    global _sesion_inicio, _contador_silencios

    _sesion_inicio = time.time()
    _contador_silencios = 0

    print(f"🟢 Sesión iniciada para: {nombre_estudiante} | Tiempo: {DURACION_ENTREVISTA}s")

    try:
        saludo = iniciar_entrevista_adso(nombre_estudiante)
        print("✅ Saludo generado:", saludo)

        ruta_audio = texto_a_audio(saludo)
        print("✅ Audio del saludo guardado en:", ruta_audio)

        return {
            "respuesta_texto": saludo,
            "audio_url": ruta_audio,
            "segundos_restantes": _segundos_restantes(),
            "entrevista_finalizada": False
        }

    except Exception as e:
        print("\n💥 --- ERROR AL INICIAR SESIÓN --- 💥")
        print(f"El error es: {str(e)}")
        traceback.print_exc()
        print("--------------------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PROCESAR RESPUESTA DE VOZ NORMAL
# ============================================

def procesar_respuesta_voz(archivo, historial_str: str):
    """
    FIX: Ya no recibe segundos_restantes desde el frontend.
    Lo calcula internamente con _segundos_restantes().
    """
    global _contador_silencios

    temp_audio_path = None
    try:
        seg_restantes = _segundos_restantes()
        _log_tiempo()

        # Si el tiempo ya se agotó, cerrar sin procesar audio
        if seg_restantes == 0:
            return _respuesta_cierre_tiempo()

        # 1. Guardar el archivo temporalmente
        temp_audio_path = f"temp_audio/{uuid.uuid4()}.webm"
        os.makedirs("temp_audio", exist_ok=True)
        with open(temp_audio_path, "wb") as buffer:
            buffer.write(archivo.file.read())

        print("⏳ Procesando audio...")

        # 2. Procesar con el servicio de IA
        resultado = procesar_audio_entrevista(
            temp_audio_path,
            historial_str,
            segundos_restantes=seg_restantes
        )

        texto_usuario         = resultado.get("transcripcion_usuario", "")
        respuesta_luvani      = resultado.get("respuesta_entrevistador", "")
        analisis_voz          = resultado.get("analisis_voz", {})
        entrevista_finalizada = resultado.get("entrevista_finalizada", False)

        # Si el tiempo se agotó entre el inicio y el fin del procesamiento
        if _segundos_restantes() == 0 and not entrevista_finalizada:
            entrevista_finalizada = True
            respuesta_luvani = (
                "Ha concluido el tiempo de nuestra entrevista. "
                "Muchas gracias por tu tiempo. El equipo revisará tu perfil y estaremos en contacto pronto."
            )

        # Reiniciar contador de silencios porque el usuario respondió
        _contador_silencios = 0
        print(f"🔄 Silencios reiniciados → {_contador_silencios}/{MAX_SILENCIOS}")
        print("✅ Usuario dijo:", texto_usuario)
        print("✅ Luvani responde:", respuesta_luvani)
        print("🎤 Análisis de voz:", analisis_voz)
        print("🏁 Entrevista finalizada:", entrevista_finalizada)

        # 3. Sanitizar respuesta antes de convertir a audio
        respuesta_luvani = _sanitizar_respuesta(respuesta_luvani)

        ruta_audio = texto_a_audio(respuesta_luvani)
        print("✅ Audio guardado en:", ruta_audio)

        return {
            "texto_usuario":        texto_usuario,
            "respuesta_texto":      respuesta_luvani,
            "audio_url":            ruta_audio,
            "analisis_voz":         analisis_voz,
            "entrevista_finalizada": entrevista_finalizada,
            "segundos_restantes":   _segundos_restantes()
        }

    except Exception as e:
        print("\n💥 --- ERROR EN EL BACKEND --- 💥")
        print(f"El error es: {str(e)}")
        traceback.print_exc()
        print("--------------------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except:
                pass


# ============================================
# SANITIZAR RESPUESTA
# Elimina frases problemáticas antes de enviar el audio
# ============================================

def _sanitizar_respuesta(texto: str) -> str:
    if not texto or texto.strip() == "":
        return "Gracias por tu respuesta. Continuemos."

    if isinstance(texto, (dict, list)):
        texto = str(texto)

    # Eliminar cualquier mención accidental al tiempo o fases
    frases_prohibidas = [
        "quedan", "minutos restantes", "tiempo restante",
        "fase ", "fase:", "minuto", "cierre", "próxima fase"
    ]
    texto_lower = texto.lower()
    for frase in frases_prohibidas:
        if frase in texto_lower:
            # Loguear pero no bloquear — solo registrar para debugging
            print(f"⚠️  ADVERTENCIA: Respuesta menciona '{frase}' — revisar prompt")
            break

    return texto.strip()


# ============================================
# RESPUESTA DE CIERRE POR TIEMPO AGOTADO
# ============================================

def _respuesta_cierre_tiempo():
    mensaje = (
        "Hemos llegado al final del tiempo de la entrevista. "
        "Muchas gracias por participar. El equipo de selección revisará tu perfil "
        "y se pondrá en contacto contigo pronto. ¡Hasta luego!"
    )
    ruta_audio = texto_a_audio(mensaje)
    return {
        "texto_usuario":        "",
        "respuesta_texto":      mensaje,
        "audio_url":            ruta_audio,
        "analisis_voz":         {},
        "entrevista_finalizada": True,
        "segundos_restantes":   0
    }


# ============================================
# BANCO DE RESPUESTAS DE SILENCIO
# ============================================

RESPUESTAS_SILENCIO = [
    "Seguimos en línea. Necesito que respondas para continuar.",
    "Llevamos un momento en silencio. ¿Vas a continuar?",
    "Te recuerdo que estamos en sesión. Por favor responde.",
    "Aún estoy aquí. Necesito tu respuesta para avanzar.",
    "No he recibido respuesta. Si tienes dudas sobre la pregunta, dímelo.",
    "La entrevista continúa. Te espero para seguir.",
]

MENSAJE_CIERRE_SILENCIO = (
    "Hemos tenido varios momentos sin respuesta de tu parte. "
    "Voy a dar por finalizada la entrevista. "
    "Si deseas reagendar, puedes contactar al equipo de selección. Hasta luego."
)


# ============================================
# PROCESAR SILENCIO
# ============================================

def procesar_silencio(historial_str: str):
    """
    FIX: Ya no recibe segundos_restantes desde el frontend.
    """
    global _contador_silencios

    try:
        seg_restantes = _segundos_restantes()

        # Si el tiempo ya se agotó, cerrar directamente
        if seg_restantes == 0:
            return _respuesta_cierre_tiempo()

        _contador_silencios += 1
        print(f"🔇 Silencio #{_contador_silencios}/{MAX_SILENCIOS} | Tiempo restante: {seg_restantes}s")

        # ── 3 silencios consecutivos → cerrar ──
        if _contador_silencios >= MAX_SILENCIOS:
            print("🚨 Máximo de silencios — cerrando entrevista")
            _contador_silencios = 0

            ruta_audio = texto_a_audio(MENSAJE_CIERRE_SILENCIO)
            return {
                "respuesta_texto":      MENSAJE_CIERRE_SILENCIO,
                "audio_url":            ruta_audio,
                "entrevista_finalizada": True,
                "segundos_restantes":   seg_restantes
            }

        # ── Silencio 1 o 2 → Luvani reactiva ──
        referencia = random.choice(RESPUESTAS_SILENCIO)

        tono_extra = ""
        if _contador_silencios == 2:
            tono_extra = (
                "Este es el segundo silencio consecutivo. "
                "Sé más directa: deja claro que si no responde la entrevista podría cerrarse."
            )

        prompt = f"""Eres Luvani, entrevistadora de recursos humanos.
Estás en una entrevista laboral con un candidato de ADSO.

HISTORIAL:
{historial_str}

SITUACIÓN: El candidato lleva más de 1 minuto sin responder.
Este es el silencio #{_contador_silencios} de {MAX_SILENCIOS}.

{tono_extra}

INSTRUCCIÓN:
- Recuérdale brevemente que debe responder.
- Máximo 2 oraciones. Tono neutro y directo.
- NO uses "tómate tu tiempo" ni frases empáticas.
- NO hagas una pregunta nueva. Solo pide que retome.
- Inspírate en: "{referencia}" pero no la copies.

Responde ÚNICAMENTE con lo que diría Luvani.
"""

        from services.gemini_service import safe_chat_completion
        response = safe_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100
        )

        respuesta_texto = response.choices[0].message.content
        print("✅ Luvani (silencio):", respuesta_texto)

        ruta_audio = texto_a_audio(respuesta_texto)

        return {
            "respuesta_texto":      respuesta_texto,
            "audio_url":            ruta_audio,
            "entrevista_finalizada": False,
            "segundos_restantes":   seg_restantes
        }

    except Exception as e:
        print("\n💥 --- ERROR EN SILENCIO --- 💥")
        print(f"El error es: {str(e)}")
        traceback.print_exc()
        print("--------------------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# PROCESAR REPORTE FINAL
# ============================================

def procesar_reporte_final(historial_str: str, metricas_voz_str: str):
    try:
        from services.gemini_service import generar_reporte_final
        print("⏳ Generando reporte final...")
        resultado = generar_reporte_final(historial_str, metricas_voz_str)
        print("✅ Reporte final generado")
        return resultado
    except Exception as e:
        print("\n💥 --- ERROR AL GENERAR REPORTE --- 💥")
        print(f"El error es: {str(e)}")
        traceback.print_exc()
        print("--------------------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))