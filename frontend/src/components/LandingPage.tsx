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
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Send,
  RefreshCw
} from 'lucide-react';
import { User, UserType } from '../types';
import { CAMPUS_OPTIONS } from '../utils/helpers';
import { api } from '../services/api';

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
  onLogin: (email: string, password?: string, role?: string) => Promise<void>;
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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('Stanford Central Campus');
  const [canteenName, setCanteenName] = useState('Central Dining Commons');
  const [error, setError] = useState<string | null>(null);

  // Email Verification States
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmailAddress, setVerifiedEmailAddress] = useState('');
  const [codeSentMessage, setCodeSentMessage] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [gisRendered, setGisRendered] = useState(false);
  const [isGoogleAuthenticating, setIsGoogleAuthenticating] = useState(false);

  useEffect(() => {
    const handleSetAuthMode = (e: any) => {
      if (e.detail === 'LOGIN' || e.detail === 'REGISTER') {
        setAuthMode(e.detail);
      }
    };
    window.addEventListener('foodlink:set-auth-mode', handleSetAuthMode);
    return () => window.removeEventListener('foodlink:set-auth-mode', handleSetAuthMode);
  }, []);

  const googleClientId = 
    import.meta.env.VITE_GOOGLE_CLIENT_ID || 
    '180715761304-s92fq8914t04pf7kjsg64bagsadnmdru.apps.googleusercontent.com';

  const isGoogleConfigured = Boolean(
    googleClientId && 
    !googleClientId.includes('YOUR_GOOGLE') && 
    googleClientId.length > 10
  );

  const selectedRoleRef = React.useRef(selectedRole);
  selectedRoleRef.current = selectedRole;
  const collegeRef = React.useRef(college);
  collegeRef.current = college;
  const canteenNameRef = React.useRef(canteenName);
  canteenNameRef.current = canteenName;

  // Initialize Google Identity Services once on mount if client ID is configured
  useEffect(() => {
    if (!isGoogleConfigured) return;

    let isMounted = true;

    const initGsi = () => {
      if (window.google?.accounts?.id && isMounted) {
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
                  userType: selectedRoleRef.current,
                  college: collegeRef.current,
                  canteenName: selectedRoleRef.current === 'COLLEGE' ? canteenNameRef.current : undefined,
                });
              } catch (err: any) {
                console.error('Google token decode or auth error:', err);
                setError(err.message || 'Google sign-in failed');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
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
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isGoogleConfigured, googleClientId]);

  const redirectToGoogleOAuth = () => {
    try {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const redirectUri = isLocalhost
        ? window.location.origin
        : 'https://foodlink-20.vercel.app';

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', googleClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('prompt', 'select_account');

      const stateObj = {
        role: selectedRoleRef.current,
        college: collegeRef.current,
        canteenName: canteenNameRef.current,
      };
      authUrl.searchParams.set('state', encodeURIComponent(JSON.stringify(stateObj)));

      window.location.href = authUrl.toString();
    } catch (e: any) {
      console.error('Redirect failed:', e);
      setError('Failed to redirect to Google: ' + e.message);
    }
  };

  // Check URL fragment for OAuth redirect return token
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
      const params = new URLSearchParams(cleanHash);
      const accessToken = params.get('access_token');
      const stateParam = params.get('state');

      let savedRole = selectedRoleRef.current;
      let savedCollege = collegeRef.current;
      let savedCanteen = canteenNameRef.current;

      if (stateParam) {
        try {
          const parsed = JSON.parse(decodeURIComponent(stateParam));
          if (parsed.role) savedRole = parsed.role;
          if (parsed.college) savedCollege = parsed.college;
          if (parsed.canteenName) savedCanteen = parsed.canteenName;
        } catch (err) {
          console.warn('Could not parse OAuth state:', err);
        }
      }

      if (accessToken) {
        window.history.replaceState(null, '', window.location.pathname);
        setIsGoogleAuthenticating(true);

        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => {
            if (!res.ok) throw new Error('Could not fetch user profile from Google');
            return res.json();
          })
          .then(async (profile) => {
            if (!profile.email) throw new Error('Google did not return an email');
            await onGoogleAuth({
              email: profile.email,
              name: profile.name || profile.given_name || 'Google User',
              avatarUrl: profile.picture,
              userType: savedRole,
              college: savedCollege,
              canteenName: savedRole === 'COLLEGE' ? savedCanteen : undefined,
            });
          })
          .catch((err) => {
            console.error('OAuth redirect processing error:', err);
            setError(err.message || 'Google sign-in via redirect failed');
          })
          .finally(() => {
            setIsGoogleAuthenticating(false);
          });
      }
    }
  }, []);

  const handleGoogleButtonClick = () => {
    setError(null);

    // If Google OAuth2 client is loaded in window, launch Google Sign-In!
    if (window.google?.accounts?.oauth2) {
      try {
        setIsGoogleAuthenticating(true);

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setIsGoogleAuthenticating(false);
              if (tokenResponse.error === 'access_denied') return; // User simply closed the popup
              setError(`Google Sign-In Error: ${tokenResponse.error_description || tokenResponse.error}`);
              return;
            }

            try {
              // Fetch user profile from Google's standard UserInfo endpoint
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              });

              if (!userInfoRes.ok) {
                throw new Error('Could not fetch user profile from Google');
              }

              const profile = await userInfoRes.json();
              if (!profile.email) {
                throw new Error('Google did not return an email address');
              }

              await onGoogleAuth({
                email: profile.email,
                name: profile.name || profile.given_name || 'Google User',
                avatarUrl: profile.picture,
                userType: selectedRoleRef.current,
                college: collegeRef.current,
                canteenName: selectedRoleRef.current === 'COLLEGE' ? canteenNameRef.current : undefined,
              });
            } catch (err: any) {
              console.error('Google profile sync error:', err);
              setError(err.message || 'Failed to authenticate Google user');
            } finally {
              setIsGoogleAuthenticating(false);
            }
          },
          error_callback: (err: any) => {
            setIsGoogleAuthenticating(false);
            console.warn('Google popup error, falling back to OAuth redirect:', err);
            // If popup failed to open or was blocked by browser, automatically execute the redirect flow!
            if (err?.message?.includes('popup') || err?.type === 'popup_failed_to_open') {
              redirectToGoogleOAuth();
              return;
            }
            setError(
              err.message ||
                'Google sign-in popup encountered an error. Please verify Authorized JavaScript origins in Google Cloud Console.'
            );
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err: any) {
        setIsGoogleAuthenticating(false);
        console.warn('Popup execution error, falling back to redirect:', err);
        redirectToGoogleOAuth();
        return;
      }
    }

    // Fallback: If Google script has not loaded yet, execute direct OAuth redirect!
    redirectToGoogleOAuth();
  };

  // Verification countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleEmailChange = (newVal: string) => {
    setEmail(newVal);
    if (isEmailVerified && newVal.trim().toLowerCase() !== verifiedEmailAddress) {
      setIsEmailVerified(false);
      setCodeSentMessage(null);
      setPreviewCode(null);
      setVerificationCode('');
    }
  };

  const handleSendVerificationCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid campus email address');
      return;
    }
    setError(null);
    setIsSendingCode(true);
    try {
      const res = await api.sendVerificationCode(email.trim());
      setCodeSentMessage(res.message);
      if (res.previewCode) {
        setPreviewCode(res.previewCode);
      }
      setCountdown(45);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setError(null);
    setIsVerifyingCode(true);
    try {
      await api.verifyCode(email.trim(), verificationCode.trim());
      setIsEmailVerified(true);
      setVerifiedEmailAddress(email.trim().toLowerCase());
      setCodeSentMessage('Email verified successfully!');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (authMode === 'LOGIN') {
        if (!email.trim()) {
          setError('Please enter your email address');
          return;
        }
        if (!password.trim()) {
          setError('Please enter the password attached to your account');
          return;
        }
        await onLogin(email.trim(), password, selectedRole);
      } else {
        if (!name.trim() || !email.trim()) {
          setError('Please fill in all required fields');
          return;
        }
        if (!isEmailVerified || verifiedEmailAddress !== email.trim().toLowerCase()) {
          setError('Please verify your email address with the 6-digit verification code before registering');
          return;
        }
        if (!password) {
          setError('Please create a password for your account');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify your password');
          return;
        }
        await onRegister({
          name,
          email: email.trim().toLowerCase(),
          password,
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

            {/* Hero Quick Action CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('REGISTER');
                  const el = document.getElementById('auth-section');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el?.classList.add('ring-4', 'ring-emerald-400/50');
                  setTimeout(() => el?.classList.remove('ring-4', 'ring-emerald-400/50'), 2000);
                  el?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>Create Campus Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('LOGIN');
                  const el = document.getElementById('auth-section');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el?.classList.add('ring-4', 'ring-emerald-400/50');
                  setTimeout(() => el?.classList.remove('ring-4', 'ring-emerald-400/50'), 2000);
                  el?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
                }}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>Log In</span>
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Login / Register Form */}
          <div className="lg:col-span-5">
            <div id="auth-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 relative overflow-hidden transition-all duration-300 scroll-mt-24">
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

              {/* Global Error Banner */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 space-y-2.5 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <div className="leading-snug">
                      {error}
                    </div>
                  </div>
                  {error.toLowerCase().includes('popup') && (
                    <button
                      type="button"
                      onClick={redirectToGoogleOAuth}
                      className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      <GoogleIcon className="w-3.5 h-3.5" />
                      <span>Continue with Google (Full-Page Redirect)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Google Authentication Section */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleButtonClick}
                  disabled={isAuthenticating || isGoogleAuthenticating}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer group active:scale-98 disabled:opacity-60"
                >
                  {isGoogleAuthenticating ? (
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-bold text-slate-700">
                    {isGoogleAuthenticating
                      ? 'Connecting to Google...'
                      : authMode === 'LOGIN'
                        ? 'Sign in with Google'
                        : 'Sign up with Google'}
                  </span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100/70 font-semibold px-2 py-0.5 rounded-full ml-auto border border-emerald-200/60">
                    {selectedRole === 'COLLEGE' ? 'Canteen' : 'Student'}
                  </span>
                </button>

                <div className="flex items-center justify-center text-[11px] px-1 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Auto-syncs profile & avatar
                  </span>
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
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
                  />
                </div>

                {/* Email Verification Box in Registration Mode */}
                {authMode === 'REGISTER' && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Email Verification Required</span>
                      </span>
                      {isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                          Code Required
                        </span>
                      )}
                    </div>

                    {!isEmailVerified && (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isSendingCode || !email.trim() || countdown > 0}
                            onClick={handleSendVerificationCode}
                            className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                          >
                            {isSendingCode ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>{countdown > 0 ? `Resend (${countdown}s)` : codeSentMessage ? 'Resend Code' : 'Send Code'}</span>
                          </button>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            {codeSentMessage ? 'Code sent! Check your email.' : 'Click to send a 6-digit verification code.'}
                          </p>
                        </div>

                        {previewCode && (
                          <div 
                            onClick={() => setVerificationCode(previewCode)}
                            className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-semibold cursor-pointer hover:bg-emerald-100/70 transition-colors flex items-center justify-between"
                            title="Click to auto-fill code"
                          >
                            <span>🧪 Demo Mode: Code is <strong className="font-mono text-xs">{previewCode}</strong></span>
                            <span className="underline text-[10px]">Click to auto-fill</span>
                          </div>
                        )}

                        {codeSentMessage && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="6-digit code"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                              className="w-32 text-center tracking-widest font-mono text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500 bg-white"
                            />
                            <button
                              type="button"
                              disabled={isVerifyingCode || verificationCode.length < 6}
                              onClick={handleVerifyCode}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {isVerifyingCode ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Verify Code</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {isEmailVerified && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Email <strong>{email}</strong> verified! You can now create your account.</span>
                      </div>
                    )}
                  </div>
                )}

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

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Create Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="At least 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {authMode === 'LOGIN' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your account password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthenticating || (authMode === 'REGISTER' && !isEmailVerified)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {isAuthenticating
                      ? 'Authenticating...'
                      : authMode === 'LOGIN'
                        ? `Sign In as ${selectedRole === 'COLLEGE' ? 'Canteen Staff' : 'Foodlink User'}`
                        : !isEmailVerified
                          ? 'Verify Email with Code to Register'
                          : `Complete Registration as ${selectedRole === 'COLLEGE' ? 'Canteen Account' : 'Student Account'}`}
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
    </div>
  );
};
