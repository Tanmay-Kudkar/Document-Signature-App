import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { pdfjs } from 'react-pdf'
import './index.css'
import App from './App.jsx'

// Set up PDF worker BEFORE any Document components render
// Use local file from /public to avoid CORS and external dependency issues
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
