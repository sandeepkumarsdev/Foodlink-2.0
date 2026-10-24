import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  Bell, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  User as UserIcon, 
  LogOut, 
  Cpu, 
  CheckCircle2, 
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { User } from '../types';
import { CAMPUS_OPTIONS } from '../utils/helpers';

interface NavbarProps {
  currentUser: User | null;
  selectedCampus: string;
  onSelectCampus: (campus: string) => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onSwitchUser: (user: User) => void;
  availableUsers: User[];
  onLogout: () => void;
  activeTab: 'browse' | 'my-claims' | 'canteen' | 'stats';
  setActiveTab: (tab: 'browse' | 'my-claims' | 'canteen' | 'stats') => void;
  onOpenRaceModal?: () => void;
  onOpenDocsModal?: () => void;
  onOpenPostFood: () => void;
  isSseConnected: boolean;
  onResetDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  selectedCampus,
  onSelectCampus,
  unreadCount,
  onOpenNotifications,
  onSwitchUser,
  availableUsers,
  onLogout,
  activeTab,
  setActiveTab,
  onOpenRaceModal,
  onOpenDocsModal,
  onOpenPostFood,
  isSseConnected,
  onResetDemo,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    await onResetDemo();
    setTimeout(() => setIsResetting(false), 500);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      {/* Top micro bar: SSE Status & Demo switcher info */}
      <div className="bg-emerald-950 text-emerald-100 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${isSseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isSseConnected ? 'Live Real-time SSE · Local PostgreSQL Active' : 'Connecting to Realtime Hub...'}
            </span>
            <span className="text-emerald-400/50">|</span>
            <span className="hidden sm:inline text-emerald-200/80">
              Campus Surplus Food Rescue Platform
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('browse')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform overflow-hidden">
                <img src="/logo.png" alt="Foodlink" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Foodlink
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                    Campus
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 -mt-0.5">Rescue surplus food</p>
              </div>
            </button>

            {/* Campus Selector */}
            <div className="hidden md:flex items-center bg-slate-100/80 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80 transition-colors">
              <Building2 className="w-3.5 h-3.5 text-emerald-700 mr-2" />
              <select
                value={selectedCampus}
                onChange={(e) => onSelectCampus(e.target.value)}
                aria-label="Select Campus"
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                {CAMPUS_OPTIONS.map((campus) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('browse')}
              className={`hidden md:flex px-3 py-2 rounded-lg text-sm font-semibold transition-colors items-center gap-1.5 ${
                activeTab === 'browse'
                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Available Food</span>
            </button>

            {currentUser?.userType === 'USER' && (
              <button
                onClick={() => setActiveTab('my-claims')}
                className={`hidden md:flex px-3 py-2 rounded-lg text-sm font-semibold transition-colors items-center gap-1.5 ${
                  activeTab === 'my-claims'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>My Claims</span>
              </button>
            )}

            {(currentUser?.userType === 'COLLEGE' || currentUser?.userType === 'ADMIN') && (
              <button
                onClick={() => setActiveTab('canteen')}
                className={`hidden md:flex px-3 py-2 rounded-lg text-sm font-semibold transition-colors items-center gap-1.5 ${
                  activeTab === 'canteen'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Canteen Portal</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('stats')}
              className={`hidden sm:flex px-3 py-2 rounded-lg text-sm font-semibold transition-colors items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Campus Impact</span>
            </button>

            {/* Post Food button for canteen users */}
            {currentUser?.userType === 'COLLEGE' && (
              <button
                onClick={onOpenPostFood}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <span>+ Post Food</span>
              </button>
            )}

            {/* Notifications Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Account / Persona Switcher */}
            <div className="relative">
              {currentUser ? (
                <div className="flex items-center">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1.5 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 transition-all text-left"
                  >
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/30"
                    />
                    <div className="hidden md:block">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[110px]">
                          {currentUser.name}
                        </span>
                        {currentUser.userType === 'COLLEGE' && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-emerald-700 block -mt-0.5">
                        {currentUser.userType === 'COLLEGE' ? 'Canteen Staff' : currentUser.userType === 'ADMIN' ? 'Admin' : 'Student'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <div className="px-3.5 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-500">Currently logged in as:</p>
                        <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                        <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {currentUser.college}
                          {currentUser.canteenName ? ` · ${currentUser.canteenName}` : ''}
                        </span>
                      </div>



                      <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                        <button
                          onClick={onLogout}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-medium transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onLogout}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                >
                  Log In / Register
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
