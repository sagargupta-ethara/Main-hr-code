import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login, register, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setError('');

    if (isLogin) {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setLocalError(result.error);
      }
    } else {
      if (!name.trim()) {
        setLocalError('Name is required');
        return;
      }
      const result = await register(email, password, name);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setLocalError(result.error);
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1761229170427-487959bfb653?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBhYnN0cmFjdCUyMGNvcnBvcmF0ZSUyMGFyY2hpdGVjdHVyZSUyMGJsdWV8ZW58MHx8fHwxNzc2MDc4ODQwfDA&ixlib=rb-4.1.0&q=85)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-slate-900/90"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h1 className="text-4xl tracking-tight font-bold text-white mb-4">
            Vendor Hiring Dashboard
          </h1>
          <p className="text-lg text-blue-100 leading-relaxed">
            Streamline your vendor hiring pipeline with powerful analytics and real-time tracking.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-md p-8">
            <div className="mb-8">
              <h2 className="text-2xl tracking-tight font-semibold text-slate-900 mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {isLogin ? 'Sign in to access your dashboard' : 'Sign up to get started'}
              </p>
            </div>

            {(localError || error) && (
              <div
                data-testid="auth-error-message"
                className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-sm text-rose-700"
              >
                {localError || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    data-testid="register-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    required={!isLogin}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  data-testid="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    data-testid="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <button
                data-testid="login-submit-btn"
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                {isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                data-testid="toggle-auth-mode-btn"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setLocalError('');
                  setError('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-slate-500">
            Demo: admin@vendorhiring.com / admin123
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
