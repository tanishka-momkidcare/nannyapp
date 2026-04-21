export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  OTPVerification: {phone: string};
};

export type BottomTabParamList = {
  Home: undefined;
  Jobs: undefined;
  IDCard: undefined;
  Course: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  LocationPermission: undefined;
  JobLocationSetup: undefined;
  MainTabs: undefined;
  ProfileSettings: undefined;
  EditLocation: undefined;
  LocationDebug: undefined;
  CreateShift: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
};
