import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInUp, 
  FadeOutUp 
} from 'react-native-reanimated';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// 全局 Toast 状态管理器
let setToastExternally: ((toast: ToastData | null) => void) | null = null;

export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (setToastExternally) {
    const toast: ToastData = {
      id: Date.now().toString(),
      message,
      type,
    };
    setToastExternally(toast);
  }
};

// Toast 容器组件（需要在 App 根组件中使用）
export function ToastContainer() {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    setToastExternally = (newToast) => {
      setToast(newToast);
    };
    return () => {
      setToastExternally = null;
    };
  }, []);

  return (
    <>
      {toast && (
        <Animated.View
          entering={FadeInUp.duration(200)}
          exiting={FadeOutUp.duration(200)}
          style={[styles.container, toast.type === 'error' && styles.containerError]}
        >
          <Ionicons 
            name={
              toast.type === 'success' ? 'checkmark-circle' : 
              toast.type === 'error' ? 'alert-circle' : 
              'information-circle'
            } 
            size={20} 
            color="#FFF" 
          />
          <Text style={styles.message}>{toast.message}</Text>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  containerError: {
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
  },
  message: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
