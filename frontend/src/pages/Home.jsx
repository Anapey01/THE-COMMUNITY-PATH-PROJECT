// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="bg-gray-50 text-gray-800 font-sans">
      
      {/* --- HEADER --- */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/assets/images/logo.png" 
                alt="Community Path Project Logo" 
                className="h-12 w-auto" 
              />
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

        {/* --- 2. THE CHALLENGE SECTION --- */}
        <section className="py-20 md:py-28 bg-gray-50">
          <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">The Context</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                The Gap in Guidance
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Most students choose careers based on what's popular, not what's needed. This leads to a mismatch between talent and opportunity, causing financial strain and lost potential.
              </p>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                We bridge this gap by introducing you to the <strong>Grand Challenges</strong> and <strong>Global Opportunities</strong> defining the future of Africa.
              </p>
            </div>
            
            <div className="order-1 md:order-2">
               <div className="bg-white p-4 rounded-xl shadow-lg transform rotate-2 hover:rotate-0 transition duration-500">
                  <img 
                    src="/assets/images/dots.jpg" 
                    alt="Student connecting career dots" 
                    className="rounded-lg w-full" 
                  />
               </div>
            </div>
          </div>
        </section>

        {/* --- 3. UN SUSTAINABLE DEVELOPMENT GOALS (SDGs) --- */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">Global Framework</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                        Aligned with the UN SDGs
                    </h2>
                    <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                        The Sustainable Development Goals (SDGs) are the blueprint to achieve a better and more sustainable future for all. 
                    </p>
                    <div className="mt-8 flex gap-4">
                         <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
                            <p className="font-bold text-green-900">Goal 4: Quality Education</p>
                         </div>
                         <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
                            <p className="font-bold text-green-900">Goal 8: Decent Work</p>
                         </div>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 bg-green-600 rounded-2xl transform rotate-3 opacity-10"></div>
                    <img 
                        src="/assets/images/sdg.png" 
                        alt="UN Sustainable Development Goals" 
                        className="relative rounded-2xl shadow-2xl w-full transform hover:-translate-y-2 transition duration-500"
                    />
                </div>
            </div>
          </div>
        </section>

        {/* --- 4. GRAND CHALLENGES & OPPORTUNITIES (The Grid - RESTORED) --- */}
        <section className="py-20 md:py-28 bg-slate-900 text-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-sm font-bold text-amber-500 uppercase tracking-wider">The Opportunities</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
                Africa's Grand Challenges
              </h2>
              <p className="mt-4 text-lg text-slate-300 max-w-3xl mx-auto">
                Don't just look for a job. Look for a challenge to solve. These are the 7 key sectors where your talent is needed most.
              </p>
            </div>

            {/* FULL GRID CONTENT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Urbanization */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-indigo-500 transition duration-300 group">
                <div className="w-12 h-12 bg-indigo-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Urbanization</h3>
                <p className="text-slate-400 text-sm">Sustainable cities & housing.</p>
              </div>

              {/* Education */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-amber-500 transition duration-300 group">
                <div className="w-12 h-12 bg-amber-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-600 transition">
                   <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Education</h3>
                <p className="text-slate-400 text-sm">Next-gen learning systems.</p>
              </div>

              {/* Healthcare */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-rose-500 transition duration-300 group">
                <div className="w-12 h-12 bg-rose-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-rose-600 transition">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Healthcare</h3>
                <p className="text-slate-400 text-sm">Public health & access.</p>
              </div>

              {/* Infrastructure */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-blue-500 transition duration-300 group">
                <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                   <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Infrastructure</h3>
                <p className="text-slate-400 text-sm">Energy, transport & logistics.</p>
              </div>

               {/* Climate */}
               <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-green-500 transition duration-300 group">
                <div className="w-12 h-12 bg-green-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600 transition">
                   <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Climate Action</h3>
                <p className="text-slate-400 text-sm">Agriculture & Green Energy.</p>
              </div>

               {/* Governance */}
               <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-purple-500 transition duration-300 group">
                <div className="w-12 h-12 bg-purple-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600 transition">
                   <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Governance</h3>
                <p className="text-slate-400 text-sm">Policy, Law & Leadership.</p>
              </div>

               {/* Job Creation */}
               <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-cyan-500 transition duration-300 group">
                <div className="w-12 h-12 bg-cyan-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-cyan-600 transition">
                   <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Job Creation</h3>
                <p className="text-slate-400 text-sm">Entrepreneurship & Business.</p>
              </div>

              {/* Arts */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-pink-500 transition duration-300 group">
                <div className="w-12 h-12 bg-pink-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-pink-600 transition">
                   <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Arts & Culture</h3>
                <p className="text-slate-400 text-sm">Creative Economy & Design.</p>
              </div>

            </div>
          </div>
        </section>

        {/* --- 5. FRAMEWORK SECTION --- */}
        <section className="bg-white py-20 md:py-28">
           <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">Our Framework</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">
                Purpose + Reality = A Viable Match
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Identify a Problem", desc: "Start by identifying a specific community problem you are passionate about solving." },
                { step: "02", title: "Explore & Align", desc: "Link your problem to personal curiosity, UN SDGs, and Global Challenges." },
                { step: "03", title: "Check Reality", desc: "Filter options based on academic viability, requirements, and your strengths." },
                { step: "04", title: "Get Your Match", desc: "Receive a Tier 1 (Ideal) or Tier 2 (Complementary) academic path." }
              ].map((item, index) => (
                <div key={index} className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-md transition duration-300">
                  <span className="text-4xl font-bold text-amber-500 block mb-4">{item.step}</span>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- 6. TESTIMONIALS SECTION --- */}
        <section className="bg-gray-50 py-20 md:py-28">
            <div className="container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Testimonials</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-amber-500 text-4xl serif">"</div>
                        <p className="text-gray-700 italic mb-4">This platform helped me choose a program that truly fits my passion for agriculture.</p>
                        <p className="font-bold text-indigo-900">— Ama, SHS Graduate</p>
                    </div>
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-amber-500 text-4xl serif">"</div>
                        <p className="text-gray-700 italic mb-4">I discovered opportunities in data science I never knew existed in Ghana.</p>
                        <p className="font-bold text-indigo-900">— Kofi, SHS Graduate</p>
                    </div>
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-amber-500 text-4xl serif">"</div>
                        <p className="text-gray-700 italic mb-4">The recommendations were practical and helped me convince my parents.</p>
                        <p className="font-bold text-indigo-900">— Efua, SHS Graduate</p>
                    </div>
                </div>
            </div>
        </section>
      </main>

      {/* --- FOOTER (Restored) --- */}
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