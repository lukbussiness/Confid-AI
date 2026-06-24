import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import '../Style/FormuRegis.css';
import ElectricBorder from '../Componentes/ElectricBorder';
import { login } from '../Services/AuthService';

const Formuini = () => {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState(""); // "success" or "error"

  const irRegistro = () => navigate('/registro');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ correo, password });
      setAlertMessage("Inicio de sesión exitoso");
      setAlertType("success");
      setTimeout(() => {
        navigate('/principal');
      }, 2000); // Navigate after 2 seconds
    } catch (error) {
      setAlertMessage("Datos incorrectos");
      setAlertType("error");
      setTimeout(() => {
        setAlertMessage("");
        setAlertType("");
      }, 3000); // Hide error after 3 seconds
    }
  };

  return (
    <div className="contenedorformu">

      <div className="grid-texture" />

      <ElectricBorder
        color="#00d4ff"
        speed={1}
        chaos={0.12}
        borderRadius={20}
        style={{ borderRadius: 20 }}
      >
        <div className="formularioregis">
          <h1 className="tituloregis">Inicio de Sesión</h1>
          <p className="tituloregis-sub">Plataforma ConfidAI</p>

          {alertMessage && (
            <div className={`custom-alert ${alertType}`}>
              {alertMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="correo">Correo</label>
              <input
                id="correo"
                type="email"
                placeholder="usuario@gmail.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="contenedorbtn">
              <button className="inicio" type="submit">
              &nbsp; Iniciar Sesión
              </button>
              <button className="inicio" type="button" onClick={irRegistro}>
                Registrarse
              </button>
            </div>
          </form>
        </div>
      </ElectricBorder>

      <img
        className="imgformu"
        src="https://static.wixstatic.com/media/55d1d0_774dd340d53b43fab4182fd4f484fcb0~mv2.gif"
        alt="Registro de Usuario"
      />
    </div>
  );
};

export default Formuini;