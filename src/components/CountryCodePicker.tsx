import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTheme} from '../context';
import {FontSizes} from '../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export type Country = {
  name: string;
  flag: string;
  code: string;
  dialCode: string;
};

const COUNTRIES: Country[] = [
  {name: 'Afghanistan', flag: '🇦🇫', code: 'AF', dialCode: '+93'},
  {name: 'Albania', flag: '🇦🇱', code: 'AL', dialCode: '+355'},
  {name: 'Algeria', flag: '🇩🇿', code: 'DZ', dialCode: '+213'},
  {name: 'American Samoa', flag: '🇦🇸', code: 'AS', dialCode: '+1684'},
  {name: 'Andorra', flag: '🇦🇩', code: 'AD', dialCode: '+376'},
  {name: 'Angola', flag: '🇦🇴', code: 'AO', dialCode: '+244'},
  {name: 'Anguilla', flag: '🇦🇮', code: 'AI', dialCode: '+1264'},
  {name: 'Antigua and Barbuda', flag: '🇦🇬', code: 'AG', dialCode: '+1268'},
  {name: 'Argentina', flag: '🇦🇷', code: 'AR', dialCode: '+54'},
  {name: 'Armenia', flag: '🇦🇲', code: 'AM', dialCode: '+374'},
  {name: 'Aruba', flag: '🇦🇼', code: 'AW', dialCode: '+297'},
  {name: 'Australia', flag: '🇦🇺', code: 'AU', dialCode: '+61'},
  {name: 'Austria', flag: '🇦🇹', code: 'AT', dialCode: '+43'},
  {name: 'Azerbaijan', flag: '🇦🇿', code: 'AZ', dialCode: '+994'},
  {name: 'Bahamas', flag: '🇧🇸', code: 'BS', dialCode: '+1242'},
  {name: 'Bahrain', flag: '🇧🇭', code: 'BH', dialCode: '+973'},
  {name: 'Bangladesh', flag: '🇧🇩', code: 'BD', dialCode: '+880'},
  {name: 'Barbados', flag: '🇧🇧', code: 'BB', dialCode: '+1246'},
  {name: 'Belarus', flag: '🇧🇾', code: 'BY', dialCode: '+375'},
  {name: 'Belgium', flag: '🇧🇪', code: 'BE', dialCode: '+32'},
  {name: 'Belize', flag: '🇧🇿', code: 'BZ', dialCode: '+501'},
  {name: 'Benin', flag: '🇧🇯', code: 'BJ', dialCode: '+229'},
  {name: 'Bermuda', flag: '🇧🇲', code: 'BM', dialCode: '+1441'},
  {name: 'Bhutan', flag: '🇧🇹', code: 'BT', dialCode: '+975'},
  {name: 'Bolivia', flag: '🇧🇴', code: 'BO', dialCode: '+591'},
  {name: 'Bosnia and Herzegovina', flag: '🇧🇦', code: 'BA', dialCode: '+387'},
  {name: 'Botswana', flag: '🇧🇼', code: 'BW', dialCode: '+267'},
  {name: 'Brazil', flag: '🇧🇷', code: 'BR', dialCode: '+55'},
  {name: 'Brunei', flag: '🇧🇳', code: 'BN', dialCode: '+673'},
  {name: 'Bulgaria', flag: '🇧🇬', code: 'BG', dialCode: '+359'},
  {name: 'Burkina Faso', flag: '🇧🇫', code: 'BF', dialCode: '+226'},
  {name: 'Burundi', flag: '🇧🇮', code: 'BI', dialCode: '+257'},
  {name: 'Cambodia', flag: '🇰🇭', code: 'KH', dialCode: '+855'},
  {name: 'Cameroon', flag: '🇨🇲', code: 'CM', dialCode: '+237'},
  {name: 'Canada', flag: '🇨🇦', code: 'CA', dialCode: '+1'},
  {name: 'Cape Verde', flag: '🇨🇻', code: 'CV', dialCode: '+238'},
  {name: 'Cayman Islands', flag: '🇰🇾', code: 'KY', dialCode: '+1345'},
  {name: 'Central African Republic', flag: '🇨🇫', code: 'CF', dialCode: '+236'},
  {name: 'Chad', flag: '🇹🇩', code: 'TD', dialCode: '+235'},
  {name: 'Chile', flag: '🇨🇱', code: 'CL', dialCode: '+56'},
  {name: 'China', flag: '🇨🇳', code: 'CN', dialCode: '+86'},
  {name: 'Colombia', flag: '🇨🇴', code: 'CO', dialCode: '+57'},
  {name: 'Comoros', flag: '🇰🇲', code: 'KM', dialCode: '+269'},
  {name: 'Congo', flag: '🇨🇬', code: 'CG', dialCode: '+242'},
  {name: 'Congo (DRC)', flag: '🇨🇩', code: 'CD', dialCode: '+243'},
  {name: 'Cook Islands', flag: '🇨🇰', code: 'CK', dialCode: '+682'},
  {name: 'Costa Rica', flag: '🇨🇷', code: 'CR', dialCode: '+506'},
  {name: 'Croatia', flag: '🇭🇷', code: 'HR', dialCode: '+385'},
  {name: 'Cuba', flag: '🇨🇺', code: 'CU', dialCode: '+53'},
  {name: 'Cyprus', flag: '🇨🇾', code: 'CY', dialCode: '+357'},
  {name: 'Czech Republic', flag: '🇨🇿', code: 'CZ', dialCode: '+420'},
  {name: 'Denmark', flag: '🇩🇰', code: 'DK', dialCode: '+45'},
  {name: 'Djibouti', flag: '🇩🇯', code: 'DJ', dialCode: '+253'},
  {name: 'Dominica', flag: '🇩🇲', code: 'DM', dialCode: '+1767'},
  {name: 'Dominican Republic', flag: '🇩🇴', code: 'DO', dialCode: '+1849'},
  {name: 'Ecuador', flag: '🇪🇨', code: 'EC', dialCode: '+593'},
  {name: 'Egypt', flag: '🇪🇬', code: 'EG', dialCode: '+20'},
  {name: 'El Salvador', flag: '🇸🇻', code: 'SV', dialCode: '+503'},
  {name: 'Equatorial Guinea', flag: '🇬🇶', code: 'GQ', dialCode: '+240'},
  {name: 'Eritrea', flag: '🇪🇷', code: 'ER', dialCode: '+291'},
  {name: 'Estonia', flag: '🇪🇪', code: 'EE', dialCode: '+372'},
  {name: 'Eswatini', flag: '🇸🇿', code: 'SZ', dialCode: '+268'},
  {name: 'Ethiopia', flag: '🇪🇹', code: 'ET', dialCode: '+251'},
  {name: 'Fiji', flag: '🇫🇯', code: 'FJ', dialCode: '+679'},
  {name: 'Finland', flag: '🇫🇮', code: 'FI', dialCode: '+358'},
  {name: 'France', flag: '🇫🇷', code: 'FR', dialCode: '+33'},
  {name: 'Gabon', flag: '🇬🇦', code: 'GA', dialCode: '+241'},
  {name: 'Gambia', flag: '🇬🇲', code: 'GM', dialCode: '+220'},
  {name: 'Georgia', flag: '🇬🇪', code: 'GE', dialCode: '+995'},
  {name: 'Germany', flag: '🇩🇪', code: 'DE', dialCode: '+49'},
  {name: 'Ghana', flag: '🇬🇭', code: 'GH', dialCode: '+233'},
  {name: 'Greece', flag: '🇬🇷', code: 'GR', dialCode: '+30'},
  {name: 'Greenland', flag: '🇬🇱', code: 'GL', dialCode: '+299'},
  {name: 'Grenada', flag: '🇬🇩', code: 'GD', dialCode: '+1473'},
  {name: 'Guam', flag: '🇬🇺', code: 'GU', dialCode: '+1671'},
  {name: 'Guatemala', flag: '🇬🇹', code: 'GT', dialCode: '+502'},
  {name: 'Guinea', flag: '🇬🇳', code: 'GN', dialCode: '+224'},
  {name: 'Guinea-Bissau', flag: '🇬🇼', code: 'GW', dialCode: '+245'},
  {name: 'Guyana', flag: '🇬🇾', code: 'GY', dialCode: '+592'},
  {name: 'Haiti', flag: '🇭🇹', code: 'HT', dialCode: '+509'},
  {name: 'Honduras', flag: '🇭🇳', code: 'HN', dialCode: '+504'},
  {name: 'Hong Kong', flag: '🇭🇰', code: 'HK', dialCode: '+852'},
  {name: 'Hungary', flag: '🇭🇺', code: 'HU', dialCode: '+36'},
  {name: 'Iceland', flag: '🇮🇸', code: 'IS', dialCode: '+354'},
  {name: 'India', flag: '🇮🇳', code: 'IN', dialCode: '+91'},
  {name: 'Indonesia', flag: '🇮🇩', code: 'ID', dialCode: '+62'},
  {name: 'Iran', flag: '🇮🇷', code: 'IR', dialCode: '+98'},
  {name: 'Iraq', flag: '🇮🇶', code: 'IQ', dialCode: '+964'},
  {name: 'Ireland', flag: '🇮🇪', code: 'IE', dialCode: '+353'},
  {name: 'Israel', flag: '🇮🇱', code: 'IL', dialCode: '+972'},
  {name: 'Italy', flag: '🇮🇹', code: 'IT', dialCode: '+39'},
  {name: 'Ivory Coast', flag: '🇨🇮', code: 'CI', dialCode: '+225'},
  {name: 'Jamaica', flag: '🇯🇲', code: 'JM', dialCode: '+1876'},
  {name: 'Japan', flag: '🇯🇵', code: 'JP', dialCode: '+81'},
  {name: 'Jordan', flag: '🇯🇴', code: 'JO', dialCode: '+962'},
  {name: 'Kazakhstan', flag: '🇰🇿', code: 'KZ', dialCode: '+7'},
  {name: 'Kenya', flag: '🇰🇪', code: 'KE', dialCode: '+254'},
  {name: 'Kiribati', flag: '🇰🇮', code: 'KI', dialCode: '+686'},
  {name: 'Kosovo', flag: '🇽🇰', code: 'XK', dialCode: '+383'},
  {name: 'Kuwait', flag: '🇰🇼', code: 'KW', dialCode: '+965'},
  {name: 'Kyrgyzstan', flag: '🇰🇬', code: 'KG', dialCode: '+996'},
  {name: 'Laos', flag: '🇱🇦', code: 'LA', dialCode: '+856'},
  {name: 'Latvia', flag: '🇱🇻', code: 'LV', dialCode: '+371'},
  {name: 'Lebanon', flag: '🇱🇧', code: 'LB', dialCode: '+961'},
  {name: 'Lesotho', flag: '🇱🇸', code: 'LS', dialCode: '+266'},
  {name: 'Liberia', flag: '🇱🇷', code: 'LR', dialCode: '+231'},
  {name: 'Libya', flag: '🇱🇾', code: 'LY', dialCode: '+218'},
  {name: 'Liechtenstein', flag: '🇱🇮', code: 'LI', dialCode: '+423'},
  {name: 'Lithuania', flag: '🇱🇹', code: 'LT', dialCode: '+370'},
  {name: 'Luxembourg', flag: '🇱🇺', code: 'LU', dialCode: '+352'},
  {name: 'Macao', flag: '🇲🇴', code: 'MO', dialCode: '+853'},
  {name: 'Madagascar', flag: '🇲🇬', code: 'MG', dialCode: '+261'},
  {name: 'Malawi', flag: '🇲🇼', code: 'MW', dialCode: '+265'},
  {name: 'Malaysia', flag: '🇲🇾', code: 'MY', dialCode: '+60'},
  {name: 'Maldives', flag: '🇲🇻', code: 'MV', dialCode: '+960'},
  {name: 'Mali', flag: '🇲🇱', code: 'ML', dialCode: '+223'},
  {name: 'Malta', flag: '🇲🇹', code: 'MT', dialCode: '+356'},
  {name: 'Marshall Islands', flag: '🇲🇭', code: 'MH', dialCode: '+692'},
  {name: 'Mauritania', flag: '🇲🇷', code: 'MR', dialCode: '+222'},
  {name: 'Mauritius', flag: '🇲🇺', code: 'MU', dialCode: '+230'},
  {name: 'Mexico', flag: '🇲🇽', code: 'MX', dialCode: '+52'},
  {name: 'Micronesia', flag: '🇫🇲', code: 'FM', dialCode: '+691'},
  {name: 'Moldova', flag: '🇲🇩', code: 'MD', dialCode: '+373'},
  {name: 'Monaco', flag: '🇲🇨', code: 'MC', dialCode: '+377'},
  {name: 'Mongolia', flag: '🇲🇳', code: 'MN', dialCode: '+976'},
  {name: 'Montenegro', flag: '🇲🇪', code: 'ME', dialCode: '+382'},
  {name: 'Morocco', flag: '🇲🇦', code: 'MA', dialCode: '+212'},
  {name: 'Mozambique', flag: '🇲🇿', code: 'MZ', dialCode: '+258'},
  {name: 'Myanmar', flag: '🇲🇲', code: 'MM', dialCode: '+95'},
  {name: 'Namibia', flag: '🇳🇦', code: 'NA', dialCode: '+264'},
  {name: 'Nauru', flag: '🇳🇷', code: 'NR', dialCode: '+674'},
  {name: 'Nepal', flag: '🇳🇵', code: 'NP', dialCode: '+977'},
  {name: 'Netherlands', flag: '🇳🇱', code: 'NL', dialCode: '+31'},
  {name: 'New Zealand', flag: '🇳🇿', code: 'NZ', dialCode: '+64'},
  {name: 'Nicaragua', flag: '🇳🇮', code: 'NI', dialCode: '+505'},
  {name: 'Niger', flag: '🇳🇪', code: 'NE', dialCode: '+227'},
  {name: 'Nigeria', flag: '🇳🇬', code: 'NG', dialCode: '+234'},
  {name: 'North Korea', flag: '🇰🇵', code: 'KP', dialCode: '+850'},
  {name: 'North Macedonia', flag: '🇲🇰', code: 'MK', dialCode: '+389'},
  {name: 'Norway', flag: '🇳🇴', code: 'NO', dialCode: '+47'},
  {name: 'Oman', flag: '🇴🇲', code: 'OM', dialCode: '+968'},
  {name: 'Pakistan', flag: '🇵🇰', code: 'PK', dialCode: '+92'},
  {name: 'Palau', flag: '🇵🇼', code: 'PW', dialCode: '+680'},
  {name: 'Palestine', flag: '🇵🇸', code: 'PS', dialCode: '+970'},
  {name: 'Panama', flag: '🇵🇦', code: 'PA', dialCode: '+507'},
  {name: 'Papua New Guinea', flag: '🇵🇬', code: 'PG', dialCode: '+675'},
  {name: 'Paraguay', flag: '🇵🇾', code: 'PY', dialCode: '+595'},
  {name: 'Peru', flag: '🇵🇪', code: 'PE', dialCode: '+51'},
  {name: 'Philippines', flag: '🇵🇭', code: 'PH', dialCode: '+63'},
  {name: 'Poland', flag: '🇵🇱', code: 'PL', dialCode: '+48'},
  {name: 'Portugal', flag: '🇵🇹', code: 'PT', dialCode: '+351'},
  {name: 'Puerto Rico', flag: '🇵🇷', code: 'PR', dialCode: '+1939'},
  {name: 'Qatar', flag: '🇶🇦', code: 'QA', dialCode: '+974'},
  {name: 'Romania', flag: '🇷🇴', code: 'RO', dialCode: '+40'},
  {name: 'Russia', flag: '🇷🇺', code: 'RU', dialCode: '+7'},
  {name: 'Rwanda', flag: '🇷🇼', code: 'RW', dialCode: '+250'},
  {name: 'Saint Kitts and Nevis', flag: '🇰🇳', code: 'KN', dialCode: '+1869'},
  {name: 'Saint Lucia', flag: '🇱🇨', code: 'LC', dialCode: '+1758'},
  {name: 'Saint Vincent', flag: '🇻🇨', code: 'VC', dialCode: '+1784'},
  {name: 'Samoa', flag: '🇼🇸', code: 'WS', dialCode: '+685'},
  {name: 'San Marino', flag: '🇸🇲', code: 'SM', dialCode: '+378'},
  {name: 'Sao Tome and Principe', flag: '🇸🇹', code: 'ST', dialCode: '+239'},
  {name: 'Saudi Arabia', flag: '🇸🇦', code: 'SA', dialCode: '+966'},
  {name: 'Senegal', flag: '🇸🇳', code: 'SN', dialCode: '+221'},
  {name: 'Serbia', flag: '🇷🇸', code: 'RS', dialCode: '+381'},
  {name: 'Seychelles', flag: '🇸🇨', code: 'SC', dialCode: '+248'},
  {name: 'Sierra Leone', flag: '🇸🇱', code: 'SL', dialCode: '+232'},
  {name: 'Singapore', flag: '🇸🇬', code: 'SG', dialCode: '+65'},
  {name: 'Slovakia', flag: '🇸🇰', code: 'SK', dialCode: '+421'},
  {name: 'Slovenia', flag: '🇸🇮', code: 'SI', dialCode: '+386'},
  {name: 'Solomon Islands', flag: '🇸🇧', code: 'SB', dialCode: '+677'},
  {name: 'Somalia', flag: '🇸🇴', code: 'SO', dialCode: '+252'},
  {name: 'South Africa', flag: '🇿🇦', code: 'ZA', dialCode: '+27'},
  {name: 'South Korea', flag: '🇰🇷', code: 'KR', dialCode: '+82'},
  {name: 'South Sudan', flag: '🇸🇸', code: 'SS', dialCode: '+211'},
  {name: 'Spain', flag: '🇪🇸', code: 'ES', dialCode: '+34'},
  {name: 'Sri Lanka', flag: '🇱🇰', code: 'LK', dialCode: '+94'},
  {name: 'Sudan', flag: '🇸🇩', code: 'SD', dialCode: '+249'},
  {name: 'Suriname', flag: '🇸🇷', code: 'SR', dialCode: '+597'},
  {name: 'Sweden', flag: '🇸🇪', code: 'SE', dialCode: '+46'},
  {name: 'Switzerland', flag: '🇨🇭', code: 'CH', dialCode: '+41'},
  {name: 'Syria', flag: '🇸🇾', code: 'SY', dialCode: '+963'},
  {name: 'Taiwan', flag: '🇹🇼', code: 'TW', dialCode: '+886'},
  {name: 'Tajikistan', flag: '🇹🇯', code: 'TJ', dialCode: '+992'},
  {name: 'Tanzania', flag: '🇹🇿', code: 'TZ', dialCode: '+255'},
  {name: 'Thailand', flag: '🇹🇭', code: 'TH', dialCode: '+66'},
  {name: 'Timor-Leste', flag: '🇹🇱', code: 'TL', dialCode: '+670'},
  {name: 'Togo', flag: '🇹🇬', code: 'TG', dialCode: '+228'},
  {name: 'Tonga', flag: '🇹🇴', code: 'TO', dialCode: '+676'},
  {name: 'Trinidad and Tobago', flag: '🇹🇹', code: 'TT', dialCode: '+1868'},
  {name: 'Tunisia', flag: '🇹🇳', code: 'TN', dialCode: '+216'},
  {name: 'Turkey', flag: '🇹🇷', code: 'TR', dialCode: '+90'},
  {name: 'Turkmenistan', flag: '🇹🇲', code: 'TM', dialCode: '+993'},
  {name: 'Tuvalu', flag: '🇹🇻', code: 'TV', dialCode: '+688'},
  {name: 'Uganda', flag: '🇺🇬', code: 'UG', dialCode: '+256'},
  {name: 'Ukraine', flag: '🇺🇦', code: 'UA', dialCode: '+380'},
  {name: 'United Arab Emirates', flag: '🇦🇪', code: 'AE', dialCode: '+971'},
  {name: 'United Kingdom', flag: '🇬🇧', code: 'GB', dialCode: '+44'},
  {name: 'United States', flag: '🇺🇸', code: 'US', dialCode: '+1'},
  {name: 'Uruguay', flag: '🇺🇾', code: 'UY', dialCode: '+598'},
  {name: 'Uzbekistan', flag: '🇺🇿', code: 'UZ', dialCode: '+998'},
  {name: 'Vanuatu', flag: '🇻🇺', code: 'VU', dialCode: '+678'},
  {name: 'Vatican City', flag: '🇻🇦', code: 'VA', dialCode: '+379'},
  {name: 'Venezuela', flag: '🇻🇪', code: 'VE', dialCode: '+58'},
  {name: 'Vietnam', flag: '🇻🇳', code: 'VN', dialCode: '+84'},
  {name: 'Yemen', flag: '🇾🇪', code: 'YE', dialCode: '+967'},
  {name: 'Zambia', flag: '🇿🇲', code: 'ZM', dialCode: '+260'},
  {name: 'Zimbabwe', flag: '🇿🇼', code: 'ZW', dialCode: '+263'},
];

