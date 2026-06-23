import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enviarRespuestaVoz, avisarSilencio, generarReporte } from '../Services/InterviewService';
import { iniciarEntrevista } from '../Services/InterviewService';
import "../Style/Avatar.css";

const DURACION_MAX_SEGUNDOS = 15 * 60;
const SILENCIO_MAX_SEG = 15;

const Avatar = () => {
    const [status, setStatus] = useState('idle');
    const [historial, setHistorial] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [metricasVoz, setMetricasVoz] = useState([]);
    const [tiempoRestante, setTiempoRestante] = useState(DURACION_MAX_SEGUNDOS);

    const navigate = useNavigate();

    const mediaRecorderRef    = useRef(null);
    const audioChunksRef      = useRef([]);
    const chatEndRef          = useRef(null);
    const audioPlayerRef      = useRef(null);
    const localVideoRef       = useRef(null);
    const inicioEntrevistaRef = useRef(null);
    const silencioTimerRef    = useRef(null);
    const redireccionTimerRef = useRef(null);
    const avatarVideoRef      = useRef(null);
    const timerIntervalRef    = useRef(null);

    const [cameraError, setCameraError] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraInitialized, setCameraInitialized] = useState(false);
    const [interviewStarted, setInterviewStarted] = useState(false);

    // ============================================
    // TIMER VISIBLE
    // ============================================
    useEffect(() => {
        timerIntervalRef.current = setInterval(() => {
            if (inicioEntrevistaRef.current) {
                const transcurridos = Math.floor((Date.now() - inicioEntrevistaRef.current) / 1000);
                const restantes = Math.max(0, DURACION_MAX_SEGUNDOS - transcurridos);
                setTiempoRestante(restantes);
            }
        }, 1000);
        return () => clearInterval(timerIntervalRef.current);
    }, []);

    const formatTiempo = (segundos) => {
        const m = Math.floor(segundos / 60).toString().padStart(2, '0');
        const s = (segundos % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ============================================
    // INICIO
    // ============================================
    useEffect(() => {
        if (!cameraInitialized) return;
        if (cameraError || !cameraReady) return;
        if (interviewStarted) return;
        
        const iniciar = async () => {
            try {
                setStatus('processing');
                setInterviewStarted(true);
                const nombre = localStorage.getItem("nombre_usuario") || "Candidato";
                const respuesta = await iniciarEntrevista(nombre);
                const audioUrl = `https://backend-confidai.onrender.com/${respuesta.audio_url}`;
                setHistorial([{ rol: 'entrevistador', contenido: respuesta.respuesta_texto, hora: new Date() }]);
                reproducirAudio(audioUrl, handleAudioEnded);
            } catch (error) {
                console.error("Error iniciando entrevista:", error);
                setStatus('idle');
                setErrorMsg("No se pudo iniciar la entrevista.");
                setInterviewStarted(false);
            }
        };
        iniciar();
    }, [cameraInitialized, cameraError, cameraReady, interviewStarted]);

    // ============================================
    // CALCULAR SEGUNDOS RESTANTES
    // ============================================
    const calcularSegundosRestantes = () => {
        if (!inicioEntrevistaRef.current) return DURACION_MAX_SEGUNDOS;
        const transcurridos = Math.floor((Date.now() - inicioEntrevistaRef.current) / 1000);
        return Math.max(0, DURACION_MAX_SEGUNDOS - transcurridos);
    };

    // ============================================
    // FINALIZAR Y REDIRIGIR
    // ============================================
    const finalizarYRedirigir = async (audioUrl, historyToEvaluate, metricsToEvaluate) => {
        setStatus('finished');
        if (!audioPlayerRef.current) {
            audioPlayerRef.current = new Audio(audioUrl);
        } else {
            audioPlayerRef.current.src = audioUrl;
        }
        audioPlayerRef.current.play().catch(() => {});
        try {
            const metricasM = metricsToEvaluate || metricasVoz;
            const avgSpeed = metricasM.length ? metricasM.reduce((acc, curr) => acc + (curr.velocidad_palabras_segundo || 0), 0) / metricasM.length : 0;
            const totalMule = metricasM.reduce((acc, curr) => acc + (curr.muletillas_detectadas || 0), 0);
            const maxPause = metricasM.length ? Math.max(...metricasM.map(m => m.pausa_maxima || 0)) : 0;
            const metricasResumen = {
                velocidad_promedio: avgSpeed.toFixed(2),
                total_muletillas: totalMule,
                pausa_maxima_extrema: maxPause
            };
            const reporte = await generarReporte(historyToEvaluate || historial, metricasResumen);
            localStorage.setItem("reporte_entrevista", JSON.stringify(reporte));
            navigate('/resultados');
        } catch (e) {
            console.error("Error generando reporte:", e);
            setErrorMsg("No se pudo generar el reporte. Redirigiendo...");
            setTimeout(() => navigate('/resultados'), 3000);
        }
    };

    // ============================================
    // REPRODUCIR AUDIO
    // ============================================
    const reproducirAudio = (audioUrl, onEnded) => {
        if (!audioPlayerRef.current) {
            audioPlayerRef.current = new Audio(audioUrl);
        } else {
            audioPlayerRef.current.src = audioUrl;
        }
        if (avatarVideoRef.current) {
            avatarVideoRef.current.currentTime = 0;
            avatarVideoRef.current.play().catch(() => {
                // Ignorar interrupciones de reproducción de video en segundo plano.
            });
        }
        setStatus('speaking');
        audioPlayerRef.current.play().catch(e => {
            console.error("Error reproduciendo audio:", e);
            setStatus('idle');
        });
        audioPlayerRef.current.onended = () => {
            if (avatarVideoRef.current) {
                avatarVideoRef.current.pause();
                avatarVideoRef.current.currentTime = 0;
            }
            onEnded();
        };
    };

    // ============================================
    // TIMER DE SILENCIO
    // ============================================
    const limpiarTimerSilencio = () => {
        if (silencioTimerRef.current) {
            clearTimeout(silencioTimerRef.current);
            silencioTimerRef.current = null;
        }
    };

    const iniciarTimerSilencio = (historialActual) => {
        limpiarTimerSilencio();
        silencioTimerRef.current = setTimeout(async () => {
            setStatus(currentStatus => {
                if (currentStatus !== 'idle') return currentStatus;
                (async () => {
                    try {
                        const segundosRestantes = calcularSegundosRestantes();
                        if (segundosRestantes <= 60) return;
                        const respuesta = await avisarSilencio(historialActual);
                        setHistorial(prev => [...prev, { rol: 'entrevistador', contenido: respuesta.respuesta_texto, hora: new Date() }]);
                        const audioUrl = `https://backend-confidai.onrender.com/${respuesta.audio_url}`;
                        if (respuesta.entrevista_finalizada) {
                            finalizarYRedirigir(audioUrl, historialActual, metricasVoz);
                            return;
                        }
                        reproducirAudio(audioUrl, handleAudioEnded);
                    } catch (e) {
                        console.error("Error al avisar silencio:", e);
                        setStatus('idle');
                    }
                })();
                return 'processing';
            });
        }, SILENCIO_MAX_SEG * 1000);
    };

    // ============================================
    // CÁMARA
    // ============================================
    useEffect(() => {
        inicioEntrevistaRef.current = Date.now();
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                setCameraReady(true);
                setCameraInitialized(true);
            } catch (err) {
                console.error("No se pudo acceder a la cámara:", err);
                setCameraError(true);
                setErrorMsg('⚠️ Debes encender la cámara para comenzar la entrevista.');
                setCameraInitialized(true);
            }
        };
        initCamera();
        const video = localVideoRef.current;
        return () => {
            limpiarTimerSilencio();
            if (redireccionTimerRef.current) clearTimeout(redireccionTimerRef.current);
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        if (status === 'idle') {
            iniciarTimerSilencio(historial);
        } else {
            limpiarTimerSilencio();
        }
    }, [status, historial]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [historial, status]);

    const handleAudioEnded = () => {
        if (status !== 'finished') setStatus('idle');
    };

    // ============================================
    // GRABACIÓN
    // ============================================
    const iniciarGrabacion = async () => {
        if (!cameraReady) {
            setErrorMsg('⚠️ Debes encender la cámara para comenzar la entrevista.');
            return;
        }
        setErrorMsg('');
        audioChunksRef.current = [];
        limpiarTimerSilencio();
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];
                setStatus('processing');
                try {
                    const respuesta = await enviarRespuestaVoz(audioBlob, historial);
                    const nuevoHistorial = [
                        ...historial,
                        { rol: 'usuario', contenido: respuesta.texto_usuario, hora: new Date() },
                        { rol: 'entrevistador', contenido: respuesta.respuesta_texto, hora: new Date() }
                    ];
                    setHistorial(nuevoHistorial);
                    const audioUrl = `https://backend-confidai.onrender.com/${respuesta.audio_url}`;
                    const nuevasMetricas = respuesta.analisis_voz ? [...metricasVoz, respuesta.analisis_voz] : metricasVoz;
                    if (respuesta.analisis_voz) setMetricasVoz(nuevasMetricas);
                    if (respuesta.entrevista_finalizada) {
                        finalizarYRedirigir(audioUrl, nuevoHistorial, nuevasMetricas);
                        return;
                    }
                    reproducirAudio(audioUrl, handleAudioEnded);
                } catch (error) {
                    console.error("Error en backend:", error);
                    setStatus('idle');
                    setErrorMsg(error.response?.status === 500 ? "Error 500 en el servidor." : "No se pudo conectar con el servidor.");
                }
            };
            mediaRecorderRef.current.start();
            setStatus('listening');
        } catch (error) {
            console.error("Error micrófono:", error);
            setErrorMsg("Debes permitir el acceso al micrófono.");
        }
    };

    const detenerGrabacion = () => {
        if (mediaRecorderRef.current && status === 'listening') {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            mediaRecorderRef.current.stop();
        }
    };

    // ============================================
    // HELPERS DE UI
    // ============================================
    const getStatusLabel = () => {
        switch (status) {
            case 'idle':       return 'Esperando...';
            case 'listening':  return 'Te estoy escuchando...';
            case 'processing': return 'Analizando respuesta...';
            case 'speaking':   return 'Entrevistadora hablando...';
            case 'finished':   return 'Redirigiendo...';
            default:           return '';
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'listening':  return '#ec4899';
            case 'processing': return '#f59e0b';
            case 'speaking':   return '#10b981';
            default:           return '#64748b';
        }
    };

    const formatHora = (fecha) => {
        if (!fecha) return '';
        return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="avatar-container">
            <div className="grid-texture"></div>
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>

            {errorMsg && (
                <div className="error-toast">
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* TOP BAR */}
            <div className="top-bar">
                <h1 className="logo_text">
                    Confid<span className="highlight">AI</span>
                </h1>
                <div className={`status-badge ${status}`}>
                    <div className="status-dot"></div>
                    {getStatusLabel()}
                </div>
                <div className="timer-box">
                    <span className="timer-label">Tiempo restante</span>
                    <span className={`timer-value ${tiempoRestante < 60 ? 'danger' : ''}`}>
                        {formatTiempo(tiempoRestante)}
                    </span>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="main-content">

                {/* VIDEO + PANELS */}
                <div className="panels-area">
                    {/* AI PANEL */}
                    <div className={`video-pane ai-pane ${status}`}>
                        <div className="pane-glow-border"></div>

                        <div className="pane-indicator ai-indicator">
                            <span className={`indicator-dot dot-${status}`}></span>
                            Luvani • {status === 'speaking' ? 'Hablando' : status === 'listening' ? 'Escuchando' : 'En espera'}
                        </div>

                        <video
                            ref={avatarVideoRef}
                            src="videos/luvani.mp4"
                            muted
                            loop
                            className="avatar-video"
                        />

                        {status === 'speaking' && (
                            <div className="waveform-overlay">
                                {Array.from({ length: 14 }).map((_, i) => (
                                    <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.07}s` }}></span>
                                ))}
                            </div>
                        )}

                        <div className="name-tag">Entrevistadora AI</div>
                    </div>

                    {/* USER PANEL */}
                    <div className="video-pane user-pane">
                        <div className="pane-indicator user-indicator">
                            <span className="indicator-dot dot-user"></span>
                            Tú
                            {status === 'listening' && (
                                <span className="listening-bars">
                                    <span></span><span></span><span></span>
                                </span>
                            )}
                        </div>

                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="pane-video-feed"
                        />

                        {cameraError && (
                            <div className="camera-error-overlay">
                                <span>📷</span>
                                Cámara no disponible
                            </div>
                        )}

                        <div className="name-tag">Tú</div>
                    </div>
                </div>

                {/* CHAT SIDEBAR */}
                <div className="chat-sidebar">
                    <div className="chat-sidebar-header">
                        Historial de conversación
                    </div>
                    <div className="chat-sidebar-messages">
                        {historial.length === 0 ? (
                            <div className="chat-empty">
                                El historial aparecerá aquí.
                            </div>
                        ) : (
                            historial.map((msg, index) => (
                                <div key={index} className={`chat-msg ${msg.rol === 'usuario' ? 'msg-user' : 'msg-ai'}`}>
                                    {msg.rol === 'entrevistador' && (
                                        <div className="msg-avatar-circle">AI</div>
                                    )}
                                    <div className="msg-body">
                                        <div className="msg-bubble">{msg.contenido}</div>
                                        <div className="msg-time">
                                            {formatHora(msg.hora)}
                                            {msg.rol === 'usuario' && <span className="msg-check"> ✓✓</span>}
                                        </div>
                                    </div>
                                    {msg.rol === 'usuario' && (
                                        <div className="msg-avatar-circle msg-avatar-user">👤</div>
                                    )}
                                </div>
                            ))
                        )}

                        {status === 'processing' && (
                            <div className="chat-msg msg-ai">
                                <div className="msg-avatar-circle">AI</div>
                                <div className="msg-body">
                                    <div className="msg-bubble typing-bubble">
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>
                </div>
            </div>

            {/* BOTTOM BAR */}
            <div className="bottom-bar">
                {/* Waveform central */}
                <div className="bottom-waveform">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <span
                            key={i}
                            className={`bottom-wave-bar ${status === 'listening' ? 'active' : ''}`}
                            style={{ animationDelay: `${i * 0.05}s` }}
                        ></span>
                    ))}
                </div>

                {/* Botón micrófono */}
                <div className="mic-center">
                    {status === 'finished' ? (
                        <div className="finished-message">Entrevista finalizada. Redirigiendo...</div>
                    ) : (
                        <>
                            <button
                                className={`mic-button ${status === 'listening' ? 'recording' : 'idle'}`}
                                onClick={status === 'listening' ? detenerGrabacion : iniciarGrabacion}
                                disabled={status === 'processing' || status === 'speaking'}
                            >
                                <svg className="mic-svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                                    <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                            <span className="mic-label">
                                {status === 'listening' ? 'Detener' : 'Responder'}
                            </span>
                        </>
                    )}
                </div>

                {/* Waveform derecho */}
                <div className="bottom-waveform">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <span
                            key={i}
                            className={`bottom-wave-bar ${status === 'listening' ? 'active' : ''}`}
                            style={{ animationDelay: `${(24 - i) * 0.05}s` }}
                        ></span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Avatar;