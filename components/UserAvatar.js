import { View, Text, Image } from 'react-native';

const BG = '#080808';
const RED = '#FF4757';

// size: 'sm' (36), 'md' (46), 'lg' (62)
const SIZES = {
  sm: { box: 36, radius: 11, font: 11, badgeFont: 8,  badgePadH: 4, badgePadV: 1, badgeRadius: 5,  badgeOffset: -5  },
  md: { box: 46, radius: 14, font: 14, badgeFont: 9,  badgePadH: 5, badgePadV: 1, badgeRadius: 6,  badgeOffset: -6  },
  lg: { box: 62, radius: 18, font: 20, badgeFont: 10, badgePadH: 6, badgePadV: 2, badgeRadius: 8,  badgeOffset: -7  },
};

/**
 * UserAvatar — reużywalny awatar użytkownika z odznaką poziomu.
 *
 * Props:
 *   initials  {string}  – inicjały wyświetlane gdy brak zdjęcia
 *   photo     {string}  – URI zdjęcia (opcjonalne)
 *   level     {number}  – poziom; pomiń / null żeby ukryć odznakę
 *   color     {string}  – kolor akcentu (ramka, tło inicjałów)
 *   size      {'sm'|'md'|'lg'}  – rozmiar (domyślnie 'md')
 *   style     {object}  – dodatkowe style dla kontenera
 */
export default function UserAvatar({ initials, photo, level, color = RED, size = 'md', style }) {
  const s = SIZES[size] || SIZES.md;

  return (
    <View style={[{ width: s.box, height: s.box }, style]}>
      {photo
        ? <Image
            source={{ uri: photo }}
            style={{ width: s.box, height: s.box, borderRadius: s.radius, borderWidth: 2, borderColor: color + '44' }}
          />
        : <View style={{
            width: s.box, height: s.box, borderRadius: s.radius,
            backgroundColor: color + '22', borderWidth: 1.5, borderColor: color + '55',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color, fontSize: s.font, fontWeight: '800', letterSpacing: 1 }}>
              {initials}
            </Text>
          </View>
      }

      {level != null && (
        <View style={{
          position: 'absolute', bottom: s.badgeOffset, right: s.badgeOffset,
          backgroundColor: RED, borderRadius: s.badgeRadius,
          paddingHorizontal: s.badgePadH, paddingVertical: s.badgePadV,
          borderWidth: 2, borderColor: BG,
        }}>
          <Text style={{ color: '#fff', fontSize: s.badgeFont, fontWeight: '900' }}>
            {level}
          </Text>
        </View>
      )}
    </View>
  );
}
