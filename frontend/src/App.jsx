import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Welcome from './pages/Welcome'
import UserHub from './pages/UserHub' 
// REMOVED: import OnboardingStep1 from './pages/OnboardingStep1'
// REMOVED: import OnboardingStep2 from './pages/OnboardingStep2'

import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<UserHub />} />
        <Route path="/welcome" element={<Welcome />} />
        
        {/* REMOVED: /onboarding/step-1 and step-2 routes */}
      </Routes>
    </BrowserRouter>
  )
}

export default App