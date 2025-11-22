import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWelcomeMessage } from '../services/api';
import logoImg from '../assets/images/logo.png';

const Welcome = () => {
  const navigate = useNavigate();

  // --- STATE ---
  // 1. Read the real username saved during Login (default to "Friend" if missing)
  const storedName = localStorage.getItem('username') || "Friend";
  
  // 2. Determine if first time (For now we assume true to show the AI message)
  // In a real app, you might check a 'hasStarted' flag in localStorage
  const [isFirstTime, setIsFirstTime] = useState(true); 
  const [username, setUsername] = useState(storedName); 
  
  const [motivation, setMotivation] = useState("");
  const [loading, setLoading] = useState(true);

  // --- EFFECTS ---
  useEffect(() => {
    if (isFirstTime) {
      const fetchMessage = async () => {
        setLoading(true);
        // Call our Django API with the REAL username
        const msg = await getWelcomeMessage(username);
        setMotivation(msg);
        setLoading(false);
      };
      
      // Slight delay to make the "Thinking" animation feel real/premium
      setTimeout(() => {
        fetchMessage();
      }, 800);
    } else {
      setLoading(false);
    }
  }, [isFirstTime, username]);

  // --- HANDLERS ---
  const handleStart = () => {
    navigate('/onboarding/step-1'); // We will build this next!
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      
      <div className="card bg-white w-full max-w-md p-8 rounded-xl shadow-lg border border-gray-200 text-center">
        
        {/* Logo */}
        <img 
          src={logoImg} 
          alt="Community Path Logo" 
          className="h-16 w-auto mx-auto mb-6"
        />

        {isFirstTime ? (
          <div className="animate-fade-in">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Begin Your Path
            </span>
            
            {/* THE AI MESSAGE AREA */}
            <div className="my-8 min-h-[100px] flex items-center justify-center">
              {loading ? (
                // Skeleton "Thinking" Animation
                <div className="w-full max-w-xs space-y-3 opacity-50">
                  <div className="h-4 bg-gray-300 rounded animate-pulse w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-300 rounded animate-pulse w-1/2 mx-auto"></div>
                </div>
              ) : (
                // The Actual Message
                <h1 className="text-2xl font-bold text-gray-900 leading-snug">
                  "{motivation}"
                </h1>
              )}
            </div>

            <p className="text-gray-500 mb-8 text-sm">
              We are about to discover the perfect academic path for you. It takes about 5 minutes.
            </p>

            <button 
              onClick={handleStart}
              className="w-full bg-green-700 text-white font-bold py-3 rounded-lg hover:bg-green-800 transition shadow-md"
            >
              Start Journey
            </button>
          </div>
        ) : (
          // Returning User View
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {username}!</h1>
            <p className="text-gray-500 mb-6">Ready to continue where you left off?</p>
            <button className="w-full bg-green-700 text-white font-bold py-3 rounded-lg mb-3">
              Continue Session
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Welcome;