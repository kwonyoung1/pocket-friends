import ReactDOM from 'react-dom/client'
import { CloudGate } from './cloud/CloudGate'
import './styles.css'
import './progression/styles.css'
import './expansion/styles.css'
import { hydrateStorage } from './storage'
async function start() {
  await hydrateStorage()
  ReactDOM.createRoot(document.getElementById('root')!).render(<CloudGate />)
}
void start()
