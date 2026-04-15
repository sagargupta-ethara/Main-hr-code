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
    <div className="min-h-screen flex bg-[var(--bg-base)]">
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage:
            'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-teal-500/10"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-[var(--text-primary)]">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
            HR Dashboard
          </h1>
          <p className="text-lg text-cyan-200 leading-relaxed">
            Streamline your vendor hiring pipeline with powerful analytics and real-time tracking.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--bg-card)]">
        <div className="w-full max-w-md">
          <div className="bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-2xl p-8 ">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {isLogin ? 'Sign in to access your dashboard' : 'Sign up to get started'}
              </p>
            </div>

            {(localError || error) && (
              <div
                data-testid="auth-error-message"
                className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400"
              >
                {localError || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Name</label>
                  <input
                    data-testid="register-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                    required={!isLogin}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Email</label>
                <input
                  data-testid="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Password</label>
                <div className="relative">
                  <input
                    data-testid="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-5 h-5" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <button
                data-testid="login-submit-btn"
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-[var(--text-primary)] py-3 rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all font-semibold text-sm shadow-lg shadow-cyan-500/20"
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
                className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-[var(--text-muted)]">
            Demo: admin@vendorhiring.com / admin123
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
