import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/images/logo.png';

const UserHub = () => {
  // Read username and capitalize it for a nice greeting
  const username = localStorage.getItem('username') || "Friend";
  const displayUsername = username.charAt(0).toUpperCase() + username.slice(1);
  
  // Hero Banner Image (Placeholder for visual appeal)
  const heroImageUrl = "https://images.unsplash.com/photo-1549923746-c56a642e1281?q=80&w=2370&auto=format&fit=crop";

  // CORRECT EMBED URL FOR FACEBOOK VIDEO
  // NOTE: Autoplay requires mute=1 (autoplay=1&mute=1) for modern browsers.
  const facebookVideoId = "743265737525287"; 
  const embedUrl = `https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D${facebookVideoId}&show_text=false&autoplay=1&mute=1&loop=true`;

  // Define content pieces outside of the return for cleaner UI logic
  const content = {
      whyExists: "Many students begin tertiary education without understanding the real challenges in their communities or how their chosen programmes connect to solving them. This hub helps you bridge that gap by guiding you to explore problems around you, discover relevant academic pathways, and make purpose-driven career decisions.",
      vision: "To empower Ghanaian students to make confident, purpose-driven choices by connecting their interests with the real problems affecting their communities.",
      mission: "To provide a clear, guided pathway that helps students identify community challenges and align them with the right university programmes and career opportunities.",
      solutionList: [
          "Identify community problems you care about.",
          "Match them with suitable academic programmes.",
          "Access insights for long-term career direction."
      ]
  };

  const InfoCard = ({ title, content, color }) => (
      <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition hover:shadow-md h-full`}>
          <p className={`text-xs font-bold ${color} uppercase tracking-wider mb-2`}>{title}</p>
          <p className="text-sm text-slate-700">{content}</p>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* --- NAVBAR --- */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
             <img src={logoImg} alt="Logo" className="h-10 w-auto" />
             <span className="font-bold text-lg tracking-tight text-slate-700 hidden md:block">Hub</span>
          </div>

          <div className="flex items-center space-x-8">
            <span className="text-sm text-slate-500 hidden md:block">
              Logged in as <span className="font-bold text-slate-900">{displayUsername}</span>
            </span>
            
            {/* PATH FINDER BUTTON (Consistent Green) */}
            <Link 
              to="/welcome" 
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition flex items-center gap-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              PATH FINDER
            </Link>
          </div>
        </nav>
      </header>

      {/* --- HERO BANNER (Top Section) --- */}
      <div 
        className="relative w-full h-48 md:h-64 bg-cover bg-center overflow-hidden flex items-center p-8 md:p-16"
        style={{ backgroundImage: `url(${heroImageUrl})` }}
      >
        <div className="absolute inset-0 bg-indigo-900/80 backdrop-blur-sm"></div>
        
        <div className="relative z-10 text-white">
          <p className="text-sm font-semibold text-amber-300 uppercase tracking-widest mb-2">
            Welcome to the Community Path Hub
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-2 leading-tight">
            Your Purpose Journey Starts Here
          </h1>
          <p className="text-indigo-200 text-lg">
            Track your progress, achieve your goals.
          </p>
        </div>
      </div>

      {/* --- MAIN DASHBOARD CONTENT --- */}
      <main className="container mx-auto px-6 -mt-16 md:-mt-12 relative z-20">
        
        {/* Personalized Greeting */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 w-fit">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
                Hello, {displayUsername}!
            </h2>
            <p className="text-slate-500">We’re so glad you’re here!</p>
        </div>

        {/* --- 1. VIDEO & WHY WE EXIST (ALX Front Page Style) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-12">
            
            {/* Left Column (Text - Why Hub Exists) */}
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Why This Hub Exists</h3>
                <p className="text-slate-600 leading-relaxed">
                    {content.whyExists}
                </p>
                <div className="mt-6">
                    <Link 
                      to="/welcome" 
                      className="inline-block bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition w-full text-sm"
                    >
                      Start Assessment &rarr;
                    </Link>
                </div>
            </div>

            {/* Right Column (Video) */}
            <div className="lg:col-span-3 h-96 relative rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                <iframe 
                    src={embedUrl}
                    width="100%" 
                    height="100%" 
                    style={{ border: 'none' }}
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" 
                    allowFullScreen={true}
                    title="Welcome Video"
                ></iframe>
            </div>
        </div>

        {/* --- 2. VISION, MISSION, SOLUTION CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            
            <InfoCard 
                title="Our Vision" 
                content={content.vision} 
                color="text-amber-600" 
            />
            
            <InfoCard 
                title="Our Mission" 
                content={content.mission} 
                color="text-indigo-600" 
            />

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">The Solution</p>
                <h3 className="text-xl font-bold text-slate-900 mb-3">What This Platform Does</h3>
                <ul className="space-y-2">
                    {content.solutionList.map((item, index) => (
                        <li key={index} className="flex items-start text-sm text-slate-700">
                            <svg className="w-4 h-4 text-emerald-500 mt-1 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-12 bg-white rounded-2xl shadow-inner border border-gray-100">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Ready to find your match?</h3>
            <Link 
              to="/welcome" 
              className="inline-block bg-emerald-700 text-white px-10 py-4 rounded-full font-bold hover:bg-emerald-800 transition shadow-xl text-lg"
            >
              Start My Purpose Journey
            </Link>
        </div>

      </main>
    </div>
  );
};

export default UserHub;