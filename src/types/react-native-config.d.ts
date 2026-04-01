declare module 'react-native-config' {
  export interface NativeConfig {
    GOOGLE_MAPS_API_KEY?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
