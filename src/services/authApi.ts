/**
 * Auth API Client (No auth token required)
 *
 * Communicates with the vendor-auth backend endpoints:
 *  - POST /api/v1/vendor/auth/send-otp
 *  - POST /api/v1/vendor/auth/verify-otp
 */

import Axios from './Axios';
import {config1} from '../constants/config';

// ─── Vendor Home ─────────────────────────────────────────────────────────────

export interface VendorHomeLocation {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  locationType: string;
  isActive: boolean;
}

export interface VendorHomeData {
  vendor: {
    id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    email?: string;
  };
  primaryLocation: VendorHomeLocation | null;
  secondaryLocations: VendorHomeLocation[];
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

interface VerifyOtpResponse {
  token: string;
  vendor: {
    id: string;
    mobile: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface LoginLocation {
  latitude: number;
  longitude: number;
  area?: string;
  accuracy?: number;
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  const { data } = await Axios.post<ApiResponse<T>>(`${config1.API_HOST}${path}`, body);

  if (!data.success) {
    throw new Error(data.message || 'API error');
  }

  return data;
}

/** Send OTP to the given mobile number. */
export async function sendOtp(mobile: string): Promise<void> {
  await request('/api/v1/vendor/auth/send-otp', { mobile });
}

/** Verify OTP and get auth token + vendor info. Optionally sends login location. */
export async function verifyOtp(
  mobile: string,
  otp: string,
  location?: LoginLocation,
): Promise<VerifyOtpResponse> {
  const body: Record<string, unknown> = { mobile, otp };
  if (location) {
    body.location = location;
  }

  const res = await request<VerifyOtpResponse>('/api/v1/vendor/auth/verify-otp', body);

  if (!res.data) {
    throw new Error('Invalid server response');
  }

  return res.data;
}

// ─── Vendor Home ──────────────────────────────────────────────────────────────

export async function fetchVendorHome(): Promise<VendorHomeData> {
  const { data } = await Axios.get<ApiResponse<VendorHomeData>>(
    `${config1.API_HOST}/api/v1/vendor/home`,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message || 'Failed to load home data');
  }

  return data.data;
}
