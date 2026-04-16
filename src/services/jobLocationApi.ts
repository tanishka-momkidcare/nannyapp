/**
 * Job Location API Client
 *
 * Wraps the /api/v1/job-location endpoints:
 *  - POST   /api/v1/job-location      — create a job location record
 *  - PATCH  /api/v1/job-location/:id  — partially update a record
 */

import Axios from './Axios';
import {config1} from '../constants/config';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LocationType = 'HOME' | 'OFFICE' | 'OTHER';

export interface JobLocation {
  _id: string;
  vendorId: string;
  clientId?: string;
  jobId?: string;
  latitude: number;
  longitude: number;
  address: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  locationType: LocationType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddJobLocationParams {
  vendorId: string;
  latitude: number;
  longitude: number;
  address: string;
  clientId?: string;
  jobId?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  locationType?: LocationType;
}

export interface UpdateJobLocationParams {
  latitude?: number;
  longitude?: number;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  locationType?: LocationType;
  isActive?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Add Job Locations (bulk) ────────────────────────────────────────────────

/**
 * Add one or more job location records in a single request (max 50).
 * Pass a single object or an array — both are accepted.
 */
export async function addJobLocation(
  params: AddJobLocationParams | AddJobLocationParams[],
): Promise<JobLocation[]> {
  const locations = Array.isArray(params) ? params : [params];

  const {data} = await Axios.post<ApiResponse<JobLocation[]>>(
    `${config1.API_HOST}/api/v1/job-location`,
    {locations},
  );

  if (!data.success) {
    throw new Error(data.message || 'Failed to add job location');
  }

  return data.data;
}

// ─── Update Job Location ─────────────────────────────────────────────────────

export async function updateJobLocation(
  id: string,
  params: UpdateJobLocationParams,
): Promise<JobLocation> {
  const {data} = await Axios.patch<ApiResponse<JobLocation>>(
    `${config1.API_HOST}/api/v1/job-location/${id}`,
    params,
  );

  if (!data.success) {
    throw new Error(data.message || 'Failed to update job location');
  }

  return data.data;
}
