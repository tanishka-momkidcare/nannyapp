import React, {useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import {useAuth} from '../../context';
import {ShieldCheckIcon} from '../../assets/icons/ShieldCheckIcon';

const {width, height} = Dimensions.get('window');

const BLUE  = '#3B82F6';
const AMBER = '#F5A623';
const BG    = '#EEF6FF';

const HERO_H = height * 0.46;
const BLOB_W = width  * 0.66;
const BLOB_H = HERO_H * 0.90;

// --- Slide Configuration ---------------------------------------------------
// Add a new object to SLIDES to add a slide.
// Delete an object to remove it.  Reorder to change order.
// Each slide can use its own image source.
// -------------------------------------------------------------------------
type SlideConfig = {
  id: string;
  image: number;
  badge: string;
  title: string;
  description: string;
};

const IMAGE = require('../../assets/freepik__improve-the-girl-skin-tone-a-little-bit__90854.png');

const SLIDES: SlideConfig[] = [
  {
    id: '1',
    image: IMAGE,
    badge: '100% ???????? ?????',
    title: '???? ??????? ??? ??? ?????? !',
    description: '??? ?? ????? ?? ?????? ?? ??? ???\n???? ????? ??????',
  },
  // -- Slide 2 (uncomment to enable) ----------------------------------------
  // {
  //   id: '2',
  //   image: IMAGE, // replace with your own image
  //   badge: '???????? ?? ????????',
  //   title: '?? ??? ???????? !',
  //   description: '?? ?? ?????? ?? ???????? ?? ????? ?????? ????',
  // },
  // -- Slide 3 (uncomment to enable) ----------------------------------------
  // {
  //   id: '3',
  //   image: IMAGE, // replace with your own image
  //   badge: '???? ????? ?????????',
  //   title: '????? ???? ???? !',
  //   description: '??? ?? ?????? ??? ??????? ???? ?? ??? ???????',
  // },
];
// -------------------------------------------------------------------------

export function WelcomeScreen() {
  const {completeOnboarding} = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({index: currentIndex + 1});
    } else {
      completeOnboarding();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* -- Logo -------------------------------------------------------- */}
      <View style={styles.logoRow}>
        <Text style={styles.logoMom}>mom</Text>
        <Text style={styles.logoKid}>kid</Text>
        <Text style={styles.logoCare}>care</Text>
        <Text style={styles.logoTM}>�</Text>
      </View>

      {/* -- Hero: organic blob + photo ---------------------------------- */}
      <View style={styles.heroSection}>
        {/* Decorative dots � upper right */}
        <Svg style={styles.decorSvg} width={28} height={52}>
          <Circle cx="18" cy="9"  r="5.5" fill={BLUE} opacity={0.55} />
          <Circle cx="8"  cy="27" r="3.5" fill={BLUE} opacity={0.40} />
          <Circle cx="22" cy="44" r="2.5" fill={BLUE} opacity={0.28} />
        </Svg>

        {/* Blob + image stacked in a fixed-size box */}
        <View style={styles.heroStack}>
          {/* Organic blob background */}
          <Svg
            width={BLOB_W}
            height={BLOB_H}
            viewBox="0 0 200 230"
            style={styles.blobSvg}>
            <Path
              d="M100 6C139 3 181 26 192 70C202 113 193 162 170 197C148 230 117 240 86 234C56 228 20 208 8 170C-5 132 6 86 28 52C49 19 65 9 100 6Z"
              fill={BLUE}
            />
          </Svg>

          {/* Nanny photo � rendered on top of blob */}
          <Image
            source={SLIDES[currentIndex].image}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* -- Slide text (badge � title � description) ------------------- */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={SLIDES.length > 1}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{viewAreaCoveragePercentThreshold: 50}}
        style={styles.flatList}
        renderItem={({item}) => (
          <View style={[styles.slide, {width}]}>
            <View style={styles.badge}>
              <ShieldCheckIcon width={15} height={15} />
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      {/* -- Footer ------------------------------------------------------ */}
      <View style={styles.footer}>
        {SLIDES.length > 1 && (
          <View style={styles.pagination}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: i === currentIndex ? 20 : 7,
                    backgroundColor: i === currentIndex ? BLUE : BLUE + '55',
                  },
                ]}
              />
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? '???? ????  �' : '??? ?????  �'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /* Logo */
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 2,
  },
  logoMom:  {fontSize: 22, fontWeight: '800', color: '#1A1A1A'},
  logoKid:  {fontSize: 22, fontWeight: '800', color: BLUE},
  logoCare: {fontSize: 11, color: BLUE, marginBottom: 2},
  logoTM:   {fontSize: 9,  color: '#999', marginBottom: 3, marginLeft: 1},

  /* Hero */
  heroSection: {
    height: HERO_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorSvg: {
    position: 'absolute',
    right: 22,
    top: HERO_H * 0.12,
  },
  heroStack: {
    width: BLOB_W,
    height: BLOB_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobSvg: {
    position: 'absolute',
  },
  heroImage: {
    width: BLOB_W,
    height: BLOB_H,
  },

  /* Slide text */
  flatList: {
    flexGrow: 0,
  },
  slide: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: BLUE,
    marginLeft: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 32,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },

  /* Footer */
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dot: {
    height: 7,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  button: {
    backgroundColor: AMBER,
    borderRadius: 30,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: AMBER,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
