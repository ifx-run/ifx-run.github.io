import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ExplorerWorkspace } from './components/ExplorerWorkspace'
import { DocsArticlePage, DocsIndexPage } from './pages/DocsPage'
import { AppProvider } from './context/AppContext'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<ExplorerWorkspace />} />
            <Route path="docs" element={<DocsIndexPage />} />
            <Route path="docs/:slug" element={<DocsArticlePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
