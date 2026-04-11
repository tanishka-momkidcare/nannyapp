export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  OTPVerification: {phone: string};
  LocationPermission: {phone: string; otp: string};
  LocationSelection: {phone: string; otp: string; latitude: number; longitude: number; selectedArea?: string};
  AreaSearch: {phone: string; otp: string; latitude: number; longitude: number};
};

export type BottomTabParamList = {
  Home: undefined;
  Jobs: undefined;
  IDCard: undefined;
  Course: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  ProfileSettings: undefined;
  LocationDebug: undefined;
  CreateShift: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
};
