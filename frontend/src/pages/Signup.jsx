import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle, ArrowRight } from 'lucide-react';
import { getStoredToken, registerUser } from '../lib/auth';

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getStoredToken()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

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
      setError(submitError.message || 'Unable to create your account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5fa] flex flex-col md:flex-row animate-page-fade">
      <div className="hidden md:flex md:w-1/2 bg-[#e5322d] p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10 animate-slide-up">
          <Link to="/" className="flex items-center gap-2 mb-16 hover:opacity-80 transition-opacity">
            <div className="bg-white p-1.5 rounded-lg">
              <svg className="w-6 h-6 text-[#e5322d]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM16 11V18.1L13.9 16L11.1 18.1V11H16Z" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tight">DocSign</span>
          </Link>

          <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-8">
            Join millions of <br />
            <span className="text-red-200">professionals</span> today.
          </h2>

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

        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-20 bg-white">
        <div className="w-full max-w-md animate-slide-up delay-100 fill-mode-forwards opacity-0">
          <div className="md:hidden flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="bg-[#e5322d] p-1.5 rounded-lg shadow-lg shadow-red-100">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM16 11V18.1L13.9 16L11.1 18.1V11H16Z" />
                </svg>
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight">DocSign</span>
            </Link>
          </div>

          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Account</h1>
            <p className="text-gray-500 font-medium">Start your 14-day free trial. No credit card required.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up delay-200 fill-mode-forwards opacity-0">
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
                  placeholder="John Doe"
                  autoComplete="name"
                />
              </div>
            </div>

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

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#e5322d] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#cc2b26] transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 group mt-2 transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Creating account...' : 'Sign up'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

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
