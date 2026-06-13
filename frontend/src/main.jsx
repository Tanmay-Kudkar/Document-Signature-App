import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { pdfjs } from 'react-pdf'
import './index.css'
import App from './App.jsx'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