type Props = {
  selected: Country;
  onSelect: (country: Country) => void;
};

export function CountryCodePicker({selected, onSelect}: Props) {
  const {colors} = useTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const filtered = useMemo(
    () =>
      COUNTRIES.filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search),
      ),
    [search],
  );

  function close() {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setSearch('');
      slideAnim.setValue(SCREEN_HEIGHT);
    });
  }

  const handleSelect = useCallback((country: Country) => {
    onSelect(country);
    close();
  }, [onSelect]);

  const renderItem = useCallback(
    ({item}: {item: Country}) => (
      <TouchableOpacity
        style={[
          styles.row,
          {borderBottomColor: colors.divider},
          item.code === selected.code && [
            styles.rowSelected,
            {backgroundColor: colors.selectedRow},
          ],
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}>
        <Text style={styles.rowFlag}>{item.flag}</Text>
        <Text style={[styles.rowName, {color: colors.text}]}>{item.name}</Text>
        <Text style={[styles.rowDial, {color: colors.textSecondary}]}>
          {item.dialCode}
        </Text>
      </TouchableOpacity>
    ),
    [colors, selected.code, handleSelect],
  );

  function open() {
    setVisible(true);
  }

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <View>
      <Pressable
        style={styles.trigger}
        onPress={open}>
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text style={[styles.dialCode, {color: colors.textBlue}]}>{selected.dialCode}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.iconBlue} style={styles.arrow} />
      </Pressable>

      <Modal
        visible={visible}
        animationType="fade"
        transparent
        statusBarTranslucent={Platform.OS === 'android'}
        onRequestClose={close}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.overlay}
          translucent={Platform.OS === 'android'}
        />
        <View style={[styles.overlay, {backgroundColor: colors.overlay}]}>
          <Pressable style={styles.overlayDismiss} onPress={close} />
          <Animated.View
            style={[
              styles.sheet,
              {backgroundColor: colors.sheetBackground},
              {transform: [{translateY: slideAnim}]},
            ]}>
            <View style={[styles.handle, {backgroundColor: colors.sheetHandle}]} />
            <Text style={[styles.sheetTitle, {color: colors.text}]}>Select Country</Text>

            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.searchBackground,
                  color: colors.inputText,
                },
              ]}
              placeholder="Search country or code..."
              placeholderTextColor={colors.inputPlaceholder}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />

            <FlatList
              data={filtered}
              keyExtractor={item => item.code + item.dialCode}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              windowSize={5}
              getItemLayout={(_data, index) => ({
                length: 49,
                offset: 49 * index,
                index,
              })}
              renderItem={renderItem}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={[styles.emptyText, {color: colors.textMuted}]}>No results found</Text>
                </View>
              }
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

export const DEFAULT_COUNTRY: Country = COUNTRIES.find(c => c.code === 'IN')!; // India

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  flag: {
    fontSize: FontSizes.h3,
    marginRight: 6,
  },
  dialCode: {
    fontSize: FontSizes.input,
    fontWeight: '500',
  },
  arrow: {
    fontSize: FontSizes.sm,
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDismiss: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: '60%',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: FontSizes.h3,
    fontWeight: '700',
    marginBottom: 12,
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: FontSizes.input,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
  },
  rowSelected: {
    borderRadius: 10,
  },
  rowFlag: {
    fontSize: FontSizes.h2x,
    marginRight: 12,
  },
  rowName: {
    flex: 1,
    fontSize: FontSizes.input,
  },
  rowDial: {
    fontSize: FontSizes.input,
    fontWeight: '500',
  },
  emptyList: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSizes.body,
  },
});
