import * as React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface TaskItemProps {
  content: string;
  priority?: string;
  onEdit?: () => void;
  isCompleted?: boolean;
}

export default function TaskItem({ content, priority, onEdit, isCompleted = false }: TaskItemProps) {
  const getPriorityColor = () => {
    switch (priority) {
      case 'CRITICAL':
        return '#FF3B30'; // Rouge
      case 'HIGH':
        return '#FF9500'; // Orange
      case 'MEDIUM':
        return '#007AFF'; // Bleu
      case 'LOW':
        return '#34C759'; // Vert
      default:
        return '#8E8E93'; // Gris par défaut
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, isCompleted && styles.completedContainer]} 
      onPress={onEdit}
      activeOpacity={0.7}
    >
      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor() }]} />
      <Text style={[styles.content, isCompleted && styles.completedText]} numberOfLines={2}>
        {content}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  completedContainer: {
    backgroundColor: '#F2F2F7',
    opacity: 0.6,
  },
  priorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    lineHeight: 22,
  },
  completedText: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
});
