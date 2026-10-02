/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'Inventory Manager' | 'Blood Bank Supervisor' | 'Trauma Operations Lead' | 'Phlebotomy Specialist';
  hospitalId: string;
  hospitalName: string;
  licenseNo: string;
  createdAt: string;
}

export interface BackendDonationRecord {
  donationId: string;
  bagId: number;
  bagBarcode: string;
  donorId: string;
  donorName: string;
  donorBloodGroup: string;
  donorWeightKg?: number;
  donorHemoglobinGdl?: number;
  component: string;
  volumeMl: number;
  facilityId: string;
  facilityName: string;
  storageLocation: string;
  collectionDate: string;
  expirationDate: string;
  testedClear: boolean;
  temperatureAlert: boolean;
  phlebotomistStaffId: string;
  phlebotomistStaffName: string;
  notes?: string;
  status: 'available' | 'reserved' | 'in_transit' | 'transfused' | 'quarantined' | 'discarded';
  createdAt: string;
}

export interface DispatchedEmailInfo {
  id: string;
  to: string;
  from: string;
  subject: string;
  otp: string;
  confirmationToken: string;
  confirmationUrl: string;
  sentAt: string;
  expiresInMinutes: number;
  purpose: 'login' | 'register';
  securityMetadata: {
    ip: string;
    browser: string;
    facilityContext: string;
  };
}

export type AuthLoginResponse =
  | { requiresOtp?: false; user: StaffUser; token: string; message?: string }
  | {
      requiresOtp: true;
      verificationId: string;
      email: string;
      purpose: 'login' | 'register';
      expiresIn: number;
      message: string;
      dispatchedEmail: DispatchedEmailInfo;
    };

export interface MongoStatus {
  connected: boolean;
  configured: boolean;
  dbName: string;
  driver: string;
  sanitizedUri: string | null;
  collections: {
    donations: number;
    staffUsers: number;
    sessions: number;
  };
  error?: string | null;
  mode: 'mongodb_cluster' | 'file_backed_mirror';
}

const TOKEN_KEY = 'hemasync_staff_token';
const USER_KEY = 'hemasync_staff_user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  getCachedUser(): StaffUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setCachedUser(user: StaffUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  removeCachedUser() {
    localStorage.removeItem(USER_KEY);
  },
};

export const api = {
  // Staff Auth
  async login(email: string, password: string, bypassOtp?: boolean): Promise<AuthLoginResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, bypassOtp }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Authentication failed');
    }

    const data: AuthLoginResponse = await res.json();
    if (!data.requiresOtp && 'token' in data && 'user' in data) {
      authStorage.setToken(data.token);
      authStorage.setCachedUser(data.user);
    }
    return data;
  },

  async register(staffData: {
    name: string;
    email: string;
    password: string;
    role: string;
    hospitalId: string;
    hospitalName?: string;
    licenseNo?: string;
  }): Promise<AuthLoginResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }

    const data: AuthLoginResponse = await res.json();
    if (!data.requiresOtp && 'token' in data && 'user' in data) {
      authStorage.setToken(data.token);
      authStorage.setCachedUser(data.user);
    }
    return data;
  },

  async verifyOtp(params: {
    verificationId?: string;
    email?: string;
    otp?: string;
    confirmationToken?: string;
    confirmationAccepted?: boolean;
  }): Promise<{ user: StaffUser; token: string; message: string }> {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Verification failed' }));
      throw new Error(err.error || 'Verification failed');
    }

    const data = await res.json();
    authStorage.setToken(data.token);
    authStorage.setCachedUser(data.user);
    return data;
  },

  async resendOtp(verificationId: string): Promise<{ success: boolean; message: string; dispatchedEmail: DispatchedEmailInfo }> {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Resend failed' }));
      throw new Error(err.error || 'Could not resend OTP');
    }

    return res.json();
  },

  async getLatestEmail(email?: string): Promise<{ email: DispatchedEmailInfo | null }> {
    const q = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`/api/auth/latest-email${q}`);
    if (!res.ok) return { email: null };
    return res.json();
  },

  async getMe(): Promise<StaffUser | null> {
    const token = authStorage.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        authStorage.removeToken();
        authStorage.removeCachedUser();
        return null;
      }

      const data = await res.json();
      authStorage.setCachedUser(data.user);
      return data.user;
    } catch (err) {
      console.warn('Backend reach error, using cached staff user if present', err);
      return authStorage.getCachedUser();
    }
  },

  async logout(): Promise<void> {
    const token = authStorage.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.warn('Logout API failed, continuing local clear', err);
      }
    }
    authStorage.removeToken();
    authStorage.removeCachedUser();
  },

  async getStaffDirectory(): Promise<StaffUser[]> {
    try {
      const res = await fetch('/api/auth/staff');
      if (!res.ok) return [];
      const data = await res.json();
      return data.staff || [];
    } catch {
      return [];
    }
  },

  // Backend Donations
  async fetchDonations(filters?: {
    facilityId?: string;
    donorId?: string;
    bloodGroup?: string;
  }): Promise<BackendDonationRecord[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.facilityId) params.append('facilityId', filters.facilityId);
      if (filters?.donorId) params.append('donorId', filters.donorId);
      if (filters?.bloodGroup) params.append('bloodGroup', filters.bloodGroup);

      const res = await fetch(`/api/donations?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.donations || [];
    } catch (err) {
      console.warn('Failed to fetch backend donations:', err);
      return [];
    }
  },

  async storeDonation(donationDetails: {
    donorId?: string;
    donorName?: string;
    donorBloodGroup: string;
    donorWeightKg?: number;
    donorHemoglobinGdl?: number;
    component?: string;
    volumeMl?: number;
    facilityId: string;
    facilityName?: string;
    storageLocation?: string;
    collectionDate?: string;
    expirationDate?: string;
    testedClear?: boolean;
    temperatureAlert?: boolean;
    phlebotomistStaffId?: string;
    phlebotomistStaffName?: string;
    notes?: string;
  }): Promise<BackendDonationRecord> {
    const res = await fetch('/api/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donationDetails),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to record donation' }));
      throw new Error(err.error || 'Donation intake failed at backend');
    }

    const data = await res.json();
    return data.record;
  },

  async updateDonationStatus(
    id: string | number,
    status: 'available' | 'reserved' | 'in_transit' | 'transfused' | 'quarantined' | 'discarded'
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/donations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // MongoDB Diagnostics
  async getMongoStatus(): Promise<MongoStatus> {
    try {
      const res = await fetch('/api/mongodb/status');
      if (!res.ok) throw new Error('Status request failed');
      return await res.json();
    } catch (err: any) {
      return {
        connected: false,
        configured: false,
        dbName: 'hemasync_db',
        driver: 'Official MongoDB Node.js Driver v7',
        sanitizedUri: null,
        collections: { donations: 0, staffUsers: 0, sessions: 0 },
        error: err.message,
        mode: 'file_backed_mirror',
      };
    }
  },
};
