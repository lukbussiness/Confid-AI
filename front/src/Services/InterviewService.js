import axios from 'axios';

const API_URL = 'https://backend-confidai.onrender.com/interview';

// ============================================
// ENVIAR RESPUESTA DE VOZ NORMAL
// ============================================
export const iniciarEntrevista = async (nombre) => {
    const formData = new FormData();
    formData.append("nombre", nombre);

    const response = await fetch("https://backend-confidai.onrender.com/interview/iniciar", {
        method: "POST",
        body: formData
    });

    if (!response.ok) throw new Error("Error iniciando entrevista");

    return await response.json();
};
export const enviarRespuestaVoz = async (audioBlob, historial) => {
    const formData = new FormData();
    formData.append("audio", audioBlob);
    formData.append("historial", JSON.stringify(historial));

    const response = await fetch("https://backend-confidai.onrender.com/interview/responder-voz", {
        method: "POST",
        body: formData
    });

    return await response.json();
};

// ============================================
// AVISAR SILENCIO — usuario lleva 1 min sin grabar
// ============================================
export const avisarSilencio = async (historial) => {
    const formData = new FormData();
    formData.append("historial", JSON.stringify(historial));

    const response = await fetch("https://backend-confidai.onrender.com/interview/silencio", {
        method: "POST",
        body: formData
    });

    return await response.json();
};

// ============================================
// GENERAR REPORTE FINAL DE LA ENTREVISTA
// ============================================
export const generarReporte = async (historial, metricasVoz) => {
    const formData = new FormData();
    formData.append('historial', JSON.stringify(historial));
    formData.append('metricas_voz', JSON.stringify(metricasVoz));

    const response = await axios.post(`${API_URL}/generar-reporte`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};