import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatApp from './pages/ChatApp'
import AdminApp from './pages/AdminApp'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
