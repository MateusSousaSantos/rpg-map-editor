import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { enableMapSet } from 'immer'
import './index.css'
import App from './App.tsx'

// Enable Immer MapSet plugin for Zustand stores using Map/Set
enableMapSet()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
