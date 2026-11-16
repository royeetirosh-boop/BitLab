import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BooleanPage } from './pages/BooleanPage'
import { CircuitLabPage } from './pages/CircuitLabPage'
import { ConvertPage } from './pages/ConvertPage'
import { FlipFlopPage } from './pages/FlipFlopPage'
import { AboutPage } from './pages/AboutPage'
import { HomePage } from './pages/HomePage'
import { KarnaughPage } from './pages/KarnaughPage'
import { LessonPage } from './pages/LessonPage'
import { LogicLabPage } from './pages/LogicLabPage'
import { McCluskeyPage } from './pages/McCluskeyPage'
import { ToolkitPage } from './pages/ToolkitPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="convert" element={<ConvertPage />} />
          <Route path="lesson" element={<LessonPage />} />
          <Route path="kmap" element={<KarnaughPage />} />
          <Route path="mccluskey" element={<McCluskeyPage />} />
          <Route path="boolean" element={<BooleanPage />} />
          <Route path="logic" element={<LogicLabPage />} />
          <Route path="seq" element={<FlipFlopPage />} />
          <Route path="circuits" element={<CircuitLabPage />} />
          <Route path="tools" element={<ToolkitPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="bcd" element={<Navigate to="/lesson" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
