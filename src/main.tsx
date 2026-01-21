import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { enableMapSet } from 'immer'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import Home from './pages/Home.tsx'
import App from './pages/App.tsx'

// Enable Immer MapSet plugin for Zustand stores using Map/Set
enableMapSet()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/app" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)