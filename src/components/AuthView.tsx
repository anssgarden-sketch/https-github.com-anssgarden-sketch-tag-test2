import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Shield, AlertCircle } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, register } = useGame();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (!handle.trim()) {
          throw new Error('Dark Web Handle is required');
        }
        await register(email.trim(), password, handle.trim());
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 font-mono">
      <div className="max-w-md w-full bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
        {/* Terminal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-700 flex items-center justify-center mx-auto mb-3 text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-neutral-100 tracking-wider uppercase">
            TAG // ESPIONAGE NETWORK
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Secure Terminal Access Node • Clandestine Operatives Grid
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-neutral-400 mb-1">Encrypted Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operative@domain.com"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/80"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Coded Cipher / Password (min. 8 chars)</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/80"
              />
            </div>
          </div>

          {isRegistering && (
            <div>
              <label className="block text-neutral-400 mb-1">
                Dark Web Handle (Survives Character Death)
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. ShadowWeaver, NightHawk"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/80"
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Will be used to mint your anonymous Swiss Bank Account (SB-XXXX-XXXX).
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer mt-2"
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Mint Account & Encrypt' : 'Authorize Terminal Connection'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
            }}
            className="text-xs text-neutral-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            {isRegistering
              ? 'Already hold an encrypted clearance? Authenticate here'
              : 'Need a clandestine identity? Register new operative account'}
          </button>
        </div>
      </div>
    </div>
  );
};
