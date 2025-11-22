import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupUser } from '../services/api';
import logoImg from '../assets/images/logo.png';

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) {
        setError("You must agree to the terms and privacy policy.");
        return;
    }
    setLoading(true);
    setError('');

    try {
      const backendPayload = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName, 
          last_name: formData.lastName
      };

      await signupUser(backendPayload);
      alert("Account created successfully! Please log in.");
      navigate('/login'); 

    } catch (err) {
      console.error("Signup failed", err);
      if (err.username) setError(`Username issue: ${err.username[0]}`);
      else if (err.email) setError(`Email issue: ${err.email[0]}`);
      else if (err.password) setError(`Password issue: ${err.password[0]}`);
      else setError("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClasses = "w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-green-700 focus:bg-white focus:ring-0 text-gray-900 transition pl-4 pr-10";

  return (
    <div className="flex min-h-screen w-full font-sans">
      
      <div className="hidden md:flex md:w-[45%] relative bg-teal-900 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2940&auto=format&fit=crop" 
          alt="Community collaboration" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-900/95 via-teal-800/90 to-blue-900/80"></div>
        
        <div className="relative z-10 flex flex-col h-full p-12 text-white justify-between">
           <div className="mb-8">
             <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl inline-block w-fit">
                <img src={logoImg} alt="Community Path Logo" className="h-16 w-auto object-contain" />
             </div>
           </div>
           <div className="mb-20">
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-6 leading-tight tracking-tight">
                Discover Your Place.
            </h1>
            <p className="text-teal-50 text-xl leading-relaxed max-w-md font-medium">
                We are developing communities and inspiring students, one match at a time.
            </p>
           </div>
        </div>
      </div>

      <div className="w-full md:w-[55%] bg-white flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto">
        
        <div className="w-full max-w-md py-8">
            
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
                <p className="text-gray-500 mt-2">Join the community today.</p>
            </div>

            <div className="mb-6">
                <div className="flex justify-center gap-4">
                    <button className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition shadow-sm">
                         <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                    </button>
                    <button className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition shadow-sm">
                        <img src="https://www.svgrepo.com/show/448234/linkedin.svg" alt="LinkedIn" className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="relative flex py-4 items-center mb-6">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm uppercase tracking-wider font-medium">Or register with email</span>
                <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {error && <p className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg font-medium">{error}</p>}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">First Name *</label>
                        <input type="text" name="firstName" placeholder="Kwame" value={formData.firstName} onChange={handleChange} className={`${inputClasses} px-4`} required />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name *</label>
                        <input type="text" name="lastName" placeholder="Mensah" value={formData.lastName} onChange={handleChange} className={`${inputClasses} px-4`} required />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Username *</label>
                    <div className="relative">
                        <input type="text" name="username" placeholder="Choose a unique username" value={formData.username} onChange={handleChange} className={inputClasses} required />
                        <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">You will use this to log in.</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                    <div className="relative">
                        <input type="email" name="email" placeholder="kwame@example.com" value={formData.email} onChange={handleChange} className={inputClasses} required />
                        <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} className={inputClasses} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Must be at least 6 characters.</p>
                </div>

                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input id="terms" type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300" />
                    </div>

                    {/* ✔ CHANGED ONLY THIS TO GREEN */}
                    <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
                        By signing up I agree to the <a href="#" className="text-green-600 hover:underline font-medium">terms of service</a>.
                    </label>
                </div>

                {/* GREEN BUTTON WAS ALREADY DONE */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold shadow-md transform transition hover:-translate-y-0.5 focus:ring-4 focus:ring-green-200 text-lg"
                >
                    {loading ? "Creating Account..." : "Create Account"}
                </button>

            </form>

            <div className="mt-8 text-center">

                {/* ✔ CHANGED ONLY THIS TO GREEN */}
                <p className="text-gray-600">
                    Already have an account? <Link to="/login" className="font-bold text-green-600 hover:underline">Log in</Link>
                </p>
            </div>

        </div>
      </div>
    </div>
  );
}

export default Signup;
