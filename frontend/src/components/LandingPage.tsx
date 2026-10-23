import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Building2, 
  GraduationCap, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Leaf, 
  Clock, 
  HeartHandshake,
  Lock,
  Copy,
  Check,
  ExternalLink,
  X,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { User, UserType } from '../types';
import { CAMPUS_OPTIONS } from '../utils/helpers';

declare global {
  interface Window {
    google?: any;
  }
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface LandingPageProps {
  onLogin: (email: string, role?: string) => Promise<void>;
  onRegister: (data: any) => Promise<void>;
  onGoogleAuth: (data: {
    email: string;
    name?: string;
    avatarUrl?: string;
    userType?: string;
    college?: string;
    canteenName?: string;
  }) => Promise<void>;
  onSelectUser: (user: User) => void;
  availableUsers: User[];
  isAuthenticating: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onRegister,
  onGoogleAuth,
  onSelectUser,
  availableUsers,
  isAuthenticating,
}) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<UserType>('USER');

  // Form states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('Stanford Central Campus');
  const [canteenName, setCanteenName] = useState('Central Dining Commons');
  const [error, setError] = useState<string | null>(null);

  // Google Setup & Demo states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [testGoogleEmail, setTestGoogleEmail] = useState('');
  const [testGoogleName, setTestGoogleName] = useState('');
  const [modalTab, setModalTab] = useState<'demo' | 'setup'>('demo');
  const [gisRendered, setGisRendered] = useState(false);

  const googleClientId = 
    import.meta.env.VITE_GOOGLE_CLIENT_ID || 
    '180715761304-s92fq8914t04pf7kjsg64bagsadnmdru.apps.googleusercontent.com';

  const isGoogleConfigured = Boolean(
    googleClientId && 
    !googleClientId.includes('YOUR_GOOGLE') && 
    googleClientId.length > 10
  );

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    if (!isGoogleConfigured) return;

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              try {
                // Decode Google JWT payload
                const base64Url = response.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const payload = JSON.parse(jsonPayload);

                await onGoogleAuth({
                  email: payload.email,
                  name: payload.name || payload.given_name || 'Google User',
                  avatarUrl: payload.picture,
                  userType: selectedRole,
                  college,
                  canteenName: selectedRole === 'COLLEGE' ? canteenName : undefined,
                });
              } catch (err: any) {
                console.error('Google token decode or auth error:', err);
                setError(err.message || 'Google sign-in failed');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render into container if present
          const btnEl = document.getElementById('gsi-button-container');
          if (btnEl) {
            btnEl.innerHTML = '';
            window.google.accounts.id.renderButton(btnEl, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: authMode === 'LOGIN' ? 'signin_with' : 'signup_with',
              shape: 'pill',
              width: 320,
              logo_alignment: 'left',
            });
            setGisRendered(true);
          }

          // Also trigger One-Tap prompt if eligible
          try {
            window.google.accounts.id.prompt();
          } catch {
            // One-tap prompt suppressed in some browser settings
          }
        } catch (e) {
          console.warn('GIS initialization error:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [isGoogleConfigured, googleClientId, authMode, selectedRole, college, canteenName]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleQuickGoogleTest = async (testEmailAddr: string, testUserName: string) => {
    setError(null);
    try {
      await onGoogleAuth({
        email: testEmailAddr,
        name: testUserName,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(testUserName)}`,
        userType: selectedRole,
        college,
        canteenName: selectedRole === 'COLLEGE' ? canteenName : undefined,
      });
      setShowGoogleModal(false);
    } catch (err: any) {
      setError(err.message || 'Quick Google authentication failed');
    }
  };

  const handleGoogleButtonClick = () => {
    if (isGoogleConfigured && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch {
        setShowGoogleModal(true);
      }
    } else {
      setShowGoogleModal(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (authMode === 'LOGIN') {
        if (!email.trim()) {
          setError('Please enter your email');
          return;
        }
        await onLogin(email, selectedRole);
      } else {
        if (!name.trim() || !email.trim()) {
          setError('Please fill in all required fields');
          return;
        }
        await onRegister({
          name,
          email,
          phone,
          userType: selectedRole,
          college,
          canteenName: selectedRole === 'COLLEGE' ? canteenName : undefined,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-emerald-50/60 via-slate-50 to-white flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Mission & Highlights */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>Campus Food Rescue & Redistribution</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                Connecting surplus food with people who need it.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                When college canteens have safe, nutritious surplus food from dining halls or catering events, Foodlink notifies registered campus members to reserve and collect it in real time.
              </p>
            </div>

            {/* Value Props Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Atomic First-Come Claiming</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Single-claim concurrency engine ensures once an item is claimed, it is instantly reserved for the first student.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Food Safety Verified</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Clear holding temperatures, prep times, allergens, and authorized staff pickup verification codes.
                </p>
              </div>
            </div>


          </div>

          {/* Right Column: Interactive Login / Register Form */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

              {/* Form Mode Selector: Login vs Register */}
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAuthMode('LOGIN')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'LOGIN'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('REGISTER')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    authMode === 'REGISTER'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Role Type Selector: Student/User vs College/Canteen */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Account Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('USER')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      selectedRole === 'USER'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <GraduationCap className={`w-5 h-5 ${selectedRole === 'USER' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold">Foodlink User</div>
                      <div className="text-[10px] text-slate-500">Student & Staff</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('COLLEGE')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      selectedRole === 'COLLEGE'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Building2 className={`w-5 h-5 ${selectedRole === 'COLLEGE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-bold">Canteen Staff</div>
                      <div className="text-[10px] text-slate-500">Publish Surplus</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Google Authentication Section */}
              <div className="space-y-2 pt-1">
                {/* Official Google Identity Services rendered button */}
                <div 
                  id="gsi-button-container" 
                  className={`flex justify-center w-full min-h-[40px] ${gisRendered ? 'block' : 'hidden'}`} 
                />

                {/* Branded fallback button when GIS is initializing or for manual prompt */}
                {!gisRendered && (
                  <button
                    type="button"
                    onClick={handleGoogleButtonClick}
                    disabled={isAuthenticating}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer group active:scale-98 disabled:opacity-50"
                  >
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span className="font-bold text-slate-700">
                      {authMode === 'LOGIN' ? 'Sign in with Google' : 'Sign up with Google'}
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100/70 font-semibold px-2 py-0.5 rounded-full ml-auto border border-emerald-200/60">
                      {selectedRole === 'COLLEGE' ? 'Canteen' : 'Student'}
                    </span>
                  </button>
                )}

                <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Auto-syncs profile & avatar
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(true)}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>OAuth Info & Demo</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-white px-2.5 text-slate-400">Or with campus email</span>
                </div>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                    {error}
                  </div>
                )}

                {authMode === 'REGISTER' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Rivera or Chef Marco"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Campus Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={selectedRole === 'COLLEGE' ? 'chef.canteen@campus.edu' : 'student@campus.edu'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
                  />
                </div>

                {authMode === 'REGISTER' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number (for collection SMS/alerts)
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        College / Campus *
                      </label>
                      <select
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium bg-white"
                      >
                        {CAMPUS_OPTIONS.filter((c) => c !== 'All Campuses').map((camp) => (
                          <option key={camp} value={camp}>
                            {camp}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedRole === 'COLLEGE' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Canteen / Dining Facility Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tresidder Student Dining Hall"
                          value={canteenName}
                          onChange={(e) => setCanteenName(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
                        />
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {isAuthenticating
                      ? 'Authenticating...'
                      : authMode === 'LOGIN'
                        ? `Sign In as ${selectedRole === 'COLLEGE' ? 'Canteen Staff' : 'Foodlink User'}`
                        : `Register as ${selectedRole === 'COLLEGE' ? 'Canteen Account' : 'Student Account'}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="text-center text-xs text-slate-500">
                <span>By continuing, you agree to our </span>
                <span className="text-emerald-700 font-semibold underline">Campus Food Safety Guidelines</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campus Community Trust Footer */}
      <div className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">Foodlink Campus Network</span>
            <span>· Rescuing safe surplus food across universities</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Zero Food Waste Mission
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Atomic Claim Concurrency
            </span>
          </div>
        </div>
      </div>
      {/* Google Setup & Testing Modal */}
      {showGoogleModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setShowGoogleModal(false)}
        >
          <div 
            className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">Google Sign-In & Sign-Up</h2>
                  <p className="text-xs text-slate-400">
                    Live Google Identity Services & Neon PostgreSQL Sync
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setModalTab('demo')}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'demo'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1-Click Instant Test (Neon DB Sync)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('setup')}
                className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'setup'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Google Cloud Console Setup Guide
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs">
              {modalTab === 'demo' ? (
                <div className="space-y-5">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Test Live PostgreSQL Synchronization</p>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                        Clicking any profile below will invoke <code className="bg-emerald-100 px-1 py-0.5 rounded text-[10px] font-mono">POST /api/auth/google</code>. If the user is new, it automatically provisions them in the live Neon PostgreSQL database and signs them in!
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Quick 1-Click Test Personas
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleQuickGoogleTest('sarah.chen.google@campus.edu', 'Sarah Chen')}
                        className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 text-left transition-all group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                            alt="Sarah"
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-800 text-xs group-hover:text-emerald-700">
                              Sarah Chen
                            </div>
                            <div className="text-[10px] text-slate-500">sarah.chen.google@campus.edu</div>
                            <span className="inline-block mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                              Student Account
                            </span>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickGoogleTest('chef.marcus.google@campus.edu', 'Chef Marcus Vance')}
                        className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 text-left transition-all group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=100&q=80"
                            alt="Chef Marcus"
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-800 text-xs group-hover:text-emerald-700">
                              Chef Marcus Vance
                            </div>
                            <div className="text-[10px] text-slate-500">chef.marcus.google@campus.edu</div>
                            <span className="inline-block mt-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                              Canteen Account
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Or Test with Custom Google Email
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Full Name (e.g. Jordan Lee)"
                        value={testGoogleName}
                        onChange={(e) => setTestGoogleName(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-emerald-600"
                      />
                      <input
                        type="email"
                        placeholder="Google Email (e.g. jordan@gmail.com)"
                        value={testGoogleEmail}
                        onChange={(e) => setTestGoogleEmail(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-emerald-600"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!testGoogleEmail.trim()) return;
                        handleQuickGoogleTest(testGoogleEmail.trim(), testGoogleName.trim() || 'Custom Google User');
                      }}
                      disabled={!testGoogleEmail.trim() || isAuthenticating}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <GoogleIcon className="w-3.5 h-3.5" />
                      <span>Authenticate Custom Account in PostgreSQL</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Current Client ID Status</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-md">
                        {isGoogleConfigured ? googleClientId : 'Not configured (using demo fallback)'}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isGoogleConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isGoogleConfigured ? 'Configured' : 'Needs Client ID'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Create OAuth Credentials in Google Cloud</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Open the Google Cloud Console Credentials page and click <strong>Create Credentials</strong> &gt; <strong>OAuth client ID</strong>.
                        </p>
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:underline mt-1"
                        >
                          <span>Open Google Cloud Credentials</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="w-full">
                        <p className="font-bold text-slate-800">Add Authorized JavaScript Origins</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Set Application Type to <strong>Web application</strong>, and add both localhost and your live Vercel URL to <strong>Authorized JavaScript origins</strong>:
                        </p>
                        
                        <div className="space-y-1.5 mt-2">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-800 border border-slate-200">
                            <span>http://localhost:5173</span>
                            <button
                              type="button"
                              onClick={() => handleCopy('http://localhost:5173', 'origin-local')}
                              className="text-emerald-700 hover:text-emerald-800 font-sans font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedText === 'origin-local' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedText === 'origin-local' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-800 border border-slate-200">
                            <span>https://foodlink-20.vercel.app</span>
                            <button
                              type="button"
                              onClick={() => handleCopy('https://foodlink-20.vercel.app', 'origin-prod')}
                              className="text-emerald-700 hover:text-emerald-800 font-sans font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedText === 'origin-prod' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedText === 'origin-prod' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Save Client ID in Environment Variables</p>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          Copy the Client ID (looks like <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">123456789-abc.apps.googleusercontent.com</code>) and add it to:
                        </p>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-slate-600">
                          <li><strong>Local development:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">frontend/.env</code> as <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">VITE_GOOGLE_CLIENT_ID="..."</code></li>
                          <li><strong>Production:</strong> Vercel Dashboard &gt; Settings &gt; Environment Variables &gt; Add <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">VITE_GOOGLE_CLIENT_ID</code></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Live Neon PostgreSQL Connected
              </span>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
