import api from "../api/axios";

export const getPerfil = async () => {
  const res = await api.get("/usuarios/perfil");
  return res.data;
};
