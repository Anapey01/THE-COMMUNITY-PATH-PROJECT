import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api'; 
// We don't need the logo import here, but keeping clean structure

function Login() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await loginUser(formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      
      // Redirect to the User Hub (Dashboard)
      navigate('/dashboard');
      
    } catch (err) {
      console.error("Login failed", err);
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // MAIN CONTAINER: Split Screen (Flex Row)
    <div className="flex min-h-screen w-full font-sans">
      
      {/* --- LEFT SIDE: IMAGE (Blue/Purple is fine for contrast) --- */}
      <div className="hidden md:flex w-1/2 relative bg-indigo-900">
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop" 
          alt="Office view" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/80 to-purple-900/80"></div>
        
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
           <h2 className="text-4xl font-bold mb-4">The Community Path</h2>
           <p className="text-indigo-200 text-lg">Discover your purpose. Connect your passion.</p>
        </div>
      </div>

      {/* --- RIGHT SIDE: FORM --- */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center p-8 md:p-12 lg:p-20">
        
        <div className="w-full max-w-md">
            
            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
                <p className="text-gray-500">Please enter your details.</p>
            </div>

            {/* SOCIAL SIGN IN OPTIONS (Visual Only) */}
            <div className="mb-8">
                <p className="text-xs text-gray-400 font-semibold text-center mb-4 uppercase tracking-wider">Social sign in options</p>
                <div className="flex justify-center gap-4">
                    {/* Google, LinkedIn, Facebook Icons */}
                    <button className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                         <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                    </button>
                    <button className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                        <img src="https://www.svgrepo.com/show/448234/linkedin.svg" alt="LinkedIn" className="w-6 h-6" />
                    </button>
                    <button className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                        <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm">Manual sign in</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                {/* Username / Email Field */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email or Username *</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            name="username" 
                            placeholder="Enter your username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-green-700 focus:bg-white focus:ring-0 text-gray-900 transition"
                            required
                        />
                        {/* Mail Icon SVG */}
                        <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Password Field */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-green-700 focus:bg-white focus:ring-0 text-gray-900 transition"
                            required
                        />
                        {/* Eye Icon Button */}
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <div className="flex justify-end mt-2">
                         <a href="#" className="text-sm font-medium text-green-700 hover:text-green-800">Forgot password</a>
                    </div>
                </div>

                {/* GREEN SIGN IN BUTTON */}
                <button 
                    type="submit" 
                    disabled={loading}
                    // CHANGED: bg-amber-400 -> bg-green-700
                    className="w-full py-3 rounded-full bg-green-700 hover:bg-green-800 text-white font-bold shadow-lg transform transition hover:-translate-y-0.5 focus:ring-4 focus:ring-green-200"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>

            </form>

            {/* FOOTER */}
            <div className="mt-8 text-center space-y-4">
                <p className="text-gray-600">
                    Don't have an account? <Link to="/signup" className="font-bold text-green-700 hover:underline">Sign up</Link>
                </p>
                
                <div className="text-sm">
                    <span className="text-gray-500 font-bold">Struggling to log in or sign up? </span>
                    <a href="#" className="text-green-700 hover:underline">Click here</a> to contact us
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}

export default Login;