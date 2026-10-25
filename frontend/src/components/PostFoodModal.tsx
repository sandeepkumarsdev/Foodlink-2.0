import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  Clock, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  Image as ImageIcon, 
  Sparkles,
  Flame,
  Snowflake,
  Utensils,
  Tag
} from 'lucide-react';
import { User } from '../types';
import { PRESET_FOOD_IMAGES } from '../utils/helpers';

interface PostFoodModalProps {
  currentUser: User | null;
  onClose: () => void;
  onSubmit: (postData: any) => Promise<void>;
  isSubmitting: boolean;
}

export const PostFoodModal: React.FC<PostFoodModalProps> = ({
  currentUser,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [foodName, setFoodName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('20 portions');
  const [servingsCount, setServingsCount] = useState(20);
  const [price, setPrice] = useState('20');
  const [originalPrice, setOriginalPrice] = useState('60');
  const [location, setLocation] = useState(
    currentUser?.canteenName 
      ? `${currentUser.canteenName} Pickup Counter #1` 
      : 'Main Campus Dining Hall, Counter #2'
  );

  // Default deadline: 2.5 hours from now
  const defaultDeadline = new Date(Date.now() + 2.5 * 3600 * 1000).toISOString().slice(0, 16);
  const [collectionDeadline, setCollectionDeadline] = useState(defaultDeadline);

  const [imageUrl, setImageUrl] = useState(PRESET_FOOD_IMAGES[0].url);
  const [foodSafetyInfo, setFoodSafetyInfo] = useState(
    'Cooked fresh in commercial campus kitchen. Kept at hot holding temp >65°C. Safe to consume within 3 hours or refrigerate immediately.'
  );
  const [temperature, setTemperature] = useState<'HOT' | 'COLD' | 'ROOM_TEMP'>('HOT');
  const [dietaryTags, setDietaryTags] = useState<string[]>(['Vegetarian', 'Halal-Friendly']);
  const [error, setError] = useState<string | null>(null);

  const numPrice = parseFloat(price) || 0;
  const numOriginal = parseFloat(originalPrice) || 0;
  const discountPercent = numOriginal > numPrice && numOriginal > 0 
    ? Math.round(((numOriginal - numPrice) / numOriginal) * 100) 
    : 0;

  const availableTags = [
    'Vegetarian',
    'Vegan',
    'Halal-Friendly',
    'Gluten-Free',
    'Dairy-Free',
    'Nut-Free',
    'High-Protein',
  ];

  const handleToggleTag = (tag: string) => {
    if (dietaryTags.includes(tag)) {
      setDietaryTags(dietaryTags.filter((t) => t !== tag));
    } else {
      setDietaryTags([...dietaryTags, tag]);
    }
  };

  const setPresetDeadlineHours = (hours: number) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    setCollectionDeadline(d.toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!foodName.trim()) {
      setError('Please provide the food name');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a short description');
      return;
    }
    if (!quantity.trim()) {
      setError('Please provide the quantity/portions');
      return;
    }
    if (!location.trim()) {
      setError('Please specify the exact pickup location');
      return;
    }

    const numPrice = parseFloat(price) || 0;
    const numOriginal = parseFloat(originalPrice) || 0;

    try {
      await onSubmit({
        foodName,
        description,
        quantity,
        servingsCount,
        price: numPrice,
        originalPrice: numOriginal > 0 ? numOriginal : undefined,
        availableFrom: new Date().toISOString(),
        collectionDeadline: new Date(collectionDeadline).toISOString(),
        location,
        imageUrl,
        foodSafetyInfo,
        dietaryTags,
        temperature,
        userId: currentUser?.id,
        collegeName: currentUser?.college || 'Stanford Central Campus',
        canteenName: currentUser?.canteenName || 'Campus Main Canteen',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish post');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Publish Surplus Food</h2>
              <p className="text-xs text-emerald-100">
                Notify registered campus students of available safe food
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[calc(85vh-160px)] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Food Name & Image preview */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Food Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 20 Portions of Lemon Rice with Lentil Tadka"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Preset Photo Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Select High-Resolution Photo</span>
              <span className="text-[11px] font-normal text-slate-400">Click to choose image</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-2">
              {PRESET_FOOD_IMAGES.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setImageUrl(preset.url);
                    if (!foodName) setFoodName(preset.name);
                    setDietaryTags(preset.tags);
                  }}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                    imageUrl === preset.url
                      ? 'border-emerald-600 ring-2 ring-emerald-500/40 scale-105'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img src={preset.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Custom URL Option */}
            <input
              type="url"
              placeholder="Or paste custom image URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Description & Packaging Details *
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Freshly made for conference lunch, packed in sanitized containers with tamper seals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
            />
          </div>

          {/* Quantity & Servings count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Quantity Label *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 20 portions / 15 meal boxes"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Portions Count (for Impact Stats)
              </label>
              <input
                type="number"
                min={1}
                value={servingsCount}
                onChange={(e) => setServingsCount(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Affordable Surplus Meal Pricing */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-700" />
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Affordable Surplus Food Pricing
                </label>
              </div>
              {discountPercent > 0 && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                  {discountPercent}% OFF Campus Discount
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Selling Price for Students (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    required
                    placeholder="e.g. 20 (or 0 for Free)"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full text-xs pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-emerald-500 font-bold text-emerald-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Regular Menu Price (₹) <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    placeholder="e.g. 60 (Original canteen price)"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="w-full text-xs pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-emerald-500 font-medium text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Quick Price Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-100">
              <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setPrice('0'); setOriginalPrice(''); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    numPrice === 0 
                      ? 'bg-emerald-700 text-white' 
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  Free (₹0)
                </button>
                <button
                  type="button"
                  onClick={() => { setPrice('15'); setOriginalPrice('45'); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    numPrice === 15 
                      ? 'bg-emerald-700 text-white' 
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  ₹15
                </button>
                <button
                  type="button"
                  onClick={() => { setPrice('20'); setOriginalPrice('60'); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    numPrice === 20 
                      ? 'bg-emerald-700 text-white' 
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  ₹20
                </button>
                <button
                  type="button"
                  onClick={() => { setPrice('30'); setOriginalPrice('80'); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    numPrice === 30 
                      ? 'bg-emerald-700 text-white' 
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  ₹30
                </button>
              </div>
            </div>

            <p className="text-[11px] text-emerald-800 leading-snug">
              💡 <strong>Note:</strong> Students will see this price when claiming and pay at the canteen counter upon picking up their food with their verification code.
            </p>
          </div>

          {/* Collection Deadline */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Collection Deadline *
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPresetDeadlineHours(1.5)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                >
                  +1.5h
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDeadlineHours(3)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                >
                  +3h
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDeadlineHours(5)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                >
                  +5h
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              required
              value={collectionDeadline}
              onChange={(e) => setCollectionDeadline(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium cursor-pointer"
            />
          </div>

          {/* Collection Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Specific Collection Location / Counter *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tresidder Union 2nd Floor Dining Counter #3 (Ask for Chef Marco)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
            />
          </div>

          {/* Temperature & Dietary Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Food Holding Temperature
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTemperature('HOT')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-colors flex flex-col items-center gap-1 ${
                    temperature === 'HOT'
                      ? 'bg-orange-50 border-orange-400 text-orange-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>Hot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemperature('COLD')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-colors flex flex-col items-center gap-1 ${
                    temperature === 'COLD'
                      ? 'bg-cyan-50 border-cyan-400 text-cyan-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Snowflake className="w-4 h-4 text-cyan-500" />
                  <span>Chilled</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemperature('ROOM_TEMP')}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-colors flex flex-col items-center gap-1 ${
                    temperature === 'ROOM_TEMP'
                      ? 'bg-amber-50 border-amber-400 text-amber-800'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Utensils className="w-4 h-4 text-amber-500" />
                  <span>Ambient</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Dietary & Allergen Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      dietaryTags.includes(tag)
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Food Safety Advisory */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Food Safety & Hygiene Instructions *
            </label>
            <textarea
              required
              rows={2}
              value={foodSafetyInfo}
              onChange={(e) => setFoodSafetyInfo(e.target.value)}
              className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-500 font-medium"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Publishing Post...' : 'Publish Surplus Post Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
