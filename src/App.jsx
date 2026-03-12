import { BrowserRouter, Route, Routes } from "react-router-dom"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import EventUploadPage from "./pages/EventUploadPage"
import EventGalleryPage from "./pages/EventGalleryPage"
import EventSettings from "./pages/EventSettings"
import NotFound from "./pages/NotFound"
import PublicGalleryPage from "./pages/PublicGalleryPage"

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
        <Route path="*" element={<NotFound />} />
        <Route path="/galeria/:slug" element={<PublicGalleryPage />} />
      </Routes>
    </BrowserRouter>
  )
}