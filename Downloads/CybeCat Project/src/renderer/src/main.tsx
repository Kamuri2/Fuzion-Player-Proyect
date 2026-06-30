import './assets/main.css'

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
