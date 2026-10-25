import React, { useState } from 'react';
import { 
  Building2, 
  PlusCircle, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Flame, 
  ShieldCheck, 
  ShieldAlert, 
  User as UserIcon, 
  Users,
  Phone, 
  XCircle, 
  Check, 
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  Leaf,
  Tag
} from 'lucide-react';
import { FoodPost, User, DashboardStats } from '../types';
import { formatTimeRemaining, formatDateTime, formatFoodPrice } from '../utils/helpers';

interface CollegeDashboardProps {
  currentUser: User;
  foodPosts: FoodPost[];
  stats: DashboardStats | null;
  onOpenPostFood: () => void;
  onMarkCollected: (postId: string, code?: string, claimId?: string) => Promise<void>;
  onCancelPost: (postId: string, reason?: string) => Promise<void>;
  onToggleVerification: (userId: string) => Promise<void>;
}

export const CollegeDashboard: React.FC<CollegeDashboardProps> = ({
  currentUser,
  foodPosts,
  stats,
  onOpenPostFood,
  onMarkCollected,
  onCancelPost,
  onToggleVerification,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'AVAILABLE' | 'CLAIMED' | 'COLLECTED' | 'EXPIRED'>('CLAIMED');
  const [verifyingPostId, setVerifyingPostId] = useState<string | null>(null);
  const [verifyingClaimId, setVerifyingClaimId] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [cancelModalPost, setCancelModalPost] = useState<FoodPost | null>(null);
  const [cancelReason, setCancelReason] = useState('Surplus food consumed or no longer suitable');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter posts belonging to this canteen or college
  const canteenPosts = foodPosts.filter((p) => {
    if (currentUser.userType === 'ADMIN') return true;
    return p.canteenName === currentUser.canteenName || p.collegeName === currentUser.college;
  });

  const availableCount = canteenPosts.filter((p) => p.status === 'AVAILABLE' && (p.remainingServings ?? p.servingsCount) > 0).length;
  const claimedCount = canteenPosts.filter((p) => 
    p.status === 'CLAIMED' || (p.claims && p.claims.some((c) => c.status === 'CLAIMED'))
  ).length;
  const collectedCount = canteenPosts.filter((p) => p.status === 'COLLECTED').length;
  const expiredCount = canteenPosts.filter((p) => p.status === 'EXPIRED').length;

  const filteredPosts = canteenPosts.filter((p) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'CLAIMED') {
      return p.status === 'CLAIMED' || (p.claims && p.claims.some((c) => c.status === 'CLAIMED'));
    }
    if (activeTab === 'AVAILABLE') {
      return p.status === 'AVAILABLE' && (p.remainingServings ?? p.servingsCount) > 0;
    }
    return p.status === activeTab;
  });

  const handleVerifySubmit = async (postId: string) => {
    setIsSubmitting(true);
    try {
      await onMarkCollected(postId, inputCode || undefined);
      setVerifyingPostId(null);
      setInputCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyClaimSubmit = async (postId: string, claimId: string) => {
    setIsSubmitting(true);
    try {
      await onMarkCollected(postId, inputCode || undefined, claimId);
      setVerifyingClaimId(null);
      setInputCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelModalPost) return;
    setIsSubmitting(true);
    try {
      await onCancelPost(cancelModalPost.id, cancelReason);
      setCancelModalPost(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Verification Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentUser.canteenName || `${currentUser.college} Canteen Operations`}
              </h1>
              {currentUser.isVerified !== false ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Canteen
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Pending Admin Verification
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {currentUser.college} · Authorised Canteen Operator ({currentUser.name})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onToggleVerification(currentUser.id)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors"
            title="Toggle verification status for testing"
          >
            Toggle Verify: {currentUser.isVerified ? 'Verified' : 'Unverified'}
          </button>

          <button
            onClick={onOpenPostFood}
            disabled={currentUser.isVerified === false}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md hover:shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Publish Surplus Food</span>
          </button>
        </div>
      </div>

      {/* Verification Warning if unverified */}
      {currentUser.isVerified === false && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <strong>Admin Verification Required:</strong> Your canteen account is currently pending verification. You can toggle this status using the "Toggle Verify" button above to publish food immediately.
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Posts</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats?.totalFoodPosts ?? canteenPosts.length}
          </div>
          <span className="text-[11px] text-slate-500">Catering surplus batches</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Redistributed</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {stats?.portionsRedistributed ?? 0}
          </div>
          <span className="text-[11px] text-slate-500">Portions saved from waste</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Collected</span>
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">
            {collectedCount}
          </div>
          <span className="text-[11px] text-slate-500">Completed handovers</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Expired</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-600">
            {expiredCount}
          </div>
          <span className="text-[11px] text-slate-500">Passed deadline</span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 sm:p-5 text-white shadow-xs">
          <div className="flex items-center justify-between text-emerald-200 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Eco Impact</span>
            <Leaf className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="text-2xl sm:text-3xl font-black">
            {stats?.co2SavedKg ?? 0} <span className="text-sm font-semibold">kg CO2</span>
          </div>
          <span className="text-[11px] text-emerald-100">Greenhouse emissions avoided</span>
        </div>
      </div>

      {/* Posts Management Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('CLAIMED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'CLAIMED'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Awaiting Handover (Claimed)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 font-black">
                {claimedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('AVAILABLE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'AVAILABLE'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Active Feed (Available)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-950 font-black">
                {availableCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('COLLECTED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'COLLECTED'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Collected History</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-200 text-blue-950 font-black">
                {collectedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All Posts ({canteenPosts.length})</span>
            </button>
          </div>
        </div>

        {/* Posts List */}
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No posts in this category</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Have excess food from lunch or dinner service? Publish a new post to alert hungry students right away.
            </p>
            <button
              onClick={onOpenPostFood}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              + Publish New Food
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => {
              const timeInfo = formatTimeRemaining(post.collectionDeadline);
              const priceInfo = formatFoodPrice(post.price, post.originalPrice);
              const isVerifying = verifyingPostId === post.id;
              const remaining = post.remainingServings ?? post.servingsCount;
              const claimedPortions = post.servingsCount - remaining;
              const hasActiveClaims = post.claims && post.claims.some((c) => c.status === 'CLAIMED');

              return (
                <div
                  key={post.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                    hasActiveClaims || post.status === 'CLAIMED'
                      ? 'border-amber-300 ring-2 ring-amber-400/30 shadow-md'
                      : post.status === 'AVAILABLE'
                        ? 'border-emerald-200 shadow-xs'
                        : 'border-slate-200 opacity-80'
                  }`}
                >
                  {/* Top Image & Status */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                    <img
                      src={post.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-xs ${
                        post.status === 'AVAILABLE'
                          ? 'bg-emerald-500 text-white'
                          : post.status === 'CLAIMED'
                            ? 'bg-amber-500 text-white animate-pulse'
                            : post.status === 'COLLECTED'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-600 text-white'
                      }`}>
                        {post.status}
                      </span>
                      {hasActiveClaims && post.status === 'AVAILABLE' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                          Pickup Pending
                        </span>
                      )}
                    </div>

                    {/* Price Tag Overlay */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 shadow-xs flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {priceInfo.priceFormatted}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-bold">
                      <span>{remaining} / {post.servingsCount} portions</span>
                      <span>{timeInfo.text}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-slate-900 line-clamp-1">
                          {post.foodName}
                        </h3>
                        <span className="text-xs font-black text-emerald-700 shrink-0">
                          {priceInfo.priceFormatted} / portion
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {post.description}
                      </p>

                      {/* Portion Inventory Tracker */}
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${remaining > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            Portions Available:
                          </span>
                          <span className="text-slate-900 font-extrabold">
                            <span className="text-emerald-700">{remaining}</span> / {post.servingsCount}
                            {claimedPortions > 0 && (
                              <span className="text-amber-700 font-bold ml-1">({claimedPortions} claimed)</span>
                            )}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(0, (remaining / post.servingsCount) * 100))}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Detailed Student Claims List if multi-portion claims exist */}
                      {post.claims && post.claims.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-amber-600" />
                              Student Claims ({post.claims.length})
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black">
                              {claimedPortions} / {post.servingsCount} portions
                            </span>
                          </div>

                          <div className="space-y-2">
                            {post.claims.map((claim) => {
                              const claimPrice = claim.totalPrice ?? ((claim.portions || 1) * (post.price || 0));
                              const isVerifyingThisClaim = verifyingClaimId === claim.id;

                              return (
                                <div
                                  key={claim.id}
                                  className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                                    claim.status === 'COLLECTED'
                                      ? 'bg-blue-50/70 border-blue-200'
                                      : 'bg-amber-50/70 border-amber-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                      <UserIcon className="w-3.5 h-3.5 text-amber-700" />
                                      <span>{claim.userName}</span>
                                    </div>
                                    <span className="font-mono text-xs font-black text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded-md border border-amber-300">
                                      Code: {claim.claimCode}
                                    </span>
                                  </div>

                                  {claim.userPhone && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                      <Phone className="w-3 h-3 text-amber-600" />
                                      <span>{claim.userPhone}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/50">
                                    <span className="font-semibold text-slate-700">
                                      Reserved: <strong className="text-slate-900">{claim.portions || 1} portion{(claim.portions || 1) > 1 ? 's' : ''}</strong>
                                    </span>
                                    <span className="font-black text-emerald-800">
                                      Collect: ₹{claimPrice}
                                    </span>
                                  </div>

                                  {claim.status === 'CLAIMED' ? (
                                    <div className="pt-1.5">
                                      {isVerifyingThisClaim ? (
                                        <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-amber-300 shadow-2xs">
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-slate-700">Student Pickup Code:</span>
                                            <span className="font-bold text-emerald-700">Collect ₹{claimPrice}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="text"
                                              placeholder={claim.claimCode}
                                              value={inputCode}
                                              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                              className="w-full text-xs uppercase font-mono px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold focus:outline-emerald-500"
                                            />
                                            <button
                                              onClick={() => handleVerifyClaimSubmit(post.id, claim.id)}
                                              disabled={isSubmitting}
                                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
                                            >
                                              Confirm
                                            </button>
                                            <button
                                              onClick={() => { setVerifyingClaimId(null); setInputCode(''); }}
                                              className="text-slate-400 hover:text-slate-600 p-1 text-xs"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setVerifyingClaimId(claim.id);
                                            setInputCode(claim.claimCode);
                                          }}
                                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Hand Over ({claim.portions || 1} portions · ₹{claimPrice})</span>
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="pt-1 text-[11px] font-bold text-blue-700 flex items-center gap-1">
                                      <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Handed over & ₹{claimPrice} collected</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : post.status === 'CLAIMED' ? (
                        /* Fallback single claimant contact box */
                        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              Claimant Details
                            </span>
                            <span className="font-mono text-xs font-black text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded-md">
                              Code: {post.claimCode || 'FL-VERIFY'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <UserIcon className="w-3.5 h-3.5 text-amber-700" />
                            <span>{post.claimantName || 'Student'}</span>
                          </div>
                          {post.claimantPhone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-amber-700" />
                              <span>{post.claimantPhone}</span>
                            </div>
                          )}
                          <div className="pt-1.5 mt-1 border-t border-amber-200/60 flex items-center justify-between text-xs font-bold text-amber-950">
                            <span>Collect at Counter:</span>
                            <span className="font-black text-emerald-800 text-sm">{priceInfo.priceFormatted}</span>
                          </div>
                        </div>
                      ) : null}

                      {/* Collected details */}
                      {post.status === 'COLLECTED' && (!post.claims || post.claims.length === 0) && (
                        <div className="mt-3 p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Handed over to {post.claimantName}</span>
                          </div>
                          <span className="font-black text-blue-950">{priceInfo.priceFormatted}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      {/* For single claimant without claims array */}
                      {post.status === 'CLAIMED' && (!post.claims || post.claims.length === 0) && (
                        <div>
                          {isVerifying ? (
                            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-700 block">
                                  Enter Student's Pickup Code:
                                </label>
                                <span className="text-[11px] font-black text-emerald-700">
                                  Collect: {priceInfo.priceFormatted}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder={post.claimCode || 'FL-0000'}
                                  value={inputCode}
                                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                  className="w-full text-xs uppercase font-mono px-3 py-1.5 rounded-lg border border-slate-300 font-bold focus:outline-emerald-500"
                                />
                                <button
                                  onClick={() => handleVerifySubmit(post.id)}
                                  disabled={isSubmitting}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                                >
                                  Confirm
                                </button>
                              </div>
                              <button
                                onClick={() => setVerifyingPostId(null)}
                                className="text-[10px] text-slate-500 hover:text-slate-800"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setVerifyingPostId(post.id)}
                                className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                <span>Mark Collected</span>
                              </button>
                              <button
                                onClick={() => setCancelModalPost(post)}
                                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Cancel post"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cancel button for AVAILABLE posts or posts with remaining portions */}
                      {(post.status === 'AVAILABLE' || (post.claims && post.claims.length > 0 && post.status !== 'COLLECTED')) && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCancelModalPost(post)}
                            className="w-full py-2 px-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Cancel Food Post</span>
                          </button>
                        </div>
                      )}

                      {(post.status === 'COLLECTED' || post.status === 'EXPIRED') && (
                        <span className="text-[11px] text-slate-400 block text-center">
                          {formatDateTime(post.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Post Confirmation Modal */}
      {cancelModalPost && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Cancel Food Availability Post?
              </h3>
              <p className="text-xs text-slate-500">
                {cancelModalPost.status === 'CLAIMED'
                  ? 'Warning: This food has already been claimed by a student. Cancelling will notify the student immediately.'
                  : 'This food will be removed from the available campus feed.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Cancellation:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCancelModalPost(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
