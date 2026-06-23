from groq import Groq
import os
from dotenv import load_dotenv
import librosa
import numpy as np
import re
from concurrent.futures import ThreadPoolExecutor
import json

# ============================================
# CONFIGURAR GROQ
# ============================================

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")

if not groq_api_key:
    raise ValueError("🚨 ALERTA: No se encontró GROQ_API_KEY. Revisa tu archivo .env")

client = Groq(api_key=groq_api_key)


def safe_chat_completion(messages, max_tokens, model="llama-3.3-70b-versatile", temperature=None, response_format=None):
    try:
        kwargs = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens
        }
        if temperature is not None:
            kwargs["temperature"] = temperature
        if response_format is not None:
            kwargs["response_format"] = response_format
            
        return client.chat.completions.create(**kwargs)
    except Exception as e:
        print(f"⚠️ Error llamando al modelo primario {model}: {e}")
        fallback_model = "llama-3.1-8b-instant"
        if model != fallback_model:
            print(f"🔄 Reintentando automáticamente con modelo de respaldo: {fallback_model}...")
            kwargs["model"] = fallback_model
            try:
                return client.chat.completions.create(**kwargs)
            except Exception as e2:
                print(f"❌ Error con modelo de respaldo {fallback_model}: {e2}")
                raise e2
        raise e


# ============================================
# ANALISIS BASICO DEL AUDIO
# ============================================

def analizar_audio_basico(audio_path):
    y, sr = librosa.load(audio_path)
    duracion = librosa.get_duration(y=y, sr=sr)
    energia = np.mean(np.abs(y))
    return {
        "duracion": round(duracion, 2),
        "energia": float(energia)
    }


# ============================================
# DETECTAR PAUSAS
# ============================================

def detectar_pausas(audio_path):
    y, sr = librosa.load(audio_path)
    intervalos = librosa.effects.split(y, top_db=20)
    pausas = []
    for i in range(len(intervalos) - 1):
        pausa = (intervalos[i+1][0] - intervalos[i][1]) / sr
        pausas.append(pausa)
    if pausas:
        return round(max(pausas), 2)
    return 0


# ============================================
# VELOCIDAD DE RESPUESTA
# ============================================

def velocidad_respuesta(texto, duracion):
    palabras = len(texto.split())
    if duracion == 0:
        return 0
    return round(palabras / duracion, 2)


# ============================================
# RESPUESTA MUY CORTA
# ============================================

def respuesta_corta(texto):
    palabras = len(texto.split())
    return palabras < 5


# ============================================
# DETECTAR MULETILLAS
# ============================================

def detectar_muletillas(texto):
    muletillas = [
        r"(?<!\w)eh(?!\w)", r"(?<!\w)ehh(?!\w)", r"(?<!\w)ehhh(?!\w)",
        r"(?<!\w)emm(?!\w)", r"(?<!\w)mmm(?!\w)", r"(?<!\w)este(?!\w)",
        r"(?<!\w)pues(?!\w)", r"o sea", r"digamos", r"como que",
        r"(?<!\w)bueno(?!\w)", r"(?<!\w)tipo(?!\w)", r"(?<!\w)osea(?!\w)",
        r"básicamente", r"basicamente", r"(?<!\w)igual(?!\w)",
        r"la verdad", r"en realidad",
    ]
    texto_lower = texto.lower()
    contador = 0
    for patron in muletillas:
        contador += len(re.findall(patron, texto_lower))
    return contador


# ============================================
# DETECTAR TARTAMUDEO
# ============================================

def detectar_tartamudeo(texto):
    palabras = texto.lower().split()
    repeticiones = 0
    for i in range(len(palabras) - 1):
        if palabras[i] == palabras[i+1] and len(palabras[i]) > 1:
            repeticiones += 1
    return repeticiones


# ============================================
# EVALUACION DEL COMPORTAMIENTO
# ============================================

