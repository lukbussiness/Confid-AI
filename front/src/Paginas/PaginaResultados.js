import React, { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import "../Style/Resultados.css";
import EncabezadoResultados from "../Componentes/EncabezadoResultados";

function AnimatedNumber({ target, suffix = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1800;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{count}{suffix}</>;
}

function GlowCard({ children, delay = 0, accentGreen = false }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div
      className={`glow-card${accentGreen ? " glow-card--green" : ""}${visible ? " glow-card--visible" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="glow-card__top-line" />
      {children}
    </div>
  );
}

export default function PaginaPerfil() {
  const [mounted, setMounted] = useState(false);
  const resultsRef = useRef(null);
  
  const [radarData, setRadarData] = useState([]);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [globalFeedback, setGlobalFeedback] = useState("Generando reporte...");
  const [globalScore, setGlobalScore] = useState(0);

  const handleDownloadPdf = async () => {
    const element = resultsRef.current;
    if (!element) return;

    const loadImageDataUrl = async (src) => {
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error("No se pudo cargar el logo");
      }
      const blob = await response.blob();
      const img = await new Promise((resolve, reject) => {
        const imgElement = new Image();
        imgElement.crossOrigin = "Anonymous";
        imgElement.onload = () => resolve(imgElement);
        imgElement.onerror = reject;
        imgElement.src = URL.createObjectURL(blob);
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/png");
    };

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight();
    let cursorY = margin;

    const brandBlue = [80, 170, 255];
    const brandCyan = [0, 212, 255];
    const brandGreen = [0, 255, 136];
    const darkText = [255, 255, 255];
    const lightText = [194, 210, 255];
    const sectionBg = [2, 17, 37];
    const borderCyan = [0, 212, 255];

    let logoDataUrl;
    try {
      logoDataUrl = await loadImageDataUrl("/src/Imagen/logoo.jpg");
    } catch (error) {
      logoDataUrl = null;
    }

    pdf.setFillColor(1, 12, 30);
    pdf.rect(0, 0, pageWidth, 100, "F");

    if (logoDataUrl) {
      pdf.addImage(logoDataUrl, "PNG", margin, 26, 50, 50);
    }

    const textOffsetX = margin + (logoDataUrl ? 64 : 0);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Resultados de tu Entrevista", textOffsetX, 50);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Confid", textOffsetX, 70);
    const confidWidth = pdf.getTextWidth("Confid");
    pdf.setTextColor(...brandCyan);
    pdf.text("AI", textOffsetX + confidWidth, 70);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...lightText);
    pdf.text(
      " · Informe de entrevista",
      textOffsetX + confidWidth + pdf.getTextWidth("AI"),
      70
    );

    cursorY = 128;

    pdf.setFillColor(...sectionBg);
    pdf.roundedRect(margin, cursorY, contentWidth, 140, 18, 18, "F");
    pdf.setDrawColor(...borderCyan);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(margin, cursorY, contentWidth, 140, 18, 18, "S");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...borderCyan);
    pdf.text("Inteligencia Emocional", margin + 18, cursorY + 30);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(34);
    pdf.setTextColor(...brandBlue);
    pdf.text(`${globalScore}%`, margin + 18, cursorY + 75);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...lightText);
    const feedbackLines = pdf.splitTextToSize(globalFeedback, contentWidth - 52);
    pdf.text(feedbackLines, margin + 18, cursorY + 96);

    cursorY += 164;

    const chartElement = element.querySelector(".chart-wrapper");
    if (chartElement) {
      const chartCanvas = await html2canvas(chartElement, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "transparent",
        logging: false,
      });
      const chartData = chartCanvas.toDataURL("image/png");
      const imgProps = pdf.getImageProperties(chartData);
      const imgWidth = Math.min(contentWidth - 32, imgProps.width * 0.6);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      if (cursorY + imgHeight + 40 > pageHeight - margin) {
        pdf.addPage();
        cursorY = margin;
      }

      pdf.setFillColor(...sectionBg);
      pdf.roundedRect(margin, cursorY, contentWidth, imgHeight + 28, 14, 14, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...borderCyan);
      pdf.text("Habilidades Blandas", margin + 18, cursorY + 18);
      pdf.addImage(chartData, "PNG", margin + 16, cursorY + 26, imgWidth, imgHeight);
      cursorY += imgHeight + 40;
    }

    if (cursorY + 20 > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }

    const feedbackStartY = cursorY;
    let feedbackCalculatedHeight = 34;

    feedbackItems.forEach((item) => {
      const line = `${item.label} · ${item.score}%`;
      const lineLines = pdf.splitTextToSize(line, contentWidth - 36);
      feedbackCalculatedHeight += lineLines.length * 14 + 4;

      const valueLines = pdf.splitTextToSize(item.value, contentWidth - 36);
      feedbackCalculatedHeight += valueLines.length * 14 + 16;
    });

    feedbackCalculatedHeight += 16;

    if (feedbackStartY + feedbackCalculatedHeight > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }

    pdf.setFillColor(...sectionBg);
    pdf.roundedRect(margin, cursorY, contentWidth, feedbackCalculatedHeight, 14, 14, "F");
    pdf.setDrawColor(...borderCyan);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(margin, cursorY, contentWidth, feedbackCalculatedHeight, 14, 14, "S");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...borderCyan);
    pdf.text("Feedback por Pregunta", margin + 18, cursorY + 22);
    cursorY += 38;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    feedbackItems.forEach((item) => {
      const line = `${item.label} · ${item.score}%`;
      const lineLines = pdf.splitTextToSize(line, contentWidth - 36);
      pdf.setTextColor(...borderCyan);
      pdf.text(lineLines, margin + 18, cursorY);
      cursorY += lineLines.length * 14 + 4;

      const valueLines = pdf.splitTextToSize(item.value, contentWidth - 36);
      pdf.setTextColor(...borderCyan);
      pdf.text(valueLines, margin + 18, cursorY);
      cursorY += valueLines.length * 14 + 16;
    });

    cursorY += 30;

    if (cursorY + 30 > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }

    const actionStartY = cursorY;
    let actionCalculatedHeight = 34;

    actionItems.forEach((item) => {
      const itemLines = pdf.splitTextToSize(`• ${item.text}`, contentWidth - 36);
      actionCalculatedHeight += itemLines.length * 14 + 10;
    });

    actionCalculatedHeight += 16;

    if (actionStartY + actionCalculatedHeight > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }

    pdf.setFillColor(...sectionBg);
    pdf.roundedRect(margin, cursorY, contentWidth, actionCalculatedHeight, 14, 14, "F");
    pdf.setDrawColor(...borderCyan);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(margin, cursorY, contentWidth, actionCalculatedHeight, 14, 14, "S");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...borderCyan);
    pdf.text("Plan de Acción (IA)", margin + 18, cursorY + 22);
    cursorY += 38;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    actionItems.forEach((item) => {
      const itemLines = pdf.splitTextToSize(`• ${item.text}`, contentWidth - 36);
      pdf.setTextColor(...borderCyan);
      pdf.text(itemLines, margin + 18, cursorY);
      cursorY += itemLines.length * 14 + 10;
    });

    pdf.save("reporte_confidai.pdf");
  };

  useEffect(() => { 
    setMounted(true); 
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
    }

    try {
        const reporteStr = localStorage.getItem("reporte_entrevista");
        if (reporteStr) {
            const reporte = JSON.parse(reporteStr);
            setRadarData(reporte.radarData || []);
            setFeedbackItems(reporte.feedbackItems || []);
            setActionItems(reporte.actionItems || []);
            setGlobalFeedback(reporte.globalFeedback || "Buen desempeño en general.");

            // Calcular puntuación global: 0 si no hay respuestas válidas,
            // y promedia los valores de radar cuando hay preguntas respondidas.
            if (reporte.radarData && reporte.radarData.length > 0) {
                const total = reporte.radarData.reduce((acc, curr) => acc + Math.max(0, Number(curr.value) || 0), 0);
                const allZero = reporte.radarData.every((item) => Number(item.value) === 0);
                setGlobalScore(allZero ? 0 : Math.round(total / reporte.radarData.length));
            }
        }
    } catch(e) {
        console.error("Error parseando reporte_entrevista", e);
    }
  }, []);

  return (
<div className="pagina-perfil">
      <EncabezadoResultados />

      <div className="orb orb--blue" />
      <div className="orb orb--cyan" />
      <div className="orb orb--green" />
      <div className="grid-texture" />

      <div className={`perfil-inner${mounted ? " perfil-inner--visible" : ""}`} ref={resultsRef}>

        <div className="perfil-header">
          <div>
            <h1 className="perfil-title">
              Resultados de tu<br />Entrevista
            </h1>
          </div>
          <div className="perfil-header-right">
            <button className="btn-download" data-html2canvas-ignore="true" onClick={handleDownloadPdf}>↓ &nbsp; Descargar Reporte PDF</button>
          </div>
        </div>

        <div className="results-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>

          <GlowCard delay={100}>
            <div className="section-label">PUNTUACIÓN GLOBAL</div>
            <div className="card-title">Inteligencia Emocional</div>
            <div className="score-ring">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <defs>  
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0057ff" />
                    <stop offset="100%" stopColor="#00d4ff" />
                  </linearGradient>
                </defs>
                <circle className="ring-bg" cx="70" cy="70" r="60" />
                <circle className="ring-fill" cx="70" cy="70" r="60" />
              </svg>
              <div className="score-center">
                <div className="score-number">
                  <AnimatedNumber target={globalScore} suffix="%" />
                </div>
                <div className="score-label">Puntuación</div>
              </div>
            </div>
            <div className="info-box">
              <p>{globalFeedback}</p>
            </div>
            <div className="tag-row">
              <span className="tag tag--green">Entrevista Completada</span>
            </div>
          </GlowCard>

          <GlowCard delay={200}>
            <div className="section-label">EVALUACIÓN MULTIDIMENSIONAL</div>
            <div className="card-title">Habilidades Blandas</div>
            {radarData.length > 0 ? (
                <div className="chart-wrapper" style={{ width: '100%', height: 180, minWidth: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis
                      dataKey="skill"
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "DM Sans" }}
                    />
                    <defs>
                      <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0057ff" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <Radar
                      dataKey="value"
                      stroke="#00d4ff"
                      strokeWidth={2}
                      fill="url(#radarGrad)"
                      fillOpacity={0.5}
                      dot={{ r: 4, fill: "#00d4ff", stroke: "#020b18", strokeWidth: 2 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                </div>
            ) : (
                <div style={{color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "2rem"}}>
                    Generando gráfico...
                </div>
            )}
            
            <div className="radar-scores">
              {radarData.map((d) => (
                <div key={d.skill} className="radar-score-item">
                  <div className="radar-score-number">{d.value}</div>
                  <div className="radar-score-label">{d.skill.split(" ")[0].toUpperCase()}</div>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <div className="bottom-grid">

          <GlowCard delay={400}>
            <div className="section-label">EVALUACIÓN CUALITATIVA</div>
            <div className="card-title">Feedback por Pregunta</div>
            {feedbackItems.length > 0 ? feedbackItems.map((item, i) => (
              <div key={i} className="feedback-item">
                <div className="feedback-header">
                  <div className="feedback-label">{item.label}</div>
                  <div
                    className="feedback-score"
                    style={{
                      color: item.score >= 90 ? "#00ff88" : item.score >= 70 ? "#00d4ff" : "#ffb800",
                    }}
                  >
                    {item.score}<span className="feedback-score-pct">%</span>
                  </div>
                </div>
                <div className="feedback-bar-track">
                  <div
                    className="feedback-bar-fill"
                    style={{
                      width: `${item.score}%`,
                      background:
                        item.score >= 90
                          ? "linear-gradient(90deg,#00b090,#00ff88)"
                          : item.score >= 70
                          ? "linear-gradient(90deg,#0057ff,#00d4ff)"
                          : "linear-gradient(90deg,#ff8c00,#ffb800)",
                      transitionDelay: `${0.8 + i * 0.2}s`,
                    }}
                  />
                </div>
                <p className="feedback-text">{item.value}</p>
              </div>
            )) : (
               <div style={{color: "rgba(255,255,255,0.5)", padding: "1rem"}}>Cargando feedback...</div>
            )}
          </GlowCard>

          <GlowCard delay={500} accentGreen>
            <div className="section-label">HOJA DE RUTA</div>
            <div className="card-title">Plan de Acción (IA)</div>
            {actionItems.length > 0 ? actionItems.map((item, i) => (
              <div key={i} className="action-item">
                <div className="action-icon">{item.icon}</div>
                <p className="action-text">{item.text}</p>
              </div>
            )) : (
              <div style={{color: "rgba(255,255,255,0.5)", padding: "1rem"}}>Diseñando plan...</div>
            )}
          </GlowCard>
        </div>
      </div>
    </div>
  );
}