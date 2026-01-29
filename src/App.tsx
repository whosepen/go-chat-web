import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthPage } from "./pages/AuthPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/chat" element={<div className="p-8 text-center">聊天页面开发中...</div>} />
        <Route path="/" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
