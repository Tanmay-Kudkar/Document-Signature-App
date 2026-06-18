import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle, ArrowRight, PenTool } from 'lucide-react';
import { getStoredToken, registerUser } from '../lib/auth';
import NeonSweepButton from '../components/NeonSweepButton';

/* ==========================================================================
 * 📝 COMPONENT: Signup
 * --------------------------------------------------------------------------
 * Renders the registration page interface. Captures user details, validates
 * input (e.g., password length, TOS acceptance), and creates a new account 
 * via the backend API.
 * ========================================================================== */
const Signup = () => {
  const navigate = useNavigate();
  
  /* ------------------------------------------------------------------------
   * 🗃️ STATE MANAGEMENT
   * ------------------------------------------------------------------------ */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ------------------------------------------------------------------------
   * 🔄 EFFECT: Session Check
   * ------------------------------------------------------------------------
   * If a valid token is found in localStorage on mount, immediately redirect
   * the user to the dashboard to skip unnecessary signup.
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    if (getStoredToken()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  /* ------------------------------------------------------------------------
   * 🚀 FUNCTION: handleSubmit
   * ------------------------------------------------------------------------
   * Validates form inputs, ensures terms are accepted, registers the user,
   * and handles UI loading/error states.
   * ------------------------------------------------------------------------ */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!acceptedTerms) {
      setError('You must accept the terms to create an account.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      let errorMessage = submitError.message || 'Unable to create your account right now.';
      if (errorMessage.toLowerCase().includes('already exists')) {
        errorMessage = 'An account with this email already exists. Please log in instead.';
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
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-8">
            Join millions of <br />
            <span className="text-red-200">professionals</span> today.
          </h2>

          {/* Value Propositions */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-6 h-6 text-red-300" />
              <p className="text-lg opacity-90">Unlimited PDF signature requests</p>
            </div>
            <div className="flex items-center gap-4">
              <CheckCircle className="w-6 h-6 text-red-300" />
              <p className="text-lg opacity-90">Bank-level security protocols</p>
            </div>
            <div className="flex items-center gap-4">
              <CheckCircle className="w-6 h-6 text-red-300" />
              <p className="text-lg opacity-90">Unlimited cloud storage</p>
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

      {/* ── RIGHT PANEL: SIGNUP FORM ── */}
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
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Account</h1>
            <p className="text-gray-500 font-medium">Start your 14-day free trial. No credit card required.</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up delay-200 fill-mode-forwards opacity-0">
            
            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#e5322d] transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-[#e5322d] focus:bg-white transition-all outline-none text-gray-900 font-medium"
                  placeholder="Enter Your Full Name"
                  autoComplete="name"
                />
              </div>
            </div>

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
                  placeholder="username@example.com"
                  placeholder="username@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#e5322d] transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-[#e5322d] focus:bg-white transition-all outline-none text-gray-900 font-medium"
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3 py-2">
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 h-4 w-4 text-[#e5322d] border-gray-300 rounded focus:ring-red-500/20 cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm text-gray-600 font-medium leading-relaxed cursor-pointer select-none">
                I agree to the <a href="#" className="font-bold text-[#e5322d] hover:underline">Terms of Service</a> and <a href="#" className="font-bold text-[#e5322d] hover:underline">Privacy Policy</a>.
              </label>
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
              className="w-full py-4 text-lg shadow-lg shadow-red-100 flex items-center justify-center gap-2 mt-2 group/btn transform active:scale-[0.98]"
            >
              {isSubmitting ? 'Creating account...' : 'Sign up'}
              <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
            </NeonSweepButton>
          </form>

          {/* Login Redirect */}
          <div className="mt-10 text-center animate-slide-up delay-300 fill-mode-forwards opacity-0 pt-6 border-t border-gray-100">
            <p className="text-gray-600 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-[#e5322d] font-bold hover:underline transition-all ml-1">
                Log in instead
              </Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Signup;
