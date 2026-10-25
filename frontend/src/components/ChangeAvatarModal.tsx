import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Image as ImageIcon, 
  RotateCcw,
  Link as LinkIcon
} from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface ChangeAvatarModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

const PRESET_AVATARS = [
  { id: 'default', label: 'Default Avatar', url: '/default-avatar.png' },
  { id: 'student-1', label: 'Campus Student', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
  { id: 'student-2', label: 'Scholar', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80' },
  { id: 'chef-1', label: 'Campus Chef', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80' },
  { id: 'chef-2', label: 'Catering Lead', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80' },
  { id: 'eco-hero', label: 'Food Hero', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' },
];

export const ChangeAvatarModal: React.FC<ChangeAvatarModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const currentAvatar = currentUser.avatarUrl || '/default-avatar.png';
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatar);
  const [selectedPreset, setSelectedPreset] = useState<string>(
    PRESET_AVATARS.find(p => p.url === currentAvatar)?.id || ''
  );
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Process and downscale uploaded image file via Canvas to keep payload lean & snappy
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large. Please select an image under 10MB.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create an offscreen square canvas for ideal avatar proportions
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        const targetSize = Math.min(size, 400); // 400x400 max resolution
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Crop square from center
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewUrl(dataUrl);
          setSelectedPreset('');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof PRESET_AVATARS[0]) => {
    setPreviewUrl(preset.url);
    setSelectedPreset(preset.id);
    setError(null);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) {
      setError('Please paste a valid image URL');
      return;
    }
    setPreviewUrl(customUrlInput.trim());
    setSelectedPreset('');
    setError(null);
  };

  const handleResetToDefault = () => {
    setPreviewUrl('/default-avatar.png');
    setSelectedPreset('default');
    setCustomUrlInput('');
    setError(null);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.updateProfilePicture(currentUser.id, previewUrl);
      setSuccessMessage('Profile picture updated successfully!');
      onSuccess(res.user);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile picture. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 my-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-1">
            <Camera className="w-6 h-6 text-emerald-200" />
            <h2 className="text-xl font-black tracking-tight">Change Profile Picture</h2>
          </div>
          <p className="text-xs text-emerald-100">
            Upload your own photo or pick a campus avatar for your FoodLink account.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-180px)] overflow-y-auto">
          {/* Avatar Preview Section */}
          <div className="flex flex-col items-center justify-center space-y-3 pt-2">
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-emerald-500/30 shadow-xl bg-slate-100 relative">
                <img
                  src={previewUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  onError={() => {
                    setPreviewUrl('/default-avatar.png');
                    setError('Unable to load image. Reverted to default avatar.');
                  }}
                />
              </div>

              {/* Click to change trigger overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]"
                title="Upload New Photo"
              >
                <Camera className="w-6 h-6 mb-0.5" />
                <span className="text-[11px] font-bold">Upload</span>
              </button>

              {previewUrl !== currentAvatar && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-md">
                  Preview
                </span>
              )}
            </div>

            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-sm">{currentUser.name}</h3>
              <p className="text-xs text-slate-500">{currentUser.college}</p>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 font-bold">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Option 1: Upload from Device */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2.5 text-xs font-bold text-emerald-800 cursor-pointer group"
            >
              <Upload className="w-4 h-4 text-emerald-600 group-hover:-translate-y-0.5 transition-transform" />
              <span>Upload New Photo from Device</span>
            </button>
          </div>

          {/* Option 2: Quick Presets & Default Avatar */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Select Avatar or Reset to Default</span>
              </label>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                title="Reset avatar to the default user picture"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Default Picture</span>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = previewUrl === preset.url || selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`relative p-1 rounded-2xl border-2 transition-all flex flex-col items-center group cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 mb-1">
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 text-center line-clamp-1">
                      {preset.label}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option 3: Image Web Link (URL) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors mb-2"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{showUrlInput ? 'Hide Web Link Option' : 'Or paste an Image Web Link'}</span>
            </button>

            {showUrlInput && (
              <div className="flex items-center gap-2 animate-in fade-in duration-150">
                <input
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Preview
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || previewUrl === currentAvatar}
            className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md hover:shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Picture...' : 'Save Profile Picture'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
