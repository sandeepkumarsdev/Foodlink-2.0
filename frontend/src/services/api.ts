import { FoodPost, User, NotificationItem, RealtimeEvent, DashboardStats } from '../types';

export const api = {
  // Food Posts
  async getFoodPosts(params?: { college?: string; status?: string; search?: string }): Promise<FoodPost[]> {
    const query = new URLSearchParams();
    if (params?.college) query.set('college', params.college);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`/api/food-posts?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch food posts');
    return res.json();
  },

  async getFoodPost(id: string): Promise<FoodPost> {
    const res = await fetch(`/api/food-posts/${id}`);
    if (!res.ok) throw new Error('Failed to fetch food post details');
    return res.json();
  },

  async createFoodPost(postData: any): Promise<FoodPost> {
    const res = await fetch('/api/food-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create food post');
    return data;
  },

  // Atomic Claim Endpoint
  async claimFood(id: string, user: { id: string; name: string; phone?: string }, portions: number = 1): Promise<{
    success: boolean;
    message: string;
    foodPost: FoodPost;
    claim: any;
  }> {
    const res = await fetch(`/api/food-posts/${id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
        portions,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.error || 'Failed to claim food';
      const error = new Error(errorMsg) as any;
      error.status = res.status;
      error.claimedBy = data.claimedBy;
      throw error;
    }
    return data;
  },

  async markCollected(id: string, verifiedCode?: string, claimId?: string): Promise<{ success: boolean; foodPost: FoodPost }> {
    const res = await fetch(`/api/food-posts/${id}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifiedCode, claimId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to mark as collected');
    return data;
  },

  async getMyClaims(userId: string): Promise<FoodPost[]> {
    const res = await fetch(`/api/claims/my-claims?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch user claims');
    return res.json();
  },

  async cancelPost(id: string, reason?: string): Promise<{ success: boolean; foodPost: FoodPost }> {
    const res = await fetch(`/api/food-posts/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to cancel post');
    return data;
  },

  async unclaimFood(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/food-posts/${id}/unclaim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to release claim');
    return data;
  },

  // Notifications
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  // Auth / Users
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async login(email: string, password?: string, role?: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to login');
    return data;
  },

  async sendVerificationCode(email: string): Promise<{ success: boolean; message: string; isEmailConfigured: boolean; previewCode?: string }> {
    const res = await fetch('/api/auth/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
    return data;
  },

  async verifyCode(email: string, code: string): Promise<{ success: boolean; verified: boolean; message: string }> {
    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid or expired verification code');
    return data;
  },

  async register(userData: any): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register');
    return data;
  },

  async setPassword(payload: { userId: string; currentPassword?: string; newPassword: string }): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update password');
    return data;
  },

  async updateProfilePicture(userId: string, avatarUrl: string): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch(`/api/users/${userId}/avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile picture');
    return data;
  },

  async googleAuth(payload: {
    email: string;
    name?: string;
    avatarUrl?: string;
    userType?: string;
    college?: string;
    canteenName?: string;
  }): Promise<{ user: User; token: string; isNew: boolean }> {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to authenticate with Google');
    return data;
  },

  async toggleCanteenVerification(userId: string): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`/api/users/${userId}/verify-canteen`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle verification');
    return data;
  },

  // Stats
  async getStats(collegeName?: string, canteenName?: string): Promise<DashboardStats> {
    const query = new URLSearchParams();
    if (collegeName) query.set('collegeName', collegeName);
    if (canteenName) query.set('canteenName', canteenName);
    const res = await fetch(`/api/stats?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // Concurrency Race Simulation
  async runRaceSimulation(foodPostId?: string): Promise<any> {
    const res = await fetch('/api/test/race-condition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodPostId }),
    });
    return res.json();
  },

  // Reset Demo
  async resetDemo(): Promise<void> {
    await fetch('/api/reset-demo', { method: 'POST' });
  }
};
