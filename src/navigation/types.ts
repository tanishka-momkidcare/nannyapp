export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  OTPVerification: {phone: string};
  LocationPermission: undefined;
  LocationSelection: {latitude: number; longitude: number; selectedArea?: string};
  AreaSearch: {latitude: number; longitude: number};
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
};

export type OnboardingStackParamList = {
  Welcome: undefined;
};
