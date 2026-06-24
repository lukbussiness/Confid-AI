import React, { useState, useEffect } from "react";
import "../Style/Encabezado.css";
import { FaUserCircle, FaBars, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("https://backend-confidai.onrender.com/usuarios/perfil", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setUserName(data.nombre);
      })
      .catch(err => console.error("Error obteniendo usuario:", err));
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <img
            className="logito"
            src="https://assets-v2.lottiefiles.com/a/97fc9faa-117f-11ee-a3b3-5fb6ab9865dc/vR6mwrGRsr.gif"
            alt="logo"
          />
        </div>
        <h1 className="logo-text">
          Confid<span className="highlight">AI</span>
        </h1>
      </div>

      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Abrir menú"
      >
        {menuOpen ? <FaTimes /> : <FaBars />}
      </button>

      <nav className={`nav ${menuOpen ? "open" : ""}`}>
  <Link to="/principal" onClick={() => setMenuOpen(false)}>
    Inicio
  </Link>
</nav>

      <div className="header-right">
        <Link to="/perfil" className="profile-link">
          <FaUserCircle className="user-icon" />
        </Link>

        <div className="user-info">
          <span>
            Hola, {(userName || "Usuario").charAt(0).toUpperCase() + (userName || "Usuario").slice(1)}
          </span>
          <Link to="/perfil" className="profile-link">
            <h5 className="ver_perfil">Ver perfil</h5>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;