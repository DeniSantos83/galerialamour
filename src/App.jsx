import { BrowserRouter, Routes, Route } from "react-router-dom"

import Home from "./pages/Home"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import EventUploadPage from "./pages/EventUploadPage"
import EventGalleryPage from "./pages/EventGalleryPage"
import EventSettings from "./pages/EventSettings"
import PublicGalleryPage from "./pages/PublicGalleryPage"
import MeusEventos from "./pages/MeusEventos"
import MeuEventoDetalhe from "./pages/MeuEventoDetalhe"
import NotFound from "./pages/NotFound"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/painel" element={<Dashboard />} />

        <Route path="/evento/:slug/upload" element={<EventUploadPage />} />
        <Route path="/evento/:slug/galeria" element={<EventGalleryPage />} />
        <Route path="/evento/:slug/configuracoes" element={<EventSettings />} />

        <Route path="/galeria/:slug" element={<PublicGalleryPage />} />

        <Route path="/meus-eventos" element={<MeusEventos />} />
        <Route path="/meus-eventos/:slug" element={<MeuEventoDetalhe />} />

        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  )
}