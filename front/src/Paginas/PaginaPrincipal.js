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
      <div className="principal" ref={containerRef}>

        <div className="grid-texture" />

        <div className="principal-contenedor">
          <div className="principal-eyebrow"></div>

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
      </div>
  );
}