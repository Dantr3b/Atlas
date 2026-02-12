import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Header from '../components/Header';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import { api, Task } from '../lib/api';

export default function InboxScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const { tasks } = await api.getInboxTasks();
      setTasks(tasks);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des tâches');
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

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalVisible(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, taskData);
      }
      fetchData(); // Refresh list
    } catch (err) {
      throw err; // Let modal handle error
    }
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
      <Header />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.subtitle}>
            {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} non planifiée{tasks.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.taskList}>
          {tasks.length > 0 ? (
            (() => {
              const getPriorityLabel = (priority: number): string => {
                if (priority >= 8) return 'CRITICAL';
                if (priority >= 6) return 'HIGH';
                if (priority >= 4) return 'MEDIUM';
                if (priority >= 1) return 'LOW';
                return 'LOW';
              };

              return tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  content={task.content}
                  priority={getPriorityLabel(task.priority)}
                  onEdit={() => handleEditTask(task)}
                />
              ));
            })()
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune tâche dans l'inbox.</Text>
              <Text style={styles.emptySubtext}>
                Les nouvelles tâches apparaîtront ici.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TaskModal
        visible={isTaskModalVisible}
        task={editingTask}
        onClose={() => setIsTaskModalVisible(false)}
        onSave={handleSaveTask}
      />
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
  headerSection: {
    marginBottom: 24,
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
  taskList: {
    gap: 4,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#1C1C1E',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#8E8E93',
    fontSize: 14,
  },
});
