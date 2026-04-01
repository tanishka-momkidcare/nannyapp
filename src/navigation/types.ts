export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  OTPVerification: {phone: string};
  LocationPermission: undefined;
  LocationSelection: {latitude: number; longitude: number; selectedArea?: string};
  AreaSearch: {latitude: number; longitude: number};
};

export type AppStackParamList = {
  Home: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
};
