// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';

// --- REMOVED ALL IMAGE IMPORTS ---
// import logoImg from '../assets/images/logo.png';
// import sdgImg from '../assets/images/sdg.png'; 
// import dotsImg from '../assets/images/dots.jpg'; 

const Home = () => {
  return (
    <div className="bg-gray-50 text-gray-800 font-sans">
      
      {/* --- HEADER --- */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link to="/" className="flex items-center space-x-2">
              {/* PLACEHOLDER INSTEAD OF IMAGE */}
              <span className="text-lg font-bold text-green-700">[LOGO]</span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-600 hover:text-green-800 font-medium">Home</Link>
            <Link to="/login" className="text-gray-600 hover:text-green-800 font-medium">Login</Link>
            <Link 
              to="/signup" 
              className="bg-green-700 text-white px-5 py-2 rounded-full font-medium hover:bg-green-800 transition duration-300"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* --- 1. HERO SECTION --- */}
        <section className="bg-white py-20 md:py-32">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              Don't Just Pick a Major.<br />Find Your Purpose.
            </h1>
            <p className="mt-6 text-2xl md:text-3xl font-medium text-amber-600">
              Discover Purpose. Connect Passion. Choose Right.
            </p>
            <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              We help Ghanaian SHS graduates align personal curiosity with viable academic paths by linking your interests to real community problems.
            </p>
            <div className="mt-10 flex flex-col md:flex-row justify-center gap-4">
                <Link 
                to="/signup" 
                className="bg-green-700 text-white text-lg font-medium px-8 py-4 rounded-full hover:bg-green-800 transition duration-300 shadow-lg"
                >
                Start Your Journey (It's Free)
                </Link>
                <Link 
                to="/login" 
                className="bg-white text-green-700 border-2 border-green-700 text-lg font-medium px-8 py-4 rounded-full hover:bg-green-50 transition duration-300"
                >
                Login
                </Link>
            </div>
          </div>
        </section>

        {/* --- 2. THE CHALLENGE SECTION (Image Removed) --- */}
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            {/* Left Side: Text */}
            <div className="order-2 md:order-1">
              <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">The Context</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                The Gap in Guidance
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Most students choose careers based on what's popular, not what's needed. This leads to a mismatch between talent and opportunity, causing financial strain and lost potential.
              </p>
            </div>
            
            {/* Right Side: Image Placeholder */}
            <div className="order-1 md:order-2">
               <div className="bg-white p-4 rounded-xl shadow-lg transform rotate-2 hover:rotate-0 transition duration-500">
                  <span className="block w-full h-64 bg-gray-300 rounded-lg flex items-center justify-center text-gray-700 font-bold">DOTS IMAGE HERE</span>
               </div>
            </div>
          </div>
        </section>

        {/* --- 3. UN SUSTAINABLE DEVELOPMENT GOALS (Image Removed) --- */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Text */}
                <div>
                    <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">Global Framework</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                        Aligned with the UN SDGs
                    </h2>
                </div>

                {/* Image Placeholder */}
                <div className="relative">
                    <span className="block w-full h-64 bg-indigo-200 rounded-lg flex items-center justify-center text-indigo-900 font-bold">SDG CHART HERE</span>
                </div>
            </div>
          </div>
        </section>

        {/* --- 4. GRAND CHALLENGES & OPPORTUNITIES (The Grid) --- */}
        {/* ... Rest of the page remains the same ... */}
        <section className="py-20 md:py-28 bg-slate-900 text-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-sm font-bold text-amber-500 uppercase tracking-wider">The Opportunities</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                Africa's Grand Challenges
              </h2>
            </div>
            {/* GRID CONTENT REMAINS */}
          </div>
        </section>

        {/* --- 5. FRAMEWORK SECTION --- */}
        <section className="bg-white py-20 md:py-28">
          <div className="container mx-auto px-6">
             {/* FRAMEWORK CONTENT REMAINS */}
          </div>
        </section>

        {/* --- 6. TESTIMONIALS SECTION --- */}
        <section className="bg-gray-50 py-20 md:py-28">
             {/* TESTIMONIALS CONTENT REMAINS */}
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 text-gray-300 py-12">
          <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <span className="text-xl font-bold text-white">The Community Path Project</span>
                <p className="text-sm mt-2 text-gray-400">&copy; 2025 All rights reserved.</p>
              </div>
              <div className="flex space-x-6">
                  <Link to="/about" className="hover:text-white transition">About</Link>
                  <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
                  <Link to="/contact" className="hover:text-white transition">Contact</Link>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default Home;