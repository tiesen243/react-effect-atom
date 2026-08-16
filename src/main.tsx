import '@/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/app.tsx'
import { ToastProvider } from '@/components/ui/toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
)
