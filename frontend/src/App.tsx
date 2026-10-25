import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Sparkles, 
  MapPin, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Zap, 
  PlusCircle, 
  UtensilsCrossed, 
  Leaf,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FoodPost, User, NotificationItem, DashboardStats, RealtimeEvent } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { FoodCard } from './components/FoodCard';
import { FoodDetailsModal } from './components/FoodDetailsModal';
import { MyClaimsView } from './components/MyClaimsView';
import { CollegeDashboard } from './components/CollegeDashboard';
import { PostFoodModal } from './components/PostFoodModal';
import { NotificationsDropdown } from './components/NotificationsDropdown';
import { ConcurrencyTesterModal } from './components/ConcurrencyTesterModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { LandingPage } from './components/LandingPage';
import { StatsView } from './components/StatsView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SetPasswordModal } from './components/SetPasswordModal';
import { ChangeAvatarModal } from './components/ChangeAvatarModal';

export default function App() {
  // Authentication & Users
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // App Navigation & Filters
  const [activeTab, setActiveTab] = useState<'browse' | 'my-claims' | 'canteen' | 'stats'>('browse');
  const [selectedCampus, setSelectedCampus] = useState<string>('All Campuses');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDietary, setSelectedDietary] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('AVAILABLE'); // default to AVAILABLE for students

  // Data Store
  const [foodPosts, setFoodPosts] = useState<FoodPost[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Panels
  const [selectedFoodDetails, setSelectedFoodDetails] = useState<FoodPost | null>(null);
  const [showPostFoodModal, setShowPostFoodModal] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showRaceTesterModal, setShowRaceTesterModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [showChangeAvatarModal, setShowChangeAvatarModal] = useState(false);

  // Claim Operation State
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccessData, setClaimSuccessData] = useState<{ claimCode: string; message: string } | null>(null);

  // Real-time SSE State
  const [isSseConnected, setIsSseConnected] = useState(false);

  // 1. Initial Load of Users, Posts, Stats
  const fetchData = useCallback(async () => {
    try {
      const [usersData, postsData, statsData] = await Promise.all([
        api.getUsers(),
        api.getFoodPosts(),
        api.getStats(),
      ]);

      setAvailableUsers(usersData);
      setFoodPosts(postsData);
      setStats(statsData);

    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Fetch Notifications when current user changes
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const notifs = await api.getNotifications(currentUser.id);
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 3. Fallback Polling Real-Time Synchronization Hub (Replaces SSE for Serverless compatibility)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const pollData = async () => {
      try {
        const [posts, statsData] = await Promise.all([
          api.getFoodPosts(),
          api.getStats()
        ]);
        
        setFoodPosts(posts);
        setStats(statsData);
        setIsSseConnected(true);

        if (currentUser) {
          const notifs = await api.getNotifications(currentUser.id);
          setNotifications(notifs);
        }
      } catch (err) {
        setIsSseConnected(false);
      }
    };

    // Initial fetch
    pollData();

    // Poll every 5 seconds
    interval = setInterval(pollData, 5000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // 4. Claim Food Handler (Atomic Concurrency-Guarded Backend Call)
  const handleClaim = async (post: FoodPost) => {
    if (!currentUser) {
      alert('Please log in or select a demo user profile first');
      return;
    }

    setIsClaiming(true);
    setClaimError(null);
    setClaimSuccessData(null);

    try {
      const response = await api.claimFood(post.id, {
        id: currentUser.id,
        name: currentUser.name,
        phone: currentUser.phone,
      });

      // Update state locally immediately (in addition to SSE broadcast)
      setFoodPosts((prev) =>
        prev.map((p) => (p.id === post.id ? response.foodPost : p))
      );
      setSelectedFoodDetails(response.foodPost);
      setClaimSuccessData({
        claimCode: response.foodPost.claimCode || 'FL-VERIFIED',
        message: response.message,
      });

      // Refresh notifications & stats
      fetchNotifications();
      api.getStats().then(setStats).catch(() => {});
    } catch (err: any) {
      console.error('Claim error:', err);
      const errorMsg =
        err.status === 409
          ? 'Sorry, this food has already been claimed by another user.'
          : err.message || 'Failed to claim food. Please try again.';
      setClaimError(errorMsg);

      // Re-fetch food posts to sync latest state
      const updatedPosts = await api.getFoodPosts();
      setFoodPosts(updatedPosts);
      const latest = updatedPosts.find((p) => p.id === post.id);
      if (latest) {
        setSelectedFoodDetails(latest);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  // 5. Unclaim / Release Food Handler
  const handleUnclaim = async (post: FoodPost) => {
    if (!currentUser) return;
    try {
      await api.unclaimFood(post.id, currentUser.id);
      const updated = await api.getFoodPosts();
      setFoodPosts(updated);
      setSelectedFoodDetails(null);
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to release claim');
    }
  };

  // 6. Canteen Actions: Post Food, Mark Handover Collected, Cancel Post
  const handleCreatePost = async (postData: any) => {
    await api.createFoodPost(postData);
    setShowPostFoodModal(false);
    const updated = await api.getFoodPosts();
    setFoodPosts(updated);
    api.getStats().then(setStats).catch(() => {});
  };

  const handleMarkCollected = async (postId: string, verifiedCode?: string) => {
    await api.markCollected(postId, verifiedCode);
    const updated = await api.getFoodPosts();
    setFoodPosts(updated);
    api.getStats().then(setStats).catch(() => {});
  };

  const handleCancelPost = async (postId: string, reason?: string) => {
    await api.cancelPost(postId, reason);
    const updated = await api.getFoodPosts();
    setFoodPosts(updated);
    api.getStats().then(setStats).catch(() => {});
  };

  const handleToggleVerification = async (userId: string) => {
    const res = await api.toggleCanteenVerification(userId);
    if (res.user && currentUser?.id === res.user.id) {
      setCurrentUser(res.user);
    }
    const updatedUsers = await api.getUsers();
    setAvailableUsers(updatedUsers);
  };

  // 7. Filtered Food Posts calculation
  const filteredPosts = useMemo(() => {
    return foodPosts.filter((post) => {
      // Campus Filter
      if (selectedCampus !== 'All Campuses' && post.collegeName !== selectedCampus) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'AVAILABLE' && post.status !== 'AVAILABLE') {
        return false;
      } else if (statusFilter === 'CLAIMED' && post.status !== 'CLAIMED') {
        return false;
      } else if (statusFilter === 'COLLECTED' && post.status !== 'COLLECTED') {
        return false;
      }

      // Dietary Filter
      if (selectedDietary !== 'ALL' && !post.dietaryTags.includes(selectedDietary)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = post.foodName.toLowerCase().includes(q);
        const matchesDesc = post.description.toLowerCase().includes(q);
        const matchesCanteen = post.canteenName.toLowerCase().includes(q);
        const matchesTags = post.dietaryTags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesCanteen && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [foodPosts, selectedCampus, statusFilter, selectedDietary, searchQuery]);

  // Notifications Helpers
  const handleMarkNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser) return;
    await api.markAllNotificationsRead(currentUser.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleScrollToAuth = useCallback((mode?: 'LOGIN' | 'REGISTER') => {
    if (currentUser) {
      setCurrentUser(null);
    }
    if (mode) {
      window.dispatchEvent(new CustomEvent('foodlink:set-auth-mode', { detail: mode }));
    }
    setTimeout(() => {
      const el = document.getElementById('auth-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-emerald-400/50');
        setTimeout(() => el.classList.remove('ring-4', 'ring-emerald-400/50'), 2000);
        const emailInput = el.querySelector<HTMLInputElement>('input[type="email"]');
        if (emailInput) {
          emailInput.focus();
        }
      }
    }, 60);
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        selectedCampus={selectedCampus}
        onSelectCampus={setSelectedCampus}
        unreadCount={unreadCount}
        onOpenNotifications={() => setShowNotificationsDropdown(true)}
        onSwitchUser={(user) => {
          setCurrentUser(user);
          // If canteen staff, switch tab to canteen portal or keep browse
          if (user.userType === 'COLLEGE') {
            setActiveTab('canteen');
          } else {
            setActiveTab('browse');
          }
        }}
        availableUsers={availableUsers}
        onLogout={() => setCurrentUser(null)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRaceModal={() => setShowRaceTesterModal(true)}
        onOpenDocsModal={() => setShowDocsModal(true)}
        onOpenPostFood={() => setShowPostFoodModal(true)}
        onOpenSetPassword={() => setShowSetPasswordModal(true)}
        onOpenChangeAvatar={() => setShowChangeAvatarModal(true)}
        onNavigateToAuth={() => handleScrollToAuth()}
        isSseConnected={isSseConnected}
        onResetDemo={async () => {
          await api.resetDemo();
          fetchData();
        }}
      />

      {/* Main Content Router */}
      <main className="flex-1 pb-20 md:pb-0">
        {!currentUser ? (
          <LandingPage
            onLogin={async (email, password, role) => {
              setIsAuthenticating(true);
              try {
                const res = await api.login(email, password, role);
                setCurrentUser(res.user);
                fetchData();
              } finally {
                setIsAuthenticating(false);
              }
            }}
            onRegister={async (userData) => {
              setIsAuthenticating(true);
              try {
                const res = await api.register(userData);
                setCurrentUser(res.user);
                fetchData();
              } finally {
                setIsAuthenticating(false);
              }
            }}
            onGoogleAuth={async (payload) => {
              setIsAuthenticating(true);
              try {
                const res = await api.googleAuth(payload);
                setCurrentUser(res.user);
                fetchData();
              } finally {
                setIsAuthenticating(false);
              }
            }}
            onSelectUser={(u) => {
              setCurrentUser(u);
              if (u.userType === 'COLLEGE') setActiveTab('canteen');
              else setActiveTab('browse');
            }}
            availableUsers={availableUsers}
            isAuthenticating={isAuthenticating}
          />
        ) : activeTab === 'my-claims' ? (
          <MyClaimsView
            currentUser={currentUser}
            foodPosts={foodPosts}
            onViewDetails={(post) => {
              setSelectedFoodDetails(post);
              setClaimError(null);
              setClaimSuccessData(null);
            }}
            onBrowseFood={() => setActiveTab('browse')}
            onUnclaim={handleUnclaim}
          />
        ) : activeTab === 'canteen' ? (
          <CollegeDashboard
            currentUser={currentUser}
            foodPosts={foodPosts}
            stats={stats}
            onOpenPostFood={() => setShowPostFoodModal(true)}
            onMarkCollected={handleMarkCollected}
            onCancelPost={handleCancelPost}
            onToggleVerification={handleToggleVerification}
          />
        ) : activeTab === 'stats' ? (
          <StatsView
            stats={stats}
            foodPosts={foodPosts}
            users={availableUsers}
            onBrowseFood={() => setActiveTab('browse')}
          />
        ) : (
          /* Available Food Feed / User Dashboard */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Hero / Quick Action Bar */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/80 backdrop-blur-md text-emerald-200 text-xs font-bold border border-emerald-600/50">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Real-Time Surplus Food Exchange</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                    Campus Surplus Food Available Right Now
                  </h1>
                  <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                    Fresh meals and snacks prepared by campus canteens, available for instant pickup. First-come, first-served claiming.
                  </p>
                </div>

                {/* Quick Impact Counters */}
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                  <div className="text-center px-2">
                    <span className="block text-2xl font-black text-amber-300">
                      {foodPosts.filter((p) => p.status === 'AVAILABLE').length}
                    </span>
                    <span className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">
                      Available Now
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div className="text-center px-2">
                    <span className="block text-2xl font-black text-white">
                      {stats?.portionsRedistributed ?? 75}
                    </span>
                    <span className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">
                      Meals Rescued
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div className="text-center px-2">
                    <span className="block text-2xl font-black text-emerald-300">
                      {stats?.co2SavedKg ?? 63.8}kg
                    </span>
                    <span className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">
                      CO2 Saved
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search Input */}
                <div className="relative w-full sm:max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search meals, ingredients, or dining halls..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-emerald-500 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Status Toggle Pills */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto overflow-x-auto">
                  <button
                    onClick={() => setStatusFilter('AVAILABLE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === 'AVAILABLE'
                        ? 'bg-white text-emerald-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🟢 Available Only
                  </button>
                  <button
                    onClick={() => setStatusFilter('CLAIMED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === 'CLAIMED'
                        ? 'bg-white text-amber-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🟠 Claimed
                  </button>
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Meals
                  </button>
                </div>
              </div>

              {/* Dietary Tags Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Diet:
                </span>
                {['ALL', 'Vegetarian', 'Vegan', 'Halal-Friendly', 'Gluten-Free', 'High-Protein'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedDietary(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                      selectedDietary === tag
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag === 'ALL' ? 'All Diets' : tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Feed Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {selectedCampus === 'All Campuses' ? 'Campus Food Feed' : selectedCampus}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                    {filteredPosts.length} Results
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {statusFilter === 'AVAILABLE' ? 'Showing fresh unreserved surplus' : 'Showing all meal batches'}
                </div>
              </div>

              {filteredPosts.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <UtensilsCrossed className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-800">
                      No surplus food matching your criteria
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Try adjusting your search keywords, clear dietary filters, or switch to view all campuses.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDietary('ALL');
                      setStatusFilter('ALL');
                      setSelectedCampus('All Campuses');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPosts.map((post) => (
                    <FoodCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onClaimClick={(p) => {
                        setSelectedFoodDetails(p);
                        setClaimError(null);
                        setClaimSuccessData(null);
                      }}
                      onViewDetails={(p) => {
                        setSelectedFoodDetails(p);
                        setClaimError(null);
                        setClaimSuccessData(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Food Details & Claim Modal */}
      {selectedFoodDetails && (
        <FoodDetailsModal
          post={selectedFoodDetails}
          currentUser={currentUser}
          onClose={() => {
            setSelectedFoodDetails(null);
            setClaimError(null);
            setClaimSuccessData(null);
          }}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          isClaiming={isClaiming}
          claimError={claimError}
          claimSuccessData={claimSuccessData}
        />
      )}

      {/* Post Food Modal for Canteen Staff */}
      {showPostFoodModal && (
        <PostFoodModal
          currentUser={currentUser}
          onClose={() => setShowPostFoodModal(false)}
          onSubmit={handleCreatePost}
          isSubmitting={false}
        />
      )}

      {/* Notifications Drawer */}
      {showNotificationsDropdown && (
        <NotificationsDropdown
          notifications={notifications}
          onClose={() => setShowNotificationsDropdown(false)}
          onMarkAsRead={handleMarkNotificationRead}
          onMarkAllAsRead={handleMarkAllNotificationsRead}
          onSelectFoodPost={(foodPostId) => {
            const p = foodPosts.find((item) => item.id === foodPostId);
            if (p) setSelectedFoodDetails(p);
          }}
        />
      )}

      {/* Concurrency Mutex Audit Simulator Modal */}
      {showRaceTesterModal && (
        <ConcurrencyTesterModal
          availablePosts={foodPosts.filter((p) => p.status === 'AVAILABLE')}
          onClose={() => setShowRaceTesterModal(false)}
          onRunTest={async (foodPostId) => {
            const res = await api.runRaceSimulation(foodPostId);
            fetchData();
            return res;
          }}
        />
      )}

      {/* System Architecture & Concurrency Specs Modal */}
      {showDocsModal && (
        <ArchitectureModal onClose={() => setShowDocsModal(false)} />
      )}

      {/* Set or Change Password Modal */}
      {currentUser && showSetPasswordModal && (
        <SetPasswordModal
          currentUser={currentUser}
          isOpen={showSetPasswordModal}
          onClose={() => setShowSetPasswordModal(false)}
          onSuccess={(updatedUser) => {
            setCurrentUser(updatedUser);
            fetchData();
          }}
        />
      )}

      {/* Change Profile Picture Modal */}
      {currentUser && showChangeAvatarModal && (
        <ChangeAvatarModal
          currentUser={currentUser}
          isOpen={showChangeAvatarModal}
          onClose={() => setShowChangeAvatarModal(false)}
          onSuccess={(updatedUser) => {
            setCurrentUser(updatedUser);
            fetchData();
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
