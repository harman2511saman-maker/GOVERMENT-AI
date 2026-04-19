import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatApp from './pages/ChatApp'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
