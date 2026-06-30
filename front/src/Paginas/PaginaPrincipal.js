import React, { useEffect, useRef } from "react";
import Encabezado from "../Componentes/Encabezado";
import { useNavigate } from "react-router-dom";
import "../Style/Paginaprincipal.css";

export default function PaginaPrincipal() {
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/";
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (window.innerWidth <= 768) return;

      if (imageRef.current && containerRef.current) {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;

        const xPos = (clientX / innerWidth - 0.5) * 20;
        const yPos = (clientY / innerHeight - 0.5) * 20;

        imageRef.current.style.transform = `translate(${xPos}px, ${yPos}px)`;
      }
    };

    const container = containerRef.current;
    if (container) container.addEventListener("mousemove", handleMouseMove);
    return () => {
      if (container) container.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="contenedor">
      <Encabezado />
      
      {/* SECCIÓN HERO (PRINCIPAL) */}
      <div className="principal" ref={containerRef}>
        <div className="grid-texture" />

        <div className="principal-contenedor">
          <div className="principal-eyebrow">Plataforma de entrenamiento con IA</div>
          <h1>
            Bienvenido a <span>ConfidAI</span>. Supera el miedo, domina tu confianza.
          </h1>
          <p>
            Entrena tu mente para entrevistas reales. Nuestro evaluador de IA te ayuda
            a gestionar la ansiedad, mejorar tu comunicación para proyectar seguridad.
          </p>
          <button
            className="btn-principal"
            onClick={() => navigate("/avatar")}
          >
            ▶ INICIAR ENTREVISTA
          </button>
        </div>

        <div className="principal-imagen" ref={imageRef}>
          <img
            src="https://static.wixstatic.com/media/55d1d0_774dd340d53b43fab4182fd4f484fcb0~mv2.gif"
            alt="IA"
          />
        </div>
      </div>

      {/* NUEVA SECCIÓN: ¿CÓMO FUNCIONA? */}
      <div className="seccion-pasos">
        <h2 className="titulo-secundario">
          ¿Cómo funciona <span>ConfidAI</span>?
        </h2>
        <div className="contenedor-pasos">
          <div className="tarjeta-paso">
            <div className="numero-paso">01</div>
            <h3>Conéctate con la IA</h3>
            <p>Inicia el simulador y nuestro entrevistador virtual cobrará vida mediante voz y gesticulación en tiempo real.</p>
          </div>

          <div className="tarjeta-paso">
            <div className="numero-paso">02</div>
            <h3>Responde sin presión</h3>
            <p>Escucha con atención las preguntas técnicas y de comportamiento. Responde usando tu micrófono de forma natural.</p>
          </div>

          <div className="tarjeta-paso">
            <div className="numero-paso">03</div>
            <h3>Domina tus métricas</h3>
            <p>Al finalizar, recibe un análisis detallado sobre tu nivel de confianza, manejo de la ansiedad y consejos clave.</p>
          </div>
        </div>
      </div>

      {/* NUEVA SECCIÓN: SOBRE NOSOTROS / PROPÓSITO */}
      <div className="seccion-sobre">
        <div className="sobre-bloque">
          <div className="sobre-texto">
            <h2 className="titulo-secundario">
              Sobre <span>Nosotros</span>
            </h2>
            <p className="sobre-descripcion">
              En ConfidAI creemos que el talento no debería verse limitado por los nervios. Desarrollamos un entorno tecnológico avanzado con inteligencia artificial para democratizar el acceso a la preparación laboral de alto nivel.
            </p>
            <div className="grid-caracteristicas">
              <div className="item-caracteristica">
                <h4>🧠 Control de Ansiedad</h4>
                <p>Algoritmos especializados enfocados en ayudarte a regular tu ritmo y fluidez al hablar.</p>
              </div>
              <div className="item-caracteristica">
                <h4>🔒 Privacidad Total</h4>
                <p>Un espacio seguro donde puedes equivocarte, practicar y reiniciar las veces que sean necesarias.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
