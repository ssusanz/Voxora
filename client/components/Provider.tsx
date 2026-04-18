import { AuthProvider } from '@/contexts/AuthContext';
import { type ReactNode, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebOnlyColorSchemeUpdater } from './ColorSchemeUpdater';
import { initI18n } from '@/locales/i18n';

function Provider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void initI18n();
  }, []);

  /** 始终挂载子树：`i18n` 已在 `i18n.ts` 模块加载时同步 init，此处仅恢复 AsyncStorage 语言。若在 init 完成前用占位替换整个子树，会导致 `<Stack>` 卸载再挂载，易与 Expo Router + `useTranslation` 触发「Too many re-renders」。 */
  return (
    <WebOnlyColorSchemeUpdater>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>
      </AuthProvider>
    </WebOnlyColorSchemeUpdater>
  );
}

export {
  Provider,
}
