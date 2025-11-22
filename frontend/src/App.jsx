import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Welcome from './pages/Welcome'
// Import new page
import UserHub from './pages/UserHub' 

import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* The New Hub Page */}
        <Route path="/dashboard" element={<UserHub />} />
        
        {/* The AI Welcome Page (Path Finder) */}
        <Route path="/welcome" element={<Welcome />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App