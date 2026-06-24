import api from "../api/axios";

export const login = async (data) => {
  const res = await api.post("/auth/login", data);

  // 🔐 Guardar token correctamente
  localStorage.setItem("token", res.data.access_token);

  return res.data;
};

export const registro = async (data) => {
  const res = await api.post("/usuarios/registro", data);
  return res.data;
};