import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HeaderProps {
  userName?: string | null;
}

export default function Header({ userName }: HeaderProps) {
  const initials = userName 
    ? userName.substring(0, 2).toUpperCase() 
    : 'ME';

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Atlas</Text>
      <View style={styles.profileCircle}>
        <Text style={styles.profileText}>{initials}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: 32,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
