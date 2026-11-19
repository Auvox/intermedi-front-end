import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/estilosGlobais.js'
import App from './App.jsx'
import { instalarRastreadorDeRequisicoes } from './services/carregamento.js'

// antes do primeiro render: as requisições das telas mostram o carregamento
instalarRastreadorDeRequisicoes()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
