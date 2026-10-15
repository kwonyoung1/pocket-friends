import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './progression/styles.css'
import { hydrateStorage } from './storage'
async function start() {
  await hydrateStorage()
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
}
void start()
