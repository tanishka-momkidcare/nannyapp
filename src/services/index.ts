export { default as Axios } from './Axios';
export { locationTrackingEngine } from './location';
export { useLocationTracking } from '../hooks/useLocationTracking';
export { sendOtp, verifyOtp, fetchVendorHome } from './authApi';
export type { LoginLocation, VendorHomeData, VendorHomeLocation } from './authApi';
export { addJobLocation, updateJobLocation } from './jobLocationApi';
export type { JobLocation, AddJobLocationParams, UpdateJobLocationParams, LocationType } from './jobLocationApi'; // updateJobLocation kept for future use
