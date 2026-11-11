import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import UploadImage from "./pages/UploadImage";
import GalleryPage from "./pages/GalleryPage";
import "./pages/pages.css";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/share" element={<UploadImage />} />
        <Route path="/view" element={<GalleryPage />} />
        <Route path="*" element={<p className="status-text">Page not found.</p>} />
      </Routes>
    </BrowserRouter>
  );
}