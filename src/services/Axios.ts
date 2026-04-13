import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@nannyapp_auth_token';

const Axios = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach auth token ──────────────────────────────────
Axios.interceptors.request.use(async (reqConfig) => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// ─── Response interceptor: unwrap data, handle errors ────────────────────────
Axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired / invalid — callers can handle this
      if (__DEV__) console.warn('[Axios] 401 Unauthorized');
    }
    return Promise.reject(error);
  },
);

export default Axios;
