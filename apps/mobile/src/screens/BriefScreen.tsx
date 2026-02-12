import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import Header from '../components/Header';
import { api, GeneratedBrief, NewsArticle } from '../lib/api';

interface NewsCardProps {
  article: NewsArticle;
  category: string;
}

function NewsCard({ article, category }: NewsCardProps) {
  const handlePress = () => {
    Linking.openURL(article.url);
  };

  return (
    <TouchableOpacity style={styles.newsCard} onPress={handlePress} activeOpacity={0.7}>
      {article.urlToImage && (
        <Image 
          source={{ uri: article.urlToImage }} 
          style={styles.newsImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.newsContent}>
        <Text style={styles.newsCategory}>{category}</Text>
        <Text style={styles.newsTitle} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.newsDescription} numberOfLines={3}>{article.description}</Text>
        <Text style={styles.newsSource}>{article.source.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BriefScreen() {
  const [brief, setBrief] = useState<GeneratedBrief | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  useEffect(() => {
    // Configure audio mode
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    return () => {
      // Cleanup sound on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await api.getDailyBrief();
      setBrief(response.content);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du brief');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handlePlayAudio = async () => {
    try {
      // If already playing, pause it
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      // If paused, resume
      if (sound && !isPlaying) {
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      // Load and play new audio
      setIsLoadingAudio(true);
      const audioData = await api.getDailyBriefAudio();
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioData },
        { shouldPlay: true }
      );

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to play audio:', err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Préparation de votre brief...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Header />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!brief) {
    return null;
  }

  const hasNews = 
    brief.news.sections.newsFrance || 
    brief.news.sections.newsIntl || 
    brief.news.sections.bizFrance || 
    brief.news.sections.bizIntl || 
    brief.news.sections.sports;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Header />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>{brief.intro}</Text>
          
          {/* Weather */}
          {brief.weather && (
            <View style={styles.weatherCard}>
              <Text style={styles.weatherIcon}>{brief.weather.icon}</Text>
              <View style={styles.weatherInfo}>
                <View style={styles.weatherMain}>
                  <Text style={styles.weatherTemp}>{brief.weather.temperature}°C</Text>
                  <Text style={styles.weatherDesc}>{brief.weather.description}</Text>
                </View>
                <View style={styles.weatherRange}>
                  <Text style={styles.tempMin}>↓ {brief.weather.minTemp}°</Text>
                  <Text style={styles.tempMax}>↑ {brief.weather.maxTemp}°</Text>
                </View>
                {brief.weather.advice && (
                  <Text style={styles.weatherAdvice}>{brief.weather.advice}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Header with Audio Player */}
        <View style={styles.briefHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.briefTitle}>☕ Brief du matin</Text>
            <Text style={styles.briefDate}>
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.audioButton, isPlaying && styles.audioButtonPlaying]}
            onPress={handlePlayAudio}
            disabled={isLoadingAudio}
          >
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.audioIcon}>{isPlaying ? '⏹️' : '🔊'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Gemini Summary */}
        {brief.news.summary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.sparkleIcon}>✨</Text>
              <Text style={styles.summaryLabel}>Le point Gemini</Text>
            </View>
            <Text style={styles.summaryText}>{brief.news.summary}</Text>
          </View>
        )}

        {/* News Sections */}
        {hasNews && (
          <>
            {/* Actualités */}
            {(brief.news.sections.newsFrance || brief.news.sections.newsIntl) && (
              <View style={styles.newsSection}>
                <Text style={styles.sectionTitle}>🗞️ Actualités</Text>
                {brief.news.sections.newsFrance && (
                  <NewsCard article={brief.news.sections.newsFrance} category="France" />
                )}
                {brief.news.sections.newsIntl && (
                  <NewsCard article={brief.news.sections.newsIntl} category="Monde" />
                )}
              </View>
            )}

            {/* Économie */}
            {(brief.news.sections.bizFrance || brief.news.sections.bizIntl) && (
              <View style={styles.newsSection}>
                <Text style={styles.sectionTitle}>💼 Économie</Text>
                {brief.news.sections.bizFrance && (
                  <NewsCard article={brief.news.sections.bizFrance} category="France" />
                )}
                {brief.news.sections.bizIntl && (
                  <NewsCard article={brief.news.sections.bizIntl} category="Monde" />
                )}
              </View>
            )}

            {/* Sport */}
            {brief.news.sections.sports && (
              <View style={styles.newsSection}>
                <Text style={styles.sectionTitle}>🏆 Sport</Text>
                <NewsCard article={brief.news.sections.sports} category="À la une" />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  greetingSection: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#1C1C1E',
    marginBottom: 16,
  },
  weatherCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  weatherIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginRight: 12,
  },
  weatherDesc: {
    fontSize: 16,
    color: '#8E8E93',
  },
  weatherRange: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  tempMin: {
    fontSize: 14,
    color: '#007AFF',
  },
  tempMax: {
    fontSize: 14,
    color: '#FF3B30',
  },
  weatherAdvice: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  briefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  briefTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  briefDate: {
    fontSize: 14,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  audioButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  audioButtonPlaying: {
    backgroundColor: '#FF3B30',
  },
  audioIcon: {
    fontSize: 24,
  },
  summaryCard: {
    backgroundColor: '#F0F0FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0FF',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sparkleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5856D6',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1C1C1E',
  },
  newsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  newsImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F2F2F7',
  },
  newsContent: {
    padding: 16,
  },
  newsCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    lineHeight: 24,
  },
  newsDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 8,
  },
  newsSource: {
    fontSize: 12,
    color: '#C7C7CC',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonSecondary: {
    backgroundColor: '#F2F2F7',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
});
