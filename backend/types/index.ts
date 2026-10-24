export type UserType = 'USER' | 'COLLEGE' | 'ADMIN';

export type FoodStatus = 'AVAILABLE' | 'CLAIMED' | 'COLLECTED' | 'EXPIRED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: UserType;
  college: string;
  canteenName?: string;
  isVerified?: boolean;
  avatarUrl?: string;
  hasPassword?: boolean;
  createdAt: string;
}

export interface College {
  id: string;
  collegeName: string;
  canteenName: string;
  location: string;
  authorizedUserId?: string;
  contactPhone?: string;
  isVerified: boolean;
}

export interface FoodPost {
  id: string;
  collegeId: string;
  canteenId: string;
  collegeName: string;
  canteenName: string;
  foodName: string;
  description: string;
  quantity: string;
  servingsCount: number;
  imageUrl: string;
  availableFrom: string;
  collectionDeadline: string;
  location: string;
  status: FoodStatus;
  claimedBy?: string;
  claimantName?: string;
  claimantPhone?: string;
  claimCode?: string;
  claimedAt?: string;
  collectedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  foodSafetyInfo: string;
  dietaryTags: string[];
  temperature?: 'HOT' | 'COLD' | 'ROOM_TEMP';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  foodPostId?: string;
  title: string;
  message: string;
  type: 'NEW_FOOD' | 'CLAIM_SUCCESS' | 'FOOD_CLAIMED' | 'CLAIM_CANCELLED' | 'FOOD_COLLECTED' | 'DEADLINE_WARNING' | 'SYSTEM';
  read: boolean;
  createdAt: string;
}

export interface Claim {
  id: string;
  foodPostId: string;
  userId: string;
  userName: string;
  userPhone: string;
  status: 'CLAIMED' | 'COLLECTED' | 'CANCELLED';
  claimCode: string;
  claimedAt: string;
  collectedAt?: string;
}

export interface RealtimeEvent {
  type: 'FOOD_CREATED' | 'FOOD_CLAIMED' | 'FOOD_COLLECTED' | 'FOOD_CANCELLED' | 'FOOD_EXPIRED' | 'NOTIFICATION';
  foodPost?: FoodPost;
  foodPostId?: string;
  claimedBy?: string;
  notification?: NotificationItem;
  timestamp: string;
}

export interface DashboardStats {
  totalFoodPosts: number;
  portionsRedistributed: number;
  foodSuccessfullyCollected: number;
  expiredPosts: number;
  activeAvailablePosts: number;
  co2SavedKg: number;
  mealsSaved: number;
}
