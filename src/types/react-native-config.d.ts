declare module 'react-native-config' {
  export interface NativeConfig {
    GOOGLE_MAPS_API_KEY?: string;
    API_BASE_URL?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
