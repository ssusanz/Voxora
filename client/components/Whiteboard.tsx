import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

// 白板条目
interface WhiteboardItem {
  id: string;
  type: 'text' | 'doodle';
  content: string;
  author: string;
  timestamp: Date;
}

interface WhiteboardProps {
  items?: WhiteboardItem[];
  onAddText?: (text: string) => void;
  onAddDoodle?: () => void;
  isEditable?: boolean;
}

export default function Whiteboard({ 
  items = [], 
  onAddText,
  onAddDoodle,
  isEditable = true 
}: WhiteboardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');

  const handleSubmit = () => {
    if (newText.trim() && onAddText) {
      onAddText(newText.trim());
      setNewText('');
      setIsAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 标题栏 */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="create-outline" size={18} color="#7C6AFF" />
          <Text style={styles.title}>家庭白板</Text>
        </View>
        {isEditable && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsAdding(true)}
            >
              <Ionicons name="text" size={18} color="#7C6AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onAddDoodle}
            >
              <Ionicons name="brush" size={18} color="#7C6AFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 内容区 - 使用 ScrollView 避免布局测量错误 */}
      <View style={styles.content}>
        {items.length === 0 && !isAdding ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#E0E0E0" />
            <Text style={styles.emptyText}>家庭共同目标</Text>
            <Text style={styles.emptyHint}>点击上方图标添加</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 现有条目 */}
            {items.map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemContent}>
                  {item.type === 'text' ? (
                    <Text style={styles.itemText}>{item.content}</Text>
                  ) : (
                    <View style={styles.doodlePlaceholder}>
                      <Ionicons name="image" size={24} color="#7C6AFF" />
                    </View>
                  )}
                </View>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemAuthor}>{item.author}</Text>
                  <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
                </View>
              </View>
            ))}

            {/* 添加输入框 - 放在列表底部，避免固定高度导致的布局问题 */}
            {isAdding && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="写下家庭目标..."
                  placeholderTextColor="#999"
                  value={newText}
                  onChangeText={setNewText}
                  multiline
                  autoFocus
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={handleSubmit}
                />
                <View style={styles.inputActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsAdding(false);
                      setNewText('');
                    }}
                  >
                    <Ionicons name="close" size={18} color="#999" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    minHeight: 120,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: '#E0E0E0',
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  textInput: {
    fontSize: 14,
    color: '#333',
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7C6AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 12,
  },
  itemContent: {
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  doodlePlaceholder: {
    height: 60,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemAuthor: {
    fontSize: 11,
    color: '#7C6AFF',
    fontWeight: '500',
  },
  itemTime: {
    fontSize: 11,
    color: '#999',
  },
});
