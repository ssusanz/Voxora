/**
 * 统一的 Toast 提示 hook
 * 封装 react-native-toast-message，提供更简洁的 API
 */
import Toast from 'react-native-toast-message';

export const useToast = () => {
  const showSuccess = (message: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      visibilityTime: 2000,
    });
  };

  const showError = (message: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      visibilityTime: 2500,
    });
  };

  const showInfo = (message: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      visibilityTime: 2000,
    });
  };

  return {
    showSuccess,
    showError,
    showInfo,
  };
};
