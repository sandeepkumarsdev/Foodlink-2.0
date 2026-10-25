import React, { useState } from 'react';
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
  Tag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FoodPost, User } from '../types';
import { formatTimeRemaining, formatDateTime, formatFoodPrice } from '../utils/helpers';

interface FoodDetailsModalProps {
  post: FoodPost | null;
  currentUser: User | null;
  onClose: () => void;
  onClaim: (post: FoodPost) => Promise<void>;
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

  if (!post) return null;

  const timeInfo = formatTimeRemaining(post.collectionDeadline);
  const priceInfo = formatFoodPrice(post.price, post.originalPrice);
  const isClaimedByMe = currentUser && post.claimedBy === currentUser.id;

  const handleConfirmClaim = async () => {
    setShowConfirmDialog(false);
    try {
      await onClaim(post);
      // Trigger festive confetti
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
                  {post.quantity} Available
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-md">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{priceInfo.priceFormatted}</span>
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
                Campus Surplus Price
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">{priceInfo.priceFormatted}</span>
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
                {post.price && post.price > 0 
                  ? 'Pay at the canteen counter when presenting your claim voucher code.' 
                  : 'Complimentary / 100% Free Campus Surplus Meal.'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-200 shadow-xs text-xs font-black text-amber-900">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                {post.price && post.price > 0 ? 'Budget Meal' : 'Free Food'}
              </span>
            </div>
          </div>

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
                    {post.claimCode || claimSuccessData?.claimCode || 'FL-READY'}
                  </p>
                  <div className="mt-1 text-xs font-bold text-emerald-100">
                    Amount Due at Counter: <span className="text-amber-300 font-black text-sm">{priceInfo.priceFormatted}</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-white rounded-lg p-1.5 flex items-center justify-center text-slate-900">
                  <QrCode className="w-10 h-10" />
                </div>
              </div>

              <p className="text-xs text-emerald-100 leading-relaxed">
                Head to <strong>{post.location}</strong> before{' '}
                <strong>{formatDateTime(post.collectionDeadline)}</strong>. Show this code to canteen staff and pay <strong>{priceInfo.priceFormatted}</strong> on collection.
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

          {post.status === 'AVAILABLE' ? (
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isClaiming}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>{isClaiming ? 'Verifying Availability...' : `Claim Meal · ${priceInfo.priceFormatted}`}</span>
            </button>
          ) : isClaimedByMe ? (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Reserved for you. Pick up soon!
            </span>
          ) : post.status === 'CLAIMED' ? (
            <div className="text-xs font-bold text-amber-700 bg-amber-100 px-4 py-2 rounded-xl">
              Already Claimed {post.claimantName ? `by ${post.claimantName}` : ''}
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
                Confirm Food Collection Request
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                "Are you sure you want to claim this food? You should be able to collect it within the specified time."
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <div>
                <strong>Item:</strong> {post.foodName} ({post.quantity})
              </div>
              <div className="flex items-center justify-between text-emerald-900 font-bold bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                <span>Price to Pay at Canteen:</span>
                <span className="text-sm font-black text-emerald-700">{priceInfo.priceFormatted}</span>
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
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClaim}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-98"
              >
                Yes, Claim · {priceInfo.priceFormatted}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
