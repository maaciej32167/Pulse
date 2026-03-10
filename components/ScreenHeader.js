import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

const NAV_ITEMS = [
  { label: 'TRENING',  icon: 'zap',         color: '#FF4757', screen: 'Log'       },
  { label: 'PROFIL',   icon: 'user',         color: '#FF4757', screen: 'Profil'    },
  { label: 'DISCOVER', icon: 'compass',      color: '#818cf8', screen: 'Discover'  },
  { label: 'ĆWICZ.',   icon: 'bar-chart-2',  color: '#00F5FF', screen: 'Cwiczenia' },
  { label: 'PLAN',     icon: 'calendar',     color: '#00F5FF', screen: 'Plan'      },
];

export default function ScreenHeader({ navigation, icon, label, color }) {
  const [open, setOpen] = useState(false);

  function navigate(screen) {
    setOpen(false);
    navigation.navigate(screen);
  }

  return (
    <View style={styles.wrap}>
      {/* Przycisk powrotu */}
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.back} hitSlop={12}>
        <Feather name="chevron-left" size={26} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      {/* Centrum — klikalne, otwiera dropdown */}
      <TouchableOpacity style={styles.center} onPress={() => setOpen(v => !v)} activeOpacity={0.75}>
        <View style={[styles.iconWrap, { backgroundColor: color + '18', borderColor: color + '55' }]}>
          <Feather name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </TouchableOpacity>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Dropdown modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.dropdown} onPress={() => {}}>
            {NAV_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={item.screen}
                style={[styles.navItem, i < NAV_ITEMS.length - 1 && styles.navItemBorder]}
                onPress={() => navigate(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.navIcon, { backgroundColor: item.color + '18', borderColor: item.color + '40' }]}>
                  <Feather name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={[styles.navLabel, { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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

  // Dropdown
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    paddingTop: 100,
  },
  dropdown: {
    backgroundColor: '#111318',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 220,
    overflow: 'hidden',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  navItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
