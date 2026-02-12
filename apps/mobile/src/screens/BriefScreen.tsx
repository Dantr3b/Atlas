import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Header from '../components/Header';

export default function BriefScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>Brief</Text>
        <Text style={styles.subtitle}>Votre résumé quotidien</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
