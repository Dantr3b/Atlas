import * as React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import TaskItem from '../components/TaskItem';
import { api, Task } from '../lib/api';

export default function HomeScreen() {
  const [taskInput, setTaskInput] = React.useState('');
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<{ name: string | null } | null>(null);

  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

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

  const handleAddTask = async () => {
    if (!taskInput.trim()) return;
    
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, { content: taskInput.trim() });
        setEditingTask(null);
      } else {
        await api.createTask(taskInput.trim());
      }
      setTaskInput('');
      fetchData(); // Refresh list
    } catch (err) {
      alert('Erreur lors de l\'enregistrement de la tâche');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskInput(task.content);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setTaskInput('');
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
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Atlas</Text>
        <View style={styles.profileCircle}>
          <Text style={styles.profileText}>
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}
          </Text>
        </View>
      </View>

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

        {/* Full-width Plus Button */}
        <TouchableOpacity 
          style={[styles.addButton, editingTask && styles.updateButton]} 
          activeOpacity={0.9}
          onPress={handleAddTask}
        >
          <Text style={styles.addButtonText}>
            {editingTask ? 'Modifier la tâche' : '+ Nouvelle tâche'}
          </Text>
        </TouchableOpacity>

        {/* Cancel Edit Button */}
        {editingTask && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            activeOpacity={0.7}
            onPress={handleCancelEdit}
          >
            <Text style={styles.cancelButtonText}>Annuler modification</Text>
          </TouchableOpacity>
        )}

        {/* AI Input Bar */}
        <View style={styles.inputLabelContainer}>
          <Text style={styles.inputLabel}>Assistant IA</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ex: 'Rappel pour mon cours à 14h'"
            placeholderTextColor="#A0A0A0"
            value={taskInput}
            onChangeText={setTaskInput}
            onSubmitEditing={handleAddTask}
          />
          <TouchableOpacity style={styles.aiButton}>
            <Text style={styles.aiButtonText}>🪄</Text>
          </TouchableOpacity>
        </View>

        {/* Aujourd'hui Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.taskList}>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskItem 
                key={task.id} 
                content={task.content} 
                priority={task.priority} 
                onEdit={() => handleEditTask(task)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune tâche pour aujourd'hui.</Text>
            </View>
          )}
        </View>

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
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  }
});
