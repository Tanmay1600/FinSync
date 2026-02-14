import './App.css'
import { AppProvider } from './context/AppContext'
import { Shell } from './components/Shell'

function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

export default App
