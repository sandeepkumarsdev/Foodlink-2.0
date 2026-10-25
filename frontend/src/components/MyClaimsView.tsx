import React from 'react';
import { 
  ShoppingBag, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Building2, 
  QrCode, 
  RotateCcw, 
  ArrowRight,
  Sparkles,
  AlertCircle,
  Tag
} from 'lucide-react';
import { FoodPost, User } from '../types';
import { formatTimeRemaining, formatDateTime, formatFoodPrice } from '../utils/helpers';

interface MyClaimsViewProps {
  currentUser: User | null;
  foodPosts: FoodPost[];
  onViewDetails: (post: FoodPost) => void;
  onBrowseFood: () => void;
  onUnclaim: (post: FoodPost) => Promise<void>;
}

export const MyClaimsView: React.FC<MyClaimsViewProps> = ({
  currentUser,
  foodPosts,
  onViewDetails,
  onBrowseFood,
  onUnclaim,
}) => {
  if (!currentUser) return null;

  // Filter posts where claimedBy === currentUser.id
  const myPosts = foodPosts.filter((p) => p.claimedBy === currentUser.id);
  const activeClaims = myPosts.filter((p) => p.status === 'CLAIMED');
  const collectedClaims = myPosts.filter((p) => p.status === 'COLLECTED');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-emerald-600" />
            <span>My Food Claims & Pickup Passes</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track your reserved campus meals, show your pickup codes, and monitor collection deadlines.
          </p>
        </div>

        <button
          onClick={onBrowseFood}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors self-start sm:self-center"
        >
          <span>Browse Available Food</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Active Claims Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Active Reservations Awaiting Pickup
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
              {activeClaims.length} Active
            </span>
          </div>
        </div>

        {activeClaims.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-700">No active claims right now</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Whenever you claim surplus food from any campus canteen, your digital pickup voucher will appear here.
            </p>
            <button
              onClick={onBrowseFood}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
            >
              Explore Available Surplus Meals
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeClaims.map((post) => {
              const timeInfo = formatTimeRemaining(post.collectionDeadline);
              const priceInfo = formatFoodPrice(post.price, post.originalPrice);
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border-2 border-emerald-400/80 shadow-md p-5 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none" />

                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                            Pickup Code Ready
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                            <Tag className="w-3 h-3 text-amber-600" />
                            {priceInfo.priceFormatted}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 line-clamp-1">
                          {post.foodName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{post.canteenName}</span>
                        </div>
                      </div>

                      {/* Pickup Ticket Badge */}
                      <div className="text-right shrink-0 bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xs">
                        <span className="block text-[9px] uppercase tracking-wider text-slate-300 font-bold">
                          Pickup Code
                        </span>
                        <span className="font-mono text-lg font-black text-amber-300">
                          {post.claimCode || 'FL-PASS'}
                        </span>
                      </div>
                    </div>

                    {/* Quantity, Price Due & Deadline */}
                    <div className="grid grid-cols-3 gap-2 my-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Quantity:</span>
                        <span className="font-bold text-slate-800">{post.quantity}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Pay at Counter:</span>
                        <span className="font-black text-emerald-700">{priceInfo.priceFormatted}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Collect Before:</span>
                        <span className={`font-bold ${timeInfo.isUrgent ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                          {timeInfo.text}
                        </span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-1.5 text-xs text-slate-600 mb-4">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800">Location: </span>
                        {post.location}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => onViewDetails(post)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>View Full Voucher</span>
                    </button>

                    <button
                      onClick={() => onUnclaim(post)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors text-xs font-semibold"
                      title="Release claim so another student can collect"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collected History Section */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Past Collected Meals History
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
            {collectedClaims.length} Rescued
          </span>
        </div>

        {collectedClaims.length === 0 ? (
          <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-200">
            No completed collections yet. Once the canteen marks your food as collected, it will appear here in your food rescue history!
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {collectedClaims.map((post) => (
              <div key={post.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{post.foodName}</h4>
                    <p className="text-xs text-slate-500">
                      {post.canteenName} · {post.quantity} · <span className="font-semibold text-emerald-700">{formatFoodPrice(post.price, post.originalPrice).priceFormatted}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Handover Completed
                  </span>
                  <span className="text-xs text-slate-400">
                    {post.collectedAt ? formatDateTime(post.collectedAt) : 'Recently'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
