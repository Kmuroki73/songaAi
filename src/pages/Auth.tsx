import React, { useState } from 'react';
import { Car, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LegalModal, ModalType } from '../components/Footer';

type AuthProps = {
  onClose?: () => void;
  /** When true, renders as a modal overlay instead of a full page */
  modal?: boolean;
};

export const Auth: React.FC<AuthProps> = ({ onClose, modal = false }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<'driver' | 'passenger'>('passenger');
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalModal, setLegalModal] = useState<ModalType>(null);

  const { signUp, signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(formData.email, formData.password, {
          full_name: formData.full_name,
          phone: formData.phone,
          role,
        });
      } else {
        await signIn(formData.email, formData.password);
      }
      onClose?.();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const card = (
    <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md ${modal ? '' : 'mx-auto'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {isSignUp ? 'Create account' : 'Sign in to Songa'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isSignUp ? 'Join thousands of travellers' : 'Book your seat in seconds'}
          </p>
        </div>
        {modal && onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Role picker — only on sign up */}
        {isSignUp && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">I am a:</p>
            <div className="grid grid-cols-2 gap-3">
              {(['passenger', 'driver'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                    role === r ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {r === 'passenger' ? (
                    <Users className={`w-6 h-6 ${role === r ? 'text-orange-500' : 'text-gray-400'}`} />
                  ) : (
                    <Car className={`w-6 h-6 ${role === r ? 'text-orange-500' : 'text-gray-400'}`} />
                  )}
                  <span className={`text-sm font-medium capitalize ${role === r ? 'text-orange-600' : 'text-gray-600'}`}>
                    {r}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <>
              <input
                type="text"
                required
                placeholder="Full name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
              <input
                type="tel"
                required
                placeholder="Phone — 07XX XXX XXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </>
          )}
          <input
            type="email"
            required
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            minLength={6}
          />

          {isSignUp && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-orange-500 rounded shrink-0 cursor-pointer"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={() => setLegalModal('tos')}
                  className="text-orange-600 font-semibold hover:underline"
                >
                  Terms of Service
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => setLegalModal('privacy')}
                  className="text-orange-600 font-semibold hover:underline"
                >
                  Privacy Policy
                </button>
              </span>
            </label>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isSignUp && !agreedToTerms)}
            className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 active:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setAgreedToTerms(false); }}
            className="text-orange-600 font-semibold hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>

      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
        <div className="w-full sm:max-w-md">
          {card}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-1">Songa</h1>
          <p className="text-gray-500 text-sm">Your journey, simplified</p>
        </div>
        {card}
      </div>
    </div>
  );
};
