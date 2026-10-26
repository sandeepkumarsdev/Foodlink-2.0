import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Snowflake, 
  Utensils, 
  Share2, 
  QrCode,
  RotateCcw,
  Sparkles,
  HeartHandshake,
  Tag,
  Plus,
  Minus,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FoodPost, User } from '../types';
import { formatTimeRemaining, formatDateTime, formatFoodPrice } from '../utils/helpers';

interface FoodDetailsModalProps {
  post: FoodPost | null;
  currentUser: User | null;
  onClose: () => void;
  onClaim: (post: FoodPost, portions: number) => Promise<void>;
  onUnclaim: (post: FoodPost) => Promise<void>;
  isClaiming: boolean;
  claimError: string | null;
  claimSuccessData: { claimCode: string; message: string } | null;
}

export const FoodDetailsModal: React.FC<FoodDetailsModalProps> = ({
  post,
  currentUser,
  onClose,
  onClaim,
  onUnclaim,
  isClaiming,
  claimError,
  claimSuccessData,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [selectedPortions, setSelectedPortions] = useState(1);

  const maxPortions = post 
    ? (post.remainingServings !== undefined ? post.remainingServings : (post.servingsCount || 1))
    : 1;

  useEffect(() => {
    if (post) {
      const avail = post.remainingServings !== undefined ? post.remainingServings : (post.servingsCount || 1);
      setSelectedPortions(avail > 0 ? 1 : 0);
    }
  }, [post?.id, post?.remainingServings]);

  if (!post) return null;

  const timeInfo = formatTimeRemaining(post.collectionDeadline);
  const priceInfo = formatFoodPrice(post.price, post.originalPrice);
  const isClaimedByMe = currentUser && (
    post.claimedBy === currentUser.id || 
    post.claims?.some(c => c.userId === currentUser.id && c.status === 'CLAIMED')
  );

  const myClaim = currentUser && post.claims 
    ? post.claims.find(c => c.userId === currentUser.id && c.status === 'CLAIMED')
    : undefined;

  const activeClaimedPortions = myClaim?.portions || post.claimedPortions || selectedPortions;
  const activeClaimPrice = myClaim?.totalPrice !== undefined 
    ? myClaim.totalPrice 
    : (post.price * activeClaimedPortions);

  const portionPrice = post.price || 0;
  const currentTotalPrice = portionPrice * selectedPortions;

  const handleConfirmClaim = async () => {
    setShowConfirmDialog(false);
    try {
      await onClaim(post, selectedPortions);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#059669', '#34d399', '#f59e0b'],
      });
    } catch {
      // Error handled via props
    }
  };

  const handleRelease = async () => {
    if (confirm('Are you sure you want to release this food? It will be made available for other students immediately.')) {
      setIsReleasing(true);
      try {
        await onUnclaim(post);
      } finally {
        setIsReleasing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Image */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-100">
          <img
            src={post.imageUrl}
            alt={post.foodName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

          {/* Badges on Image */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-md">
                  {maxPortions > 0 ? `${maxPortions} portions left` : 'Fully Claimed'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-md">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{portionPrice > 0 ? `₹${portionPrice}/portion` : 'Free'}</span>
                  {priceInfo.discountPercent ? ` · ${priceInfo.discountPercent}% OFF` : ''}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-xs">
                {post.foodName}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{timeInfo.text}</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-288px)] overflow-y-auto">
          {/* Canteen Information Banner */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-slate-900 text-sm">{post.canteenName}</h4>
                  <span title="Verified Campus Canteen">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </span>
                </div>
                <p className="text-xs text-slate-500">{post.collegeName}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
              Verified Dining
            </span>
          </div>

          {/* Affordable Surplus Meal Pricing Card */}
          <div className="p-4 bg-gradient-to-r from-amber-50 via-emerald-50/60 to-teal-50/60 rounded-2xl border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                Campus Surplus Price per Portion
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">
                  {portionPrice > 0 ? `₹${portionPrice}` : 'FREE'}
                </span>
                <span className="text-xs text-slate-500 font-bold">/ portion</span>
                {priceInfo.originalPriceFormatted && (
                  <span className="text-sm line-through text-slate-400 font-semibold">
                    {priceInfo.originalPriceFormatted}
                  </span>
                )}
                {priceInfo.discountPercent ? (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Save {priceInfo.discountPercent}%
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {portionPrice > 0 
                  ? 'Select how many portions you need below. Pay at the canteen counter on collection.' 
                  : 'Complimentary / 100% Free Campus Surplus Meal.'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-200 shadow-xs text-xs font-black text-amber-900">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                {portionPrice > 0 ? 'Budget Meal' : 'Free Food'}
              </span>
            </div>
          </div>

          {/* Interactive Portion Stepper & Multi-Claim Selector */}
          {post.status === 'AVAILABLE' && maxPortions > 0 && !isClaimedByMe && !claimSuccessData && (
            <div className="p-4 bg-gradient-to-br from-emerald-50/70 via-slate-50 to-teal-50/70 rounded-2xl border-2 border-emerald-300 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                    <span>How Many Portions Do You Need?</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Order for yourself or take extra for friends
                  </p>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {maxPortions} available
                </span>
              </div>

              {/* Portion Stepper Controls */}
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedPortions(prev => Math.max(1, prev - 1))}
                  disabled={selectedPortions <= 1}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-800 flex items-center justify-center font-black transition-colors"
                  aria-label="Decrease portions"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex-1 text-center">
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {selectedPortions}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {selectedPortions === 1 ? 'Portion' : 'Portions'} Selected
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPortions(prev => Math.min(maxPortions, prev + 1))}
                  disabled={selectedPortions >= maxPortions}
                  className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center font-black transition-colors shadow-xs"
                  aria-label="Increase portions"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Portion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Select:</span>
                {[1, 2, 4, 6].filter(n => n <= maxPortions).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelectedPortions(n)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedPortions === n
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {n} {n === 1 ? 'portion' : 'portions'}
                  </button>
                ))}
                {maxPortions > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPortions(maxPortions)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedPortions === maxPortions
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    All ({maxPortions})
                  </button>
                )}
              </div>

              {/* Dynamic Subtotal & Remaining breakdown */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Subtotal for {selectedPortions} portion{selectedPortions > 1 ? 's' : ''}:
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {maxPortions - selectedPortions > 0 
                      ? `${maxPortions - selectedPortions} portions will remain available for others`
                      : 'All available portions will be reserved'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-700">
                    {portionPrice > 0 ? `₹${currentTotalPrice.toFixed(2)}` : 'FREE'}
                  </span>
                  {portionPrice > 0 && selectedPortions > 1 && (
                    <span className="block text-[10px] text-slate-500 font-medium">
                      (₹{portionPrice} × {selectedPortions})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Claim Success State / Pickup Ticket */}
          {(isClaimedByMe || claimSuccessData) && (
            <div className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span className="font-bold text-sm tracking-wide uppercase">Claim Confirmed!</span>
                </div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  Show at pickup counter
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-100 font-medium">Your Collection Pickup Code</p>
                  <p className="text-3xl font-mono font-black tracking-widest text-amber-200">
                    {myClaim?.claimCode || claimSuccessData?.claimCode || post.claimCode || 'FL-READY'}
                  </p>
                  <div className="mt-1 text-xs font-bold text-emerald-100 flex flex-wrap gap-2 items-center">
                    <span>Reserved: <strong className="text-amber-200">{activeClaimedPortions} portion{activeClaimedPortions > 1 ? 's' : ''}</strong></span>
                    <span>·</span>
                    <span>Pay at Counter: <strong className="text-amber-300 font-black text-sm">₹{activeClaimPrice.toFixed(2)}</strong></span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-white rounded-lg p-1.5 flex items-center justify-center text-slate-900 shrink-0">
                  <QrCode className="w-10 h-10" />
                </div>
              </div>

              <p className="text-xs text-emerald-100 leading-relaxed">
                Head to <strong>{post.location}</strong> before{' '}
                <strong>{formatDateTime(post.collectionDeadline)}</strong>. Show this code to canteen staff and pay <strong>₹{activeClaimPrice.toFixed(2)}</strong> on collection.
              </p>

              <div className="pt-2 flex items-center justify-between border-t border-white/15">
                <span className="text-[11px] text-emerald-200">Can't make it? Let someone else have it:</span>
                <button
                  onClick={handleRelease}
                  disabled={isReleasing}
                  className="text-xs font-bold text-rose-200 hover:text-white flex items-center gap-1 underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Release Claim</span>
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Food Description
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {post.description}
            </p>
          </div>

          {/* Dietary & Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Dietary Information
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {post.dietaryTags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Food Holding State
              </h4>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                {post.temperature === 'HOT' && <Flame className="w-4 h-4 text-orange-500" />}
                {post.temperature === 'COLD' && <Snowflake className="w-4 h-4 text-cyan-500" />}
                {post.temperature === 'ROOM_TEMP' && <Utensils className="w-4 h-4 text-amber-500" />}
                <span>
                  {post.temperature === 'HOT'
                    ? 'Hot Food (>65°C)'
                    : post.temperature === 'COLD'
                      ? 'Refrigerated Cold'
                      : 'Ambient Temperature'}
                </span>
              </div>
            </div>
          </div>

          {/* Food Safety / Hygiene Details */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Campus Food Safety & Consumption Advisory</span>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              {post.foodSafetyInfo}
            </p>
          </div>

          {/* Collection Location & Hours */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-start gap-2 text-slate-800 text-xs font-medium">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Collection Location: </span>
                {post.location}
              </div>
            </div>

            <div className="flex items-start gap-2 text-slate-600 text-xs">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Deadline: </span>
                {formatDateTime(post.collectionDeadline)} ({timeInfo.text})
              </div>
            </div>
          </div>

          {/* Claim Error Alert (e.g. if someone claimed simultaneously) */}
          {claimError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                  Claim Request Failed
                </h5>
                <p className="text-xs text-rose-700 mt-0.5 font-medium">{claimError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>

          {post.status === 'AVAILABLE' && maxPortions > 0 ? (
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isClaiming || selectedPortions <= 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>
                {isClaiming 
                  ? 'Verifying Availability...' 
                  : portionPrice > 0 
                    ? `Claim ${selectedPortions} Portion${selectedPortions > 1 ? 's' : ''} · ₹${currentTotalPrice.toFixed(2)}`
                    : `Claim ${selectedPortions} Portion${selectedPortions > 1 ? 's' : ''} (Free)`}
              </span>
            </button>
          ) : isClaimedByMe ? (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Reserved for you ({activeClaimedPortions} portions). Pick up soon!
            </span>
          ) : post.status === 'CLAIMED' || maxPortions <= 0 ? (
            <div className="text-xs font-bold text-amber-700 bg-amber-100 px-4 py-2 rounded-xl">
              All Portions Claimed {post.claimantName ? `(Latest: ${post.claimantName})` : ''}
            </div>
          ) : (
            <div className="text-xs font-bold text-slate-600 bg-slate-200 px-4 py-2 rounded-xl">
              Post {post.status}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog before claiming */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <HeartHandshake className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Confirm Portion Reservation
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                You are claiming <strong className="text-emerald-700">{selectedPortions} portion{selectedPortions > 1 ? 's' : ''}</strong>. 
                {maxPortions - selectedPortions > 0 
                  ? ` The remaining ${maxPortions - selectedPortions} portions will stay available for other students.`
                  : ' This will claim all remaining portions for this meal.'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <div>
                <strong>Item:</strong> {post.foodName}
              </div>
              <div className="flex items-center justify-between text-slate-800 bg-white p-2 rounded-lg border border-slate-200">
                <span className="font-semibold">Portions to Reserve:</span>
                <span className="font-black text-emerald-700 text-sm">{selectedPortions} portion{selectedPortions > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-900 font-bold bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                <span>Total to Pay at Canteen:</span>
                <span className="text-sm font-black text-emerald-700">
                  {portionPrice > 0 ? `₹${currentTotalPrice.toFixed(2)}` : 'FREE'}
                </span>
              </div>
              <div>
                <strong>Location:</strong> {post.location}
              </div>
              <div>
                <strong>Deadline:</strong> {formatDateTime(post.collectionDeadline)} ({timeInfo.text})
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClaim}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-98 cursor-pointer"
              >
                Confirm · {portionPrice > 0 ? `₹${currentTotalPrice.toFixed(2)}` : 'Free'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
