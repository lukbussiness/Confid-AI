import { BrowserRouter, Route, Routes } from "react-router-dom"
import Formuini from "./Paginas/Formuini"
import Formuregi from "./Paginas/FormuRegis"
import PaginaPrincipal from "./Paginas/PaginaPrincipal"
import Paginaresultados from "./Paginas/PaginaResultados"
import PaginaPerfil from "./Paginas/EditarPerfil"
import Avatar from "./Paginas/Avatar"


const App = () => (
    <BrowserRouter>
        <Routes>
            <Route exact path="/" element={<Formuini />} />
            <Route exact path="/registro" element={<Formuregi />} />
            <Route exact path="/principal" element={<PaginaPrincipal />} />
            <Route exact path="/resultados" element={<Paginaresultados />} />
            <Route exact path="/perfil" element={<PaginaPerfil />} />
            <Route exact path="/avatar" element={<Avatar />} />
        </Routes>
    </BrowserRouter>
)
export default App