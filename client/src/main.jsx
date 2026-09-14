import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/charts/styles.css'
// Public Sans / DM Mono are loaded once, via index.css's own @import block —
// duplicating the same font-face declarations here (Milestone 7, Spec 032,
// C-R11) shipped every font-face rule twice in the built CSS bundle.
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
