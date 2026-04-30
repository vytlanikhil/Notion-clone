import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'

function App() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <Editor />
    </div>
  )
}

export default App
