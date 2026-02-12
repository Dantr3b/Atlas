import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Switch,
} from 'react-native';
import { Task } from '../lib/api';
import { Feather } from '@expo/vector-icons';

interface TaskModalProps {
  visible: boolean;
  task: Task | null; // If null, we are in CREATE mode
  prefillData?: Partial<Task> | null; // Optional pre-fill data for CREATE mode
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
}

const STATUS_OPTIONS: { label: string; value: Task['status'] }[] = [
  { label: 'Inbox', value: 'INBOX' },
  { label: 'Planifié', value: 'PLANNED' },
  { label: 'En cours', value: 'IN_PROGRESS' },
  { label: 'Terminé', value: 'COMPLETED' },
];

const TYPE_OPTIONS: { label: string; value: NonNullable<Task['type']> }[] = [
  { label: 'Vite fait', value: 'QUICK' },
  { label: 'Deep Work', value: 'DEEP_WORK' },
  { label: 'Cours', value: 'COURSE' },
  { label: 'Admin', value: 'ADMIN' },
];

const CONTEXT_OPTIONS: { label: string; value: Task['context'] }[] = [
  { label: 'Perso', value: 'PERSONAL' },
  { label: 'Travail', value: 'WORK' },
  { label: 'Apprentissage', value: 'LEARNING' },
];

export default function TaskModal({ visible, task, prefillData, onClose, onSave }: TaskModalProps) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<Task['status']>('INBOX');
  const [type, setType] = useState<Task['type'] | undefined>(undefined);
  const [context, setContext] = useState<Task['context']>('PERSONAL');
  const [priority, setPriority] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');
  const [deadline, setDeadline] = useState<string>('');
  // We use a boolean toggle for "Today" assignment
  const [isToday, setIsToday] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);

  // Reset or populate form when visible/task changes
  useEffect(() => {
    if (visible) {
      if (task) {
        // EDIT Mode
        setContent(task.content);
        setStatus(task.status);
        setType(task.type);
        setContext(task.context);
        setPriority(task.priority);
        setEstimatedDuration(task.estimatedDuration ? task.estimatedDuration.toString() : '');
        setDeadline(task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '');
        
        // Check if assignedDate is today
        if (task.assignedDate) {
          const taskDate = new Date(task.assignedDate).toISOString().split('T')[0];
          const today = new Date().toISOString().split('T')[0];
          setIsToday(taskDate === today);
        } else {
          setIsToday(false);
        }
      } else if (prefillData) {
        // CREATE Mode with prefill data (from Gemini parsing)
        setContent(prefillData.content || '');
        setStatus(prefillData.status || 'INBOX');
        setType(prefillData.type);
        setContext(prefillData.context || 'PERSONAL');
        setPriority(prefillData.priority || 0);
        setEstimatedDuration(prefillData.estimatedDuration ? prefillData.estimatedDuration.toString() : '');
        setDeadline(prefillData.deadline ? new Date(prefillData.deadline).toISOString().split('T')[0] : '');
        setIsToday(false); // Gemini doesn't set assignedDate directly
      } else {
        // CREATE Mode - Reset defaults
        setContent('');
        setStatus('INBOX');
        setType(undefined);
        setContext('PERSONAL');
        setPriority(0);
        setEstimatedDuration('');
        setDeadline('');
        setIsToday(false); // Default to false or true based on preference? User asked for toggle.
      }
    }
  }, [visible, task]);

  const toggleToday = () => setIsToday(!isToday);

  const handleSave = async () => {
    if (!content.trim()) return;
    
    setIsSaving(true);
    try {
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const taskData: Partial<Task> = {
        content: content.trim(),
        status,
        type,
        context,
        priority,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration, 10) : undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        assignedDate: isToday ? new Date(todayDate).toISOString() : undefined,
      };
      
      await onSave(taskData);
      onClose();
    } catch (error) {
      console.error('Failed to save task', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const OptionSelector = ({ 
    label, 
    options, 
    selectedValue, 
    onSelect 
  }: { 
    label: string, 
    options: { label: string, value: any }[], 
    selectedValue: any, 
    onSelect: (val: any) => void 
  }) => (
    <View style={styles.optionContainer}>
      <Text style={styles.optionLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionScroll}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionButton,
              selectedValue === opt.value && styles.optionButtonSelected
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[
              styles.optionText,
              selectedValue === opt.value && styles.optionTextSelected
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* Content Input */}
            <Text style={styles.inputLabel}>Contenu</Text>
            <TextInput
              style={styles.input}
              value={content}
              onChangeText={setContent}
              placeholder="Qu'avez-vous en tête ?"
              multiline
            />

            {/* Status */}
            <OptionSelector 
              label="Statut" 
              options={STATUS_OPTIONS} 
              selectedValue={status} 
              onSelect={setStatus} 
            />

            {/* Type */}
            <OptionSelector 
              label="Type" 
              options={TYPE_OPTIONS} 
              selectedValue={type} 
              onSelect={setType} 
            />

            {/* Context */}
            <OptionSelector 
              label="Contexte" 
              options={CONTEXT_OPTIONS} 
              selectedValue={context} 
              onSelect={setContext} 
            />

            {/* Priority & Duration Row */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Priorité (0-10)</Text>
                <View style={styles.numberInputContainer}>
                  <TouchableOpacity onPress={() => setPriority(Math.max(0, priority - 1))} style={styles.stepperButton}>
                    <Feather name="minus" size={16} color="#007AFF" />
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{priority}</Text>
                  <TouchableOpacity onPress={() => setPriority(Math.min(10, priority + 1))} style={styles.stepperButton}>
                    <Feather name="plus" size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Durée (min)</Text>
                <TextInput
                  style={styles.numberTextInput}
                  value={estimatedDuration}
                  onChangeText={setEstimatedDuration}
                  placeholder="Ex: 30"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Dates Row */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Dates</Text>
              
              <View style={styles.dateRow}>
                <View style={[styles.halfInput, styles.toggleContainer]}>
                  <Text style={styles.subLabel}>Faire aujourd'hui</Text>
                  <Switch
                    trackColor={{ false: '#767577', true: '#34C759' }}
                    thumbColor={isToday ? '#fff' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={toggleToday}
                    value={isToday}
                  />
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.subLabel}>Date limite (Deadline)</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={deadline}
                    onChangeText={setDeadline}
                    placeholder="Optionnel"
                  />
                </View>
              </View>
            </View>

            <View style={styles.spacer} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.disabledButton]} 
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contentScroll: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  simpleInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 24,
  },
  optionContainer: {
    marginBottom: 24,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionScroll: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: '#E1F0FF',
    borderColor: '#007AFF',
  },
  optionText: {
    color: '#1C1C1E',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    height: 50,
  },
  stepperButton: {
    padding: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  numberValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  numberTextInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    height: 50,
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 6,
  },
  toggleContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  dateInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1C1C1E',
  },
  spacer: {
    height: 100, // Space for footer
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff', // Opaque footer
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  saveButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