def evaluar_comportamiento_voz(duracion, pausa, velocidad, es_corta, muletillas, tartamudeo):
    resultado = {}

    if pausa > 3 or muletillas > 4:
        resultado["nivel_nerviosismo"] = "Alto"
    elif pausa > 1.5 or muletillas > 2:
        resultado["nivel_nerviosismo"] = "Medio"
    else:
        resultado["nivel_nerviosismo"] = "Bajo"

    if velocidad < 1 or tartamudeo > 2:
        resultado["fluidez"] = "Baja"
    elif velocidad < 2.5:
        resultado["fluidez"] = "Normal"
    else:
        resultado["fluidez"] = "Alta"

    resultado["claridad"] = "Respuesta poco desarrollada" if es_corta else "Explicación clara"

    if pausa > 2.5 or muletillas > 3:
        resultado["seguridad"] = "Baja"
    elif pausa > 1:
        resultado["seguridad"] = "Media"
    else:
        resultado["seguridad"] = "Alta"

    return resultado


# ============================================
# LIMPIAR TRANSCRIPCION
# ============================================

def limpiar_transcripcion(texto):
    texto = re.sub(r"\d{2}:\d{2}:\d{2}:\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}:\d{3}", "", texto)
    texto = texto.replace("\n", " ").strip()
    return texto


# ============================================
# BANCO DE PREGUNTAS POR FASE
#
#  Fase 1 — PERSONAL     : seg 900 → 720  (~3 min)
#  Fase 2 — MOTIVACIONAL : seg 720 → 540  (~3 min)
#  Fase 3 — TÉCNICA      : seg 540 → 300  (~4 min)
#  Fase 4 — PROYECTOS    : seg 300 → 120  (~3 min)
#  Fase 5 — ACTITUDINAL  : seg 120 →  60  (~1 min)
#  CIERRE                : seg  60 →   0
# ============================================

BANCO_PREGUNTAS = {
    "personal": [
        "¿Qué fue lo que te llevó a elegir la carrera de Análisis y Desarrollo de Software?",
        "¿Cómo describirías tu trayectoria hasta llegar a estudiar ADSO?",
        "¿Qué es lo que más te gusta del área de desarrollo de software?",
        "¿Tienes algún referente o persona que haya influido en tu interés por la tecnología?",
        "¿Cómo equilibras tus estudios con otras responsabilidades o actividades?",
    ],
    "motivacional": [
        "¿Por qué te interesa trabajar en una empresa de tecnología?",
        "¿Dónde te ves profesionalmente en los próximos dos o tres años?",
        "¿Qué tipo de proyectos o retos te gustaría enfrentar en tu primer empleo?",
        "¿Qué te motivó a postularte a esta posición en particular?",
        "¿Qué esperas aprender en un entorno laboral que no puedas aprender en la academia?",
    ],
    "tecnica": [
        "¿Con qué lenguajes de programación te sientes más cómodo trabajando actualmente?",
        "¿Puedes explicarme qué es una API REST y para qué se usa?",
        "¿Cuál es la diferencia entre una base de datos relacional y una no relacional?",
        "¿Qué herramientas de control de versiones has usado? ¿Cómo describes tu experiencia con Git?",
        "¿Qué es el patrón MVC y en qué situaciones lo has aplicado?",
        "¿Cómo manejarías un error inesperado en producción que afecta a los usuarios?",
        "¿Qué frameworks o librerías has explorado por tu cuenta fuera de la academia?",
        "¿Qué entiendes por código limpio y por qué es importante?",
    ],
    "proyectos": [
        "¿Puedes contarme sobre algún proyecto académico o personal que hayas desarrollado?",
        "¿Cuál ha sido el proyecto más complejo en el que has participado y cuál fue tu rol?",
        "¿Has trabajado en equipo para desarrollar software? ¿Cómo fue esa experiencia?",
        "¿Alguna vez tuviste que resolver un problema técnico difícil en un proyecto? ¿Qué hiciste?",
        "¿Tienes proyectos personales, repositorios en GitHub o algo que hayas construido por iniciativa propia?",
    ],
    "actitudinal": [
        "¿Cómo reaccionas cuando recibes una crítica sobre tu trabajo o tu código?",
        "¿Qué haces cuando te atascas en un problema y no encuentras la solución?",
        "¿Cómo te adaptas cuando cambian los requisitos de un proyecto en medio del desarrollo?",
        "¿Prefieres trabajar de forma independiente o en equipo? ¿Por qué?",
        "¿Cómo manejas la presión cuando tienes varios entregables al mismo tiempo?",
        "¿Qué harías si no estás de acuerdo con una decisión técnica tomada por tu equipo?",
    ],
}


