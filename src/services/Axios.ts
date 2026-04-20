import axios, {AxiosError, InternalAxiosRequestConfig} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeviceEventEmitter} from 'react-native';
import {config1} from '../constants/config';

export const ACCESS_TOKEN_KEY = '@nannyapp_access_token';
export const REFRESH_TOKEN_KEY = '@nannyapp_refresh_token';
export const FORCE_SIGN_OUT_EVENT = 'FORCE_SIGN_OUT';

const Axios = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach access token + log ──────────────────────────
Axios.interceptors.request.use(async (reqConfig) => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  if (__DEV__) {
    console.log(`[API] ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`, reqConfig.data ?? '');
  }
  return reqConfig;
});

// ─── Token refresh queue ─────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({resolve, reject}) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

// ─── Response interceptor: log + auto-refresh on 401 ─────────────────────────
Axios.interceptors.response.use(
  response => {
    if (__DEV__) {
      console.log(`[API] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {_retry?: boolean};

    // Don't attempt refresh for auth endpoints (avoids infinite loops)
    const isAuthEndpoint = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue while a refresh is already in flight
        return new Promise((resolve, reject) => {
          failedQueue.push({resolve, reject});
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return Axios(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const storedRefresh = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (!storedRefresh) throw new Error('No refresh token');

        const {data} = await axios.post(
          `${config1.API_HOST}/api/v1/vendor/auth/refresh`,
          {refreshToken: storedRefresh},
          {headers: {'Content-Type': 'application/json'}},
        );

        if (!data.success) throw new Error(data.message || 'Token refresh failed');

        const newAccess: string = data.data.accessToken;
        const newRefresh: string = data.data.refreshToken;

        await AsyncStorage.multiSet([
          [ACCESS_TOKEN_KEY, newAccess],
          [REFRESH_TOKEN_KEY, newRefresh],
        ]);

        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return Axios(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
        DeviceEventEmitter.emit(FORCE_SIGN_OUT_EVENT);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default Axios;
