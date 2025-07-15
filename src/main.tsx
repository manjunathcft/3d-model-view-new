// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './upload';
import Viewer from './Viewer';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/:slug" element={<Viewer />} />
        <Route path="/" element={<App />} />
      </Routes>
    </Router>
  </StrictMode>
);