# ============================================
# DETERMINAR FASE SEGÚN TIEMPO RESTANTE
# ============================================

def _determinar_fase(segundos_restantes: int) -> dict:
    if segundos_restantes > 720:
        return {"nombre": "PERSONAL",     "numero": 1, "clave": "personal",     "preguntas": BANCO_PREGUNTAS["personal"]}
    elif segundos_restantes > 540:
        return {"nombre": "MOTIVACIONAL", "numero": 2, "clave": "motivacional", "preguntas": BANCO_PREGUNTAS["motivacional"]}
    elif segundos_restantes > 300:
        return {"nombre": "TÉCNICA",      "numero": 3, "clave": "tecnica",      "preguntas": BANCO_PREGUNTAS["tecnica"]}
    elif segundos_restantes > 120:
        return {"nombre": "PROYECTOS",    "numero": 4, "clave": "proyectos",    "preguntas": BANCO_PREGUNTAS["proyectos"]}
    else:
        return {"nombre": "ACTITUDINAL",  "numero": 5, "clave": "actitudinal",  "preguntas": BANCO_PREGUNTAS["actitudinal"]}


# ============================================
# EXTRAER PREGUNTAS YA HECHAS DEL HISTORIAL
# ============================================

def _preguntas_ya_hechas(historial_conversacion: str, preguntas_banco: list) -> list:
    """
    Compara las preguntas del banco contra el historial para saber
    cuáles ya fueron formuladas (comparación normalizada).
    """
    historial_lower = historial_conversacion.lower()
    ya_hechas = []
    for pregunta in preguntas_banco:
        # Tomar las primeras 6 palabras como huella de la pregunta
        huella = " ".join(pregunta.lower().split()[:6])
        if huella in historial_lower:
            ya_hechas.append(pregunta)
    return ya_hechas


# ============================================
# BLOQUE DE FASE PARA EL PROMPT
# ============================================

def _bloque_fase(segundos_restantes: int, historial_conversacion: str) -> str:
    fase = _determinar_fase(segundos_restantes)
    ya_hechas = _preguntas_ya_hechas(historial_conversacion, fase["preguntas"])
    pendientes = [p for p in fase["preguntas"] if p not in ya_hechas]

    print(f"📋 FASE: {fase['nombre']} | Hechas: {len(ya_hechas)} | Pendientes: {len(pendientes)}")

    if pendientes:
        preguntas_formateadas = "\n".join(f"  - {p}" for p in pendientes)
        instruccion_preguntas = f"""
PREGUNTAS PENDIENTES DE ESTA FASE (elige UNA, la que mejor fluya con lo último que dijo el candidato):
{preguntas_formateadas}

REGLA: Debes hacer estas preguntas en orden aproximado. No las inventes ni las cambies sustancialmente.
Si el candidato ya tocó el tema de alguna, puedes saltarla y pasar a la siguiente pendiente.
"""
    else:
        instruccion_preguntas = """
Ya hiciste todas las preguntas de esta fase.
Puedes hacer UNA pregunta de profundización sobre algo concreto que el candidato mencionó antes.
No inventes temas nuevos ni adelantes preguntas de la siguiente fase.
"""

    return f"""
FASE ACTUAL: {fase["numero"]}/5 — {fase["nombre"]}
{instruccion_preguntas}
"""


# ============================================
# BLOQUE DE CIERRE PARA EL PROMPT (interno — no mencionar tiempo al candidato)
# ============================================

def _bloque_cierre(segundos_restantes: int) -> str:
    if segundos_restantes <= 60:
        return """
INSTRUCCIÓN DE CIERRE (solo para ti, no lo menciones al candidato):
La entrevista está por terminar. No hagas más preguntas.
Agradece brevemente al candidato por su tiempo y dile que el equipo estará en contacto.
Despídete en máximo 2 oraciones. Tono cordial pero neutro.
"""
    elif segundos_restantes <= 180:
        return """
INSTRUCCIÓN INTERNA: La entrevista está llegando a su fin.
Puedes hacer máximo UNA pregunta más. Luego prepara el cierre.
No menciones el tiempo al candidato.
"""
    return ""


# ============================================
# INICIAR ENTREVISTA — presentación de Luvani
# FIX: esta función ahora es el punto de entrada real al iniciar sesión
# ============================================

