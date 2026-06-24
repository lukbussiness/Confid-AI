import React, { useState, useEffect } from "react";
import "../Style/Encabezado.css";
import { FaUserCircle, FaBars, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");

  const cerrarSesion = () => {
    Swal.fire({
      title: "¿Cerrar sesión?",
      text: "¿Seguro que quieres salir?",
      imageUrl: "https://cdn-icons-png.flaticon.com/512/1828/1828479.png",
      imageWidth: 100,
      imageHeight: 100,
      showCancelButton: true,
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {

        localStorage.removeItem("token");

        Swal.fire({
          title: "Sesión cerrada",
          text: "Tu sesión se cerró correctamente",
          icon: "success"
        }).then(() => {
          window.location.replace("/");
        });

      }
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/";
    }
  }, []);

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

      {/* BOTON HAMBURGUESA */}
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* MENU */}
      <nav className={`nav ${menuOpen ? "open" : ""}`}>

        {/* PERFIL MOVIL */}
        <div className="mobile-user">

          <FaUserCircle className="user-icon" />

          <div className="mobile-user-info">
            <span>
              Hola, {(userName || "Usuario").charAt(0).toUpperCase() +
                (userName || "Usuario").slice(1)}
            </span>

            <Link to="/perfil" onClick={() => setMenuOpen(false)}>
              Ver perfil
            </Link>
          </div>

        </div>

        <Link to="/resultados" onClick={() => setMenuOpen(false)}>
          Mis Resultados
        </Link>

        <button
          className="logout-btn mobile-only"
          onClick={() => {
            setMenuOpen(false);
            cerrarSesion();
          }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/3168/3168147.png"
            alt="cerrar sesion"
            className="logout-icon"
          />
          Cerrar sesión
        </button>

      </nav>

      {/* PANEL DERECHO ESCRITORIO */}
      <div className="header-right">

        <Link to="/perfil" className="profile-link">
          <FaUserCircle className="user-icon" />
        </Link>

        <div className="user-info">
          <span>
            Hola, {(userName || "Usuario").charAt(0).toUpperCase() +
              (userName || "Usuario").slice(1)}
          </span>

          <Link to="/perfil" className="profile-link">
            <h5 className="ver_perfil">Ver perfil</h5>
          </Link>
        </div>

        <button className="logout-btn" onClick={cerrarSesion}>
          <img
            src="https://cdn-icons-png.flaticon.com/512/3168/3168147.png"
            alt="cerrar sesion"
            className="logout-icon"
          />
        </button>

      </div>

    </header>
  );
};

export default Header;