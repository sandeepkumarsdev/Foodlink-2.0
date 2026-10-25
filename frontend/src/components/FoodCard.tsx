import React from 'react';
import { 
  Clock, 
  MapPin, 
  Building2, 
  CheckCircle, 
  AlertCircle, 
  Flame, 
  Snowflake, 
  Utensils, 
  ShieldCheck, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { FoodPost, User } from '../types';
import { formatTimeRemaining, formatDateTime, formatFoodPrice } from '../utils/helpers';

interface FoodCardProps {
  post: FoodPost;
  currentUser: User | null;
  onClaimClick: (post: FoodPost) => void;
  onViewDetails: (post: FoodPost) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({
  post,
  currentUser,
  onClaimClick,
  onViewDetails,
}) => {
  const timeInfo = formatTimeRemaining(post.collectionDeadline);
  const priceInfo = formatFoodPrice(post.price, post.originalPrice);
  const myClaim = currentUser && post.claims 
    ? post.claims.find(c => c.userId === currentUser.id && c.status === 'CLAIMED')
    : undefined;
  const isClaimedByMe = Boolean(myClaim || (currentUser && post.claimedBy === currentUser.id));

  const remaining = post.remainingServings !== undefined ? post.remainingServings : (post.servingsCount || 1);
  const quantityDisplay = post.remainingServings !== undefined 
    ? (remaining > 0 ? `${remaining} portions left` : 'Fully Claimed')
    : post.quantity;

  // Status styling configurations
  const statusConfig = {
    AVAILABLE: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'AVAILABLE',
      icon: CheckCircle,
    },
    CLAIMED: {
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
      dot: 'bg-amber-500',
      label: 'CLAIMED',
      icon: AlertCircle,
    },
    COLLECTED: {
      badge: 'bg-blue-100 text-blue-900 border-blue-200',
      dot: 'bg-blue-500',
      label: 'COLLECTED',
      icon: CheckCircle,
    },
    EXPIRED: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      label: 'EXPIRED',
      icon: Clock,
    },
    CANCELLED: {
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      dot: 'bg-rose-500',
      label: 'CANCELLED',
      icon: AlertCircle,
    },
  }[post.status] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    label: post.status,
    icon: Clock,
  };

  return (
    <div 
      className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col h-full hover:shadow-lg ${
        isClaimedByMe 
          ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-md' 
          : post.status === 'AVAILABLE'
            ? 'border-slate-200/80 hover:border-emerald-300'
            : 'border-slate-200 opacity-90'
      }`}
    >
      {/* Top Image & Badges */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onViewDetails(post)}>
        <img
          src={post.imageUrl}
          alt={post.foodName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Status Pill Badge & Price Pill */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs backdrop-blur-md ${statusConfig.badge}`}>
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${post.status === 'AVAILABLE' ? 'animate-pulse' : ''}`} />
            {isClaimedByMe ? `YOUR CLAIM (${myClaim?.portions || post.claimedPortions || 1})` : statusConfig.label}
          </span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-950/80 text-white backdrop-blur-md shadow-xs border border-white/10">
            <span className="text-xs font-black text-amber-300">{priceInfo.priceFormatted}</span>
            <span className="text-[10px] text-slate-300 font-normal">/ portion</span>
            {priceInfo.originalPriceFormatted && (
              <span className="text-[10px] text-slate-400 line-through">{priceInfo.originalPriceFormatted}</span>
            )}
            {priceInfo.discountPercent && (
              <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">
                {priceInfo.discountPercent}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Temperature Badge */}
        {post.temperature && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-black/60 text-white backdrop-blur-md">
              {post.temperature === 'HOT' && <Flame className="w-3 h-3 text-orange-400" />}
              {post.temperature === 'COLD' && <Snowflake className="w-3 h-3 text-cyan-300" />}
              {post.temperature === 'ROOM_TEMP' && <Utensils className="w-3 h-3 text-amber-200" />}
              <span>{post.temperature === 'ROOM_TEMP' ? 'Ambient' : post.temperature}</span>
            </span>
          </div>
        )}

        {/* Quantity Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-600/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-xs">
            <Sparkles className="w-3 h-3" />
            {quantityDisplay}
          </span>

          {/* Time Remaining Pill */}
          {post.status === 'AVAILABLE' && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-md shadow-xs ${
              timeInfo.isUrgent ? 'bg-rose-600/90 text-white animate-pulse' : 'bg-black/60 text-white'
            }`}>
              <Clock className="w-3 h-3" />
              {timeInfo.text}
            </span>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Canteen & College */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate font-semibold text-slate-700">{post.canteenName}</span>
            <span>·</span>
            <span className="truncate text-slate-500">{post.collegeName.split(' ')[0]}</span>
          </div>

          {/* Food Title */}
          <h3 
            onClick={() => onViewDetails(post)}
            className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 cursor-pointer mb-1.5"
          >
            {post.foodName}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
            {post.description}
          </p>

          {/* Dietary Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.dietaryTags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100"
              >
                {tag}
              </span>
            ))}
            {post.dietaryTags.length > 3 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                +{post.dietaryTags.length - 3}
              </span>
            )}
          </div>

          {/* Pickup Location */}
          <div className="flex items-start gap-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="line-clamp-2">
              <span className="font-semibold text-slate-700">Pickup: </span>
              {post.location}
            </div>
          </div>
        </div>

        {/* Action Button Area with Price */}
        <div className="pt-2.5 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-slate-900">{priceInfo.priceFormatted}</span>
              {priceInfo.originalPriceFormatted && (
                <span className="text-[11px] text-slate-400 line-through font-medium">{priceInfo.originalPriceFormatted}</span>
              )}
              {priceInfo.discountPercent && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  {priceInfo.discountPercent}% OFF
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Pay on collection</span>
          </div>

          {post.status === 'AVAILABLE' && remaining > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onClaimClick(post)}
                className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
              >
                <span>Claim Portions · {priceInfo.priceFormatted}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewDetails(post)}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                title="View full details and select portions"
              >
                <Utensils className="w-4 h-4" />
              </button>
            </div>
          ) : isClaimedByMe ? (
            <button
              onClick={() => onViewDetails(post)}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Reserved ({myClaim?.portions || post.claimedPortions || 1} portions) · Code: {myClaim?.claimCode || post.claimCode || 'View'}</span>
            </button>
          ) : post.status === 'CLAIMED' || remaining <= 0 ? (
            <div className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 text-center flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>All Portions Claimed</span>
            </div>
          ) : post.status === 'COLLECTED' ? (
            <div className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 text-center flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span>Successfully Collected</span>
            </div>
          ) : (
            <div className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 text-center">
              Post Expired / Unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
