import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, CheckCircle, ArrowRight, PenTool } from 'lucide-react';
import { getStoredToken, loginUser } from '../lib/auth';
import NeonSweepButton from '../components/NeonSweepButton';

/* ==========================================================================
 * 🔐 COMPONENT: Login
 * --------------------------------------------------------------------------
 * Renders the login page interface. Handles user authentication through 
 * email/password submission and redirects to the dashboard upon success.
 * Includes a split-screen design for desktop (branding on left, form on right).
 * ========================================================================== */
const Login = () => {
  const navigate = useNavigate();
  
  /* ------------------------------------------------------------------------
   * 🗃️ STATE MANAGEMENT
   * ------------------------------------------------------------------------ */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ------------------------------------------------------------------------
   * 🔄 EFFECT: Session Check
   * ------------------------------------------------------------------------
   * If a valid token is found in localStorage on mount, immediately redirect
   * the user to the dashboard to skip unnecessary login.
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    if (getStoredToken()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  /* ------------------------------------------------------------------------
   * 🚀 FUNCTION: handleSubmit
   * ------------------------------------------------------------------------
   * Validates inputs, attempts authentication via the backend API, and 
   * manages UI loading/error states.
   * ------------------------------------------------------------------------ */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      let errorMessage = submitError.message || 'Unable to sign in right now.';
      if (errorMessage.toLowerCase().includes('invalid email or password')) {
        errorMessage = 'We couldn\'t find an account with those details. Please check your credentials or sign up for a new account.';
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ==========================================================================
   * 🎨 RENDER UI
   * ========================================================================== */
  return (
    <div className="min-h-screen bg-[#f5f5fa] flex flex-col md:flex-row animate-page-fade">
      
      {/* ── LEFT PANEL: BRANDING (Hidden on Mobile) ── */}
      <div className="hidden md:flex md:w-1/2 bg-[#e5322d] p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10 animate-slide-up">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-16 hover:opacity-80 transition-opacity">
            <div className="bg-white p-1.5 rounded-lg">
              <PenTool className="w-6 h-6 text-[#e5322d]" />
            </div>
            <span className="text-2xl font-black tracking-tight">DocSign</span>
          </Link>

          {/* Hero Copy */}
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-8 animate-slide-up delay-100">
            The world's favorite <br />
            <span className="text-red-200">PDF signature</span> tool.
          </h2>

          {/* Value Propositions */}
          <div className="space-y-6 animate-slide-up delay-200">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-6 h-6 text-red-300" />
              <p className="text-lg opacity-90">Legally binding eSignatures</p>
            </div>
            <div className="flex items-center gap-4">
              <CheckCircle className="w-6 h-6 text-red-300" />
              <p className="text-lg opacity-90">Secure document cloud storage</p>
            </div>
            <div className="flex items-center gap-4">
              <CheckCircle className="w-6 h-6 text-red-300" />
              <p className="text-lg opacity-90">Real-time tracking of requests</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm opacity-60">Copyright 2026 DocSign WebApp. All rights reserved.</p>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* ── RIGHT PANEL: LOGIN FORM ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-20 bg-white">
        <div className="w-full max-w-md animate-slide-up delay-100 fill-mode-forwards opacity-0">
          
          {/* Mobile Logo (Visible only on small screens) */}
          <div className="md:hidden flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="bg-[#e5322d] p-1.5 rounded-lg shadow-lg shadow-red-100">
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight">DocSign</span>
            </Link>
          </div>

          {/* Form Header */}
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="text-gray-500 font-medium">Login to manage your documents and signatures.</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up delay-200 fill-mode-forwards opacity-0">
            
            {/* Email Field */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Email address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#e5322d] transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-[#e5322d] focus:bg-white transition-all outline-none text-gray-900 font-medium"
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Password</label>
                <a href="#" className="text-sm font-bold text-[#e5322d] hover:text-[#cc2b26] transition-all">Forgot password?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#e5322d] transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-[#e5322d] focus:bg-white transition-all outline-none text-gray-900 font-medium"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error Message Display */}
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            {/* Submit Button */}
            <NeonSweepButton
              type="submit"
              disabled={isSubmitting}
              tone="danger"
              className="w-full py-4 text-lg shadow-lg shadow-red-100 flex items-center justify-center gap-2 group/btn transform active:scale-[0.98]"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
              <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
            </NeonSweepButton>
          </form>

          {/* Signup Redirect */}
          <div className="mt-10 text-center animate-slide-up delay-300 fill-mode-forwards opacity-0 pt-6 border-t border-gray-100">
            <p className="text-gray-600 font-medium">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#e5322d] font-bold hover:underline transition-all ml-1">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
