import * as React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface TaskItemProps {
  content: string;
  priority: number;
  onPress?: () => void;
  onEdit?: () => void;
}

export default function TaskItem({ content, priority, onPress, onEdit }: TaskItemProps) {
  const getPriorityColor = (p: number) => {
    if (p >= 4) return '#FF3B30'; // Red
    if (p >= 2) return '#FF9500'; // Orange
    return '#34C759'; // Green
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.contentTouchable} 
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={[styles.priorityLine, { backgroundColor: getPriorityColor(priority) }]} />
        <View style={styles.contentContainer}>
          <Text style={styles.taskText} numberOfLines={2}>
            {content}
          </Text>
        </View>
      </TouchableOpacity>
      
      {onEdit && (
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Feather name="edit-2" size={20} color="#8E8E93" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    // Android Shadow
    elevation: 2,
    height: 70,
  },
  contentTouchable: {
    flex: 1,
    flexDirection: 'row',
  },
  priorityLine: {
    width: 6,
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  taskText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    lineHeight: 22,
  },
  editButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F2F2F7',
  },
});
