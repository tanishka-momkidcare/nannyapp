import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Text} from 'react-native';
import type {AppStackParamList} from './src/navigation/types';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <Button
      title="Go to Jane's profile"
      onPress={() => navigation.navigate('Home')}
    />
  );
}