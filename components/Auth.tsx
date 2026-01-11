
"use client";

import React, { useState } from 'react';
import { DEFAULT_PROVIDER_ID, normalizeAIProviderId } from '@/lib/ai-provider';
import { Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AuthProps {
  onLogin: () => void;
}

// Helper to hash password using SHA-256 (Client-side)
const hashPassword = async (text: string) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    setVerifying(true);
    
    try {
      // 1. Hash the input locally so we don't send plain text (optional, but good practice if using HTTP)
      const inputHash = await hashPassword(passwordInput);
      
      // 2. Send the hash to the server for verification
      const storedProvider = localStorage.getItem('ai_provider');
      const providerId = normalizeAIProviderId(storedProvider) ?? DEFAULT_PROVIDER_ID;
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-ai-provider': providerId },
        body: JSON.stringify({ hash: inputHash })
      });

      if (response.ok) {
        onLogin();
      } else {
        setAuthError(true);
      }
    } catch (err) {
      console.error("Auth Error", err);
      setAuthError(true);
    } finally {
      setVerifying(false);
    }
  };

  return (
      <div className="min-h-screen bg-gray-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-indigo-600/20 rounded-full border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <Lock className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">Restricted Access</h1>
            <p className="text-gray-400 text-center mb-8 text-sm">
              Enter master password to access.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative group">
                <label htmlFor="master-password" className="sr-only">Master Password</label>
                <input
                  id="master-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Master Password"
                  className={`w-full bg-gray-950/50 border ${authError ? 'border-red-500/50 focus:border-red-500' : 'border-gray-700 focus:border-indigo-500'} rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pr-12`}
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              <button
                type="submit"
                disabled={verifying}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-wait text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
              >
                {verifying ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                    </>
                ) : (
                    "Unlock"
                )}
              </button>

              {authError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <div>
                    <p className="text-red-400 text-xs font-medium">
                        Incorrect password.
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>
          <div className="text-center mt-6 flex items-center justify-center gap-2 text-gray-700 text-xs">
             <div className="w-2 h-2 rounded-full bg-indigo-900"></div>
             Secure Environment
          </div>
        </div>
      </div>
  );
};

export default Auth;