def iniciar_entrevista_adso(nombre_estudiante: str) -> str:
    """
    Genera el saludo inicial de Luvani. Debe llamarse UNA sola vez
    al arrancar la sesión, antes de que el candidato hable.
    """
    primera_pregunta = BANCO_PREGUNTAS["personal"][0]

    prompt = f"""Eres Luvani, entrevistadora de recursos humanos en una empresa de tecnología.
Vas a entrevistar a {nombre_estudiante}, estudiante de Análisis y Desarrollo de Software.

Haz exactamente esto en orden, todo seguido sin listas:
1. Saluda a {nombre_estudiante} por su nombre.
2. Preséntate: di que eres Luvani, del equipo de selección.
3. Di que van a tener una conversación breve para conocerlo mejor.
4. Haz esta pregunta exacta al final: "{primera_pregunta}"

REGLAS ESTRICTAS:
- Máximo 3 oraciones antes de la pregunta. La pregunta es la cuarta.
- Tono profesional y directo. Sin efusividad, sin "¡Qué gusto!", sin emojis.
- No uses listas ni bullets. Solo texto corrido.
- No agregues nada después de la pregunta.
"""

    response = safe_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200
    )
    return response.choices[0].message.content


# ============================================
# PROCESAR AUDIO DE ENTREVISTA
# ============================================

def procesar_audio_entrevista(
    audio_path: str,
    historial_conversacion: str,
    segundos_restantes: int = 900
):
    # ── PASO 1: Transcripción + análisis de audio en paralelo ──
    def transcribir():
        with open(audio_path, "rb") as f:
            return client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=f,
                response_format="text"
            )

    def analizar():
        return analizar_audio_basico(audio_path)

    def pausas():
        return detectar_pausas(audio_path)

    with ThreadPoolExecutor(max_workers=3) as executor:
        fut_t = executor.submit(transcribir)
        fut_a = executor.submit(analizar)
        fut_p = executor.submit(pausas)
        transcripcion  = fut_t.result()
        analisis_audio = fut_a.result()
        pausa_maxima   = fut_p.result()

    texto_usuario = limpiar_transcripcion(transcripcion)

    # ── PASO 2: Bloques dinámicos del prompt ──
    es_cierre = segundos_restantes <= 60

    bloque_fase   = _bloque_fase(segundos_restantes, historial_conversacion) if not es_cierre else ""
    bloque_cierre = _bloque_cierre(segundos_restantes)

    prompt = f"""Eres Luvani, entrevistadora de recursos humanos en una empresa de tecnología.
Estás haciendo una entrevista laboral a un candidato de ADSO.

HISTORIAL DE LA CONVERSACIÓN:
{historial_conversacion}

LO QUE ACABA DE DECIR EL CANDIDATO:
"{texto_usuario}"

{bloque_fase}
{bloque_cierre}

TU PERSONALIDAD Y REGLAS:
- Eres directa, profesional y concisa. Hablas como una entrevistadora real, no como un chatbot.
- NUNCA repitas ni parafrasees lo que dijo el candidato. No hagas eco de su respuesta.
- NUNCA uses frases de validación emocional: nada de "entiendo", "qué interesante", "muy bien",
  "excelente", "me alegra escuchar eso", "gracias por compartir". Nada de eso.
- Si la respuesta fue clara, ve directo a la siguiente pregunta.
- Si la respuesta fue vaga o muy corta (menos de 10 palabras), pide que amplíe con UNA frase
  neutra y concisa: "¿Puedes dar más detalle sobre eso?" o "Cuéntame un poco más."
- Si el candidato está nervioso, di solo: "Tranquilo, tómate un momento." y repite la pregunta.
- NUNCA hagas más de una pregunta a la vez.
- Máximo 3 oraciones en total en tu respuesta (transición + pregunta). Sé breve.
- Solo texto corrido. Sin listas, sin bullets, sin formato.
- No menciones tiempos, fases ni nada relacionado con la estructura de la entrevista.

Responde ÚNICAMENTE con lo que diría Luvani. Sin explicaciones adicionales.
"""

    response = safe_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=180
    )
    
    respuesta_luvani = response.choices[0].message.content

    # ── PASO 3: Métricas de voz ──
    velocidad            = velocidad_respuesta(texto_usuario, analisis_audio["duracion"])
    es_corta             = respuesta_corta(texto_usuario)
    muletillas_det       = detectar_muletillas(texto_usuario)
    tartamudeo_det       = detectar_tartamudeo(texto_usuario)

    evaluacion = evaluar_comportamiento_voz(
        analisis_audio["duracion"], pausa_maxima,
        velocidad, es_corta, muletillas_det, tartamudeo_det
    )

    return {
        "transcripcion_usuario":  texto_usuario,
        "respuesta_entrevistador": respuesta_luvani,
        "entrevista_finalizada":  es_cierre,
        "fase_actual": _determinar_fase(segundos_restantes)["nombre"] if not es_cierre else "CIERRE",
        "analisis_voz": {
            "duracion_respuesta":        analisis_audio["duracion"],
            "pausa_maxima":              pausa_maxima,
            "velocidad_palabras_segundo": velocidad,
            "respuesta_corta":           es_corta,
            "muletillas_detectadas":     muletillas_det,
            "posible_tartamudeo":        tartamudeo_det,
            "evaluacion_comportamiento": evaluacion
        }
    }

