import { useState } from 'react';
import '../Style/FormuRegis.css';
import { useNavigate } from 'react-router-dom';
import ElectricBorder from '../Componentes/ElectricBorder';
import { registro } from '../Services/AuthService';

const FormuRegis = () => {

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState(""); // "success" or "error"

  const navigate = useNavigate();

  const irInicio = () => {
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await registro({
        nombre,
        apellido,
        correo,
        telefono,
        password
      });

      setAlertMessage("Registro exitoso");
      setAlertType("success");
      setTimeout(() => {
        navigate("/");
      }, 2000); // Navigate after 2 seconds

    } catch (error) {
      setAlertMessage("Error al registrar");
      setAlertType("error");
      setTimeout(() => {
        setAlertMessage("");
        setAlertType("");
      }, 3000); // Hide error after 3 seconds
      console.log(error);
    }
  };

  return (
    <div className='contenedorformu'>

      <ElectricBorder
        color="#7dffe3"
        speed={1}
        chaos={0.12}
        thickness={2}
        style={{ borderRadius: 16 }}
      >
        <div className='formularioregis'>
          <h1 className='tituloregis'>Formulario de Registro</h1>

          {alertMessage && (
            <div className={`custom-alert ${alertType}`}>
              {alertMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div>
              <label className="nombre">Nombre:</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="apellido">Apellido:</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="email">Correo electrónico:</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="telefono">Telefono:</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="password">Contraseña:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className='contenedorbtn'>
              <button className='inicio' type="submit">Registrarse</button>
              <button className='inicio' type="button" onClick={irInicio}>
                Iniciar sesión
              </button>
            </div>

          </form>
        </div>
      </ElectricBorder>

      <img
        className='imgformu'
        src="https://static.wixstatic.com/media/55d1d0_774dd340d53b43fab4182fd4f484fcb0~mv2.gif"
        alt="Registro de Usuario"
      />

    </div>
  );
};

export default FormuRegis;
