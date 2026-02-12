import React from 'react';
import { 
  View, 
  Text, 
  TextInput,
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { api, Task } from '../lib/api';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import Header from '../components/Header';

export default function HomeScreen() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<{ name: string | null } | null>(null);

  const [isTaskModalVisible, setIsTaskModalVisible] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [prefillData, setPrefillData] = React.useState<Partial<Task> | null>(null);

  const [showBriefModal, setShowBriefModal] = React.useState(false);
  const [showAudioControlModal, setShowAudioControlModal] = React.useState(false);
  const [briefDate, setBriefDate] = React.useState<string>('');
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = React.useState(false);

  const [naturalInput, setNaturalInput] = React.useState('');
  const [isParsing, setIsParsing] = React.useState(false);

  // Configure audio and check brief status on mount
  React.useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    fetchData();
    checkBriefStatus();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const checkBriefStatus = async () => {
    try {
      const response = await api.getDailyBrief();
      setBriefDate(response.date);
      
      if (!response.listened) {
        setShowBriefModal(true);
      }
    } catch (err) {
      console.error('Failed to check brief status:', err);
    }
  };

  const fetchData = async () => {
    try {
      setError(null);
      // Check auth and get user
      const { user: userData } = await api.getMe();
      setUser(userData);

      // Fetch today's tasks
      const { tasks: todayTasks } = await api.getTodayTasks();
      setTasks(todayTasks);
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (err.status === 401) {
        setError('Accès refusé. Veuillez vous connecter.');
      } else {
        setError('Impossible de se connecter au serveur.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // Open modal in CREATE mode
  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setPrefillData(null);
    setIsTaskModalVisible(true);
  };

  // Open modal in EDIT mode
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalVisible(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, taskData);
      } else {
        // Safe cast as we know create expects specific fields but api.ts types might be slightly different
        // In reality, api.createTask expects Omit<Task, 'id'...> which Partial<Task> mostly satisfies if required fields are present
        // But for safety validation should happen in Modal. 
        // For now, we trust the modal validation.
        await api.createTask(taskData as any);
      }
      fetchData(); // Refresh list
    } catch (err) {
      throw err; // Let modal handle error
    }
  };

  const handleParseAndCreate = async () => {
    if (!naturalInput.trim()) return;

    try {
      setIsParsing(true);
      const parsed = await api.parseNaturalLanguage(naturalInput);
      
      // Convert ParsedTask to Partial<Task> format for modal
      const taskData: Partial<Task> = {
        content: parsed.content,
        status: 'INBOX',
        type: parsed.type || undefined,
        context: parsed.context || 'PERSONAL',
        priority: parsed.priority || 0,
        estimatedDuration: parsed.estimatedDuration || undefined,
        deadline: parsed.deadline || undefined,
      };

      // Set prefill data and open modal in CREATE mode
      setPrefillData(taskData);
      setEditingTask(null); // Ensure we're in CREATE mode
      setIsTaskModalVisible(true);
      setNaturalInput(''); // Clear input
    } catch (err: any) {
      console.error('Parse error:', err);
      alert('Impossible de parser la tâche. Veuillez réessayer.');
    } finally {
      setIsParsing(false);
    }
  };

  const handlePlayBriefAudio = async () => {
    try {
      if (isPlayingAudio && sound) {
        await sound.pauseAsync();
        setIsPlayingAudio(false);
        return;
      }

      if (sound && !isPlayingAudio) {
        await sound.playAsync();
        setIsPlayingAudio(true);
        return;
      }

      setIsLoadingAudio(true);
      setShowAudioControlModal(true); // Show control modal
      const audioData = await api.getDailyBriefAudio();
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioData },
        { shouldPlay: true }
      );

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingAudio(false);
          setShowAudioControlModal(false);
        }
      });

      setSound(newSound);
      setIsPlayingAudio(true);
    } catch (err) {
      console.error('Failed to play audio:', err);
      setShowAudioControlModal(false);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleListenFromModal = async () => {
    setShowBriefModal(false);
    try {
      await api.markBriefListened(briefDate);
    } catch (err) {
      console.error('Failed to mark brief as listened:', err);
    }
    await handlePlayBriefAudio();
  };

  const handleDismissBriefModal = async () => {
    setShowBriefModal(false);
    try {
      await api.markBriefListened(briefDate);
    } catch (err) {
      console.error('Failed to mark brief as listened:', err);
    }
  };

  const handleTogglePlayPause = async () => {
    if (!sound) return;
    
    if (isPlayingAudio) {
      await sound.pauseAsync();
      setIsPlayingAudio(false);
    } else {
      await sound.playAsync();
      setIsPlayingAudio(true);
    }
  };

  const handleCloseAudioModal = async () => {
    // Stop and unload audio
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setIsPlayingAudio(false);
    setShowAudioControlModal(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <Header userName={user?.name} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Bonjour, {user?.name || 'Gabin'}</Text>
          <Text style={styles.subtitleText}>Prêt à organiser votre journée ?</Text>
        </View>

        {/* Error message if any */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Natural Language Input Bar */}
        <View style={styles.naturalInputContainer}>
          <TextInput
            style={styles.naturalInput}
            placeholder="Décrivez votre tâche en langage naturel..."
            placeholderTextColor="#999"
            value={naturalInput}
            onChangeText={setNaturalInput}
            onSubmitEditing={handleParseAndCreate}
            returnKeyType="send"
            editable={!isParsing}
          />
          <TouchableOpacity 
            style={[styles.parseButton, isParsing && styles.parseButtonDisabled]}
            onPress={handleParseAndCreate}
            disabled={isParsing || !naturalInput.trim()}
          >
            {isParsing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.parseButtonText}>✨</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Full-width Plus Button */}
        <TouchableOpacity 
          style={styles.addButton} 
          activeOpacity={0.9}
          onPress={handleOpenCreateModal}
        >
          <Text style={styles.addButtonText}>+ Nouvelle tâche</Text>
        </TouchableOpacity>

        {/* AI Input Bar (Kept for quick AI add if needed later, or can be removed if strictly modal only) */}
        {/* For now, simplified or just header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.taskList}>
          {tasks.length > 0 ? (
            (() => {
              // Sort tasks: IN_PROGRESS first, then INBOX, then PLANNED, then COMPLETED
              const sortedTasks = [...tasks].sort((a, b) => {
                const statusOrder = { IN_PROGRESS: 0, INBOX: 1, PLANNED: 2, COMPLETED: 3 };
                const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
                const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
                return orderA - orderB;
              });

              // Helper function to convert numeric priority to string
              const getPriorityLabel = (priority: number): string => {
                if (priority >= 8) return 'CRITICAL';
                if (priority >= 6) return 'HIGH';
                if (priority >= 4) return 'MEDIUM';
                if (priority >= 1) return 'LOW';
                return 'LOW';
              };

              // Group tasks by status
              const inProgressTasks = sortedTasks.filter(t => t.status === 'IN_PROGRESS');
              const plannedInboxTasks = sortedTasks.filter(t => t.status === 'PLANNED' || t.status === 'INBOX');
              const completedTasks = sortedTasks.filter(t => t.status === 'COMPLETED');

              return (
                <>
                  {/* In Progress Section */}
                  {inProgressTasks.length > 0 && (
                    <>
                      <View style={styles.statusSectionHeader}>
                        <Text style={styles.statusSectionTitle}>En cours</Text>
                      </View>
                      {inProgressTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          content={task.content}
                          priority={getPriorityLabel(task.priority)}
                          isCompleted={false}
                          onEdit={() => handleEditTask(task)}
                        />
                      ))}
                    </>
                  )}

                  {/* Planned/Inbox Section */}
                  {plannedInboxTasks.length > 0 && (
                    <>
                      <View style={styles.statusSectionHeader}>
                        <Text style={styles.statusSectionTitle}>Planifié</Text>
                      </View>
                      {plannedInboxTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          content={task.content}
                          priority={getPriorityLabel(task.priority)}
                          isCompleted={false}
                          onEdit={() => handleEditTask(task)}
                        />
                      ))}
                    </>
                  )}

                  {/* Completed Section */}
                  {completedTasks.length > 0 && (
                    <>
                      <View style={styles.statusSectionHeader}>
                        <Text style={styles.statusSectionTitle}>Terminé</Text>
                      </View>
                      {completedTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          content={task.content}
                          priority={getPriorityLabel(task.priority)}
                          isCompleted={true}
                          onEdit={() => handleEditTask(task)}
                        />
                      ))}
                    </>
                  )}
                </>
              );
            })()
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune tâche pour aujourd'hui.</Text>
            </View>
          )}
        </View>

      </ScrollView>

      <TaskModal
        visible={isTaskModalVisible}
        task={editingTask}
        prefillData={prefillData}
        onClose={() => setIsTaskModalVisible(false)}
        onSave={handleSaveTask}
      />

      {/* Brief Listening Modal */}
      <Modal
        visible={showBriefModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDismissBriefModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>🎧</Text>
            <Text style={styles.modalTitle}>Brief du matin</Text>
            <Text style={styles.modalMessage}>
              Votre brief quotidien est prêt. Voulez-vous l'écouter maintenant ?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleDismissBriefModal}
              >
                <Text style={styles.modalButtonTextSecondary}>Plus tard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleListenFromModal}
                disabled={isLoadingAudio}
              >
                {isLoadingAudio ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>🔊 Écouter</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Audio Control Modal */}
      <Modal
        visible={showAudioControlModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseAudioModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.audioControlContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleCloseAudioModal}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.audioControlIcon}>🎧</Text>
            <Text style={styles.audioControlTitle}>Brief du matin</Text>
            
            {isLoadingAudio ? (
              <>
                <ActivityIndicator size="large" color="#007AFF" style={styles.audioLoader} />
                <Text style={styles.audioControlSubtitle}>Chargement de l'audio...</Text>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.playPauseButton}
                  onPress={handleTogglePlayPause}
                >
                  <Text style={styles.playPauseIcon}>
                    {isPlayingAudio ? '⏸️' : '▶️'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.audioControlSubtitle}>
                  {isPlayingAudio ? 'En cours de lecture...' : 'En pause'}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '400',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  naturalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  naturalInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingRight: 12,
  },
  parseButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parseButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  parseButtonText: {
    fontSize: 20,
  },
  addButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    marginBottom: 16, // Less margin when editing
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  inputLabelContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 20,
    marginBottom: 40,
    height: 60,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  aiButton: {
    backgroundColor: '#F2F2F7',
    padding: 10,
    borderRadius: 12,
  },
  aiButtonText: {
    fontSize: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  taskList: {
    gap: 4,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
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
  audioControlContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#8E8E93',
    fontWeight: '600',
  },
  audioControlIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  audioControlTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 24,
    textAlign: 'center',
  },
  audioControlSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  audioLoader: {
    marginVertical: 20,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playPauseIcon: {
    fontSize: 36,
  },
});