# ============================================
# GENERAR REPORTE FINAL
# ============================================

def generar_reporte_final(historial_str: str, metricas_voz_str: str):
    prompt = f"""Eres un experto evaluador de recursos humanos para perfiles tecnológicos (ADSO).
Evalúa la siguiente transcripción de entrevista y las métricas de voz del candidato para generar un reporte de retroalimentación estructurado en JSON.

HISTORIAL DE LA ENTREVISTA:
{historial_str}

MÉTRICAS DE VOZ DEL CANDIDATO:
{metricas_voz_str}

Tu tarea es devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
{{
  "radarData": [
    {{"skill": "Comunicación", "value": 85}},
    {{"skill": "Resolución", "value": 70}},
    {{"skill": "Técnica", "value": 90}},
    {{"skill": "Liderazgo", "value": 60}},
    {{"skill": "Adaptabilidad", "value": 80}}
  ],
  "feedbackItems": [
    {{"label": "Claridad y Coherencia", "score": 85, "value": "Explicación breve basada en las respuestas dadas y el análisis de voz."}},
    {{"label": "Conocimiento Técnico", "score": 90, "value": "..."}},
    {{"label": "Seguridad al Hablar", "score": 75, "value": "..."}}
  ],
  "actionItems": [
    {{"icon": "📚", "text": "Repasar conceptos de bases de datos relacionales."}},
    {{"icon": "🗣️", "text": "Practicar respuestas más estructuradas."}},
    {{"icon": "💻", "text": "Crear un proyecto personal en GitHub."}}
  ],
  "globalFeedback": "Resumen general del desempeño del candidato en 2 o 3 oraciones."
}}

REGLAS:
- Ajusta los valores de 'value' y 'score' (0 a 100) basándote en el historial y las métricas de forma realista.
- Si el candidato no respondió ninguna pregunta, devuelve 0 en todos los valores de 'radarData', un feedback claro que explique que no hubo respuestas y un plan de acción corto.
- En 'radarData', asegúrate de proveer exactamente 5 habilidades.
- En 'feedbackItems', provee 3 o 4 puntos clave a evaluar.
- En 'actionItems', provee 3 o 4 sugerencias accionables con un emoji representativo en 'icon'.
"""

    response = safe_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500,
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    
    respuesta_texto = response.choices[0].message.content.strip()
    
    try:
        reporte_json = json.loads(respuesta_texto)
        return reporte_json
    except Exception as e:
        print(f"Error parseando JSON del reporte: {e}\\nRespuesta cruda: {respuesta_texto}")
        return {
            "radarData": [
                {"skill": "Comunicación", "value": 75},
                {"skill": "Técnica", "value": 75},
                {"skill": "Adaptabilidad", "value": 75},
                {"skill": "Resolución", "value": 75},
                {"skill": "Seguridad", "value": 75}
            ],
            "feedbackItems": [
                {"label": "Desempeño General", "score": 75, "value": "La entrevista fue completada, sin embargo, ocurrió un error procesando el feedback detallado."}
            ],
            "actionItems": [
                {"icon": "✅", "text": "Continuar practicando para futuras entrevistas."}
            ],
            "globalFeedback": "Buen desempeño general. La evaluación detallada no está disponible en este momento."
        }
