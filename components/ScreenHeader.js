import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * Stały nagłówek ekranu — ikona + label w stylu hero z HomeScreen.
 * Props: navigation, icon (Feather), label (string), color (hex)
 */
export default function ScreenHeader({ navigation, icon, label, color }) {
  return (
    <View style={styles.wrap}>
      {/* Przycisk powrotu */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
        <Feather name="chevron-left" size={26} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      {/* Logo: ikona + label — identyczny styl co hero po animacji */}
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: color + '18', borderColor: color + '55' }]}>
          <Feather name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>

      {/* Spacer symetryczny */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  back: {
    width: 40,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  spacer: {
    width: 40,
  },
});
