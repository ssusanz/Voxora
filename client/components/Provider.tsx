import { AuthProvider } from '@/contexts/AuthContext';
import { type ReactNode, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import { WebOnlyColorSchemeUpdater } from './ColorSchemeUpdater';
import { initI18n } from '@/locales/i18n';

function Provider({ children }: { children: ReactNode }) {
  const [i18nInitialized, setI18nInitialized] = useState(false);

  useEffect(() => {
    // 初始化 i18n
    initI18n().then(() => {
      setI18nInitialized(true);
    });
  }, []);

  // 如果 i18n 还未初始化，显示加载中
  if (!i18nInitialized) {
    return (
      <WebOnlyColorSchemeUpdater>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8FA' }}>
          <ActivityIndicator size="large" color="#7C6AFF" />
        </View>
      </WebOnlyColorSchemeUpdater>
    );
  }

  return <WebOnlyColorSchemeUpdater>
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {children}
      </GestureHandlerRootView>
    </AuthProvider>
  </WebOnlyColorSchemeUpdater>
}

export {
  Provider,
}
