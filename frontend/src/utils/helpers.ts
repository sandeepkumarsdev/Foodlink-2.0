export function formatTimeRemaining(deadlineIso: string): { text: string; isUrgent: boolean; isExpired: boolean } {
  const diff = new Date(deadlineIso).getTime() - Date.now();
  if (diff <= 0) {
    return { text: 'Expired', isUrgent: false, isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return {
      text: `${hours}h ${minutes}m left`,
      isUrgent: hours < 1,
      isExpired: false,
    };
  }

  return {
    text: `${minutes}m left`,
    isUrgent: minutes < 30,
    isExpired: false,
  };
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export const PRESET_FOOD_IMAGES = [
  {
    name: 'Fragrant Rice & Dal',
    url: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80',
    tags: ['Vegetarian', 'Vegan', 'Gluten-Free'],
  },
  {
    name: 'Artisan Sandwiches & Salad',
    url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
    tags: ['Vegetarian Option', 'Halal-Friendly'],
  },
  {
    name: 'Pasta Primavera',
    url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80',
    tags: ['Vegetarian'],
  },
  {
    name: 'Herb Roast Chicken & Veggies',
    url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80',
    tags: ['High-Protein', 'Halal-Friendly'],
  },
  {
    name: 'Fresh Salad & Grain Bowl',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    tags: ['Vegan', 'Gluten-Free'],
  },
  {
    name: 'Morning Bakery & Pastries',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    tags: ['Vegetarian'],
  },
  {
    name: 'Steamed Dumplings & Bao',
    url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
    tags: ['Vegetarian Option'],
  },
  {
    name: 'Noodle Soup / Stir Fry',
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    tags: ['Nut-Free'],
  },
];

export const CAMPUS_OPTIONS = [
  'All Campuses',
  'Stanford Central Campus',
  'UC Berkeley Campus',
  'MIT Campus Dining',
  'Texas A&M Commons',
];

export function formatFoodPrice(price?: number, originalPrice?: number): {
  isFree: boolean;
  priceFormatted: string;
  originalPriceFormatted?: string;
  discountPercent?: number;
} {
  const p = typeof price === 'number' ? price : (price !== undefined && price !== null ? parseFloat(String(price)) : 0);
  if (isNaN(p) || p <= 0) {
    return {
      isFree: true,
      priceFormatted: 'Free / ₹0',
    };
  }

  const op = typeof originalPrice === 'number' ? originalPrice : (originalPrice ? parseFloat(String(originalPrice)) : undefined);
  let discountPercent: number | undefined;
  if (op && op > p) {
    discountPercent = Math.round(((op - p) / op) * 100);
  }

  const formattedMain = `₹${p % 1 === 0 ? p : p.toFixed(2)}`;
  const formattedOriginal = op && op > p ? `₹${op % 1 === 0 ? op : op.toFixed(2)}` : undefined;

  return {
    isFree: false,
    priceFormatted: formattedMain,
    originalPriceFormatted: formattedOriginal,
    discountPercent,
  };
}
