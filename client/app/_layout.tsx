import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { useMemo } from 'react';
import { Provider } from '@/components/Provider';
import { I18nextProvider } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import i18n from '@/locales/i18n';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

function RootNavigator() {
  const { t, i18n } = useTranslation();

  const stackScreenOptions = useMemo(
    () => ({
      animation: 'slide_from_right' as const,
      gestureEnabled: true,
      gestureDirection: 'horizontal' as const,
      headerShown: false,
    }),
    []
  );

  const addMemoryOptions = useMemo(
    () => ({
      title: t('addMemory.fabLabel'),
      animation: 'slide_from_bottom' as const,
      presentation: 'modal' as const,
    }),
    [i18n.language, t]
  );

  const memoryDetailOptions = useMemo(
    () => ({
      title: t('memoryDetail.title'),
      animation: 'fade' as const,
    }),
    [i18n.language, t]
  );

  const nfcOptions = useMemo(
    () => ({
      title: t('nfc.title'),
      animation: 'slide_from_bottom' as const,
      presentation: 'modal' as const,
    }),
    [i18n.language, t]
  );

  const vlogOptions = useMemo(
    () => ({
      title: t('vlog.title'),
      animation: 'slide_from_bottom' as const,
      presentation: 'modal' as const,
    }),
    [i18n.language, t]
  );

  const photoViewerOptions = useMemo(
    () => ({
      title: t('common.photoViewer'),
      animation: 'fade' as const,
      presentation: 'card' as const,
    }),
    [i18n.language, t]
  );

  const meetFutureDetailOptions = useMemo(
    () => ({
      title: t('home.futureDetailTitle'),
      animation: 'slide_from_right' as const,
    }),
    [i18n.language, t]
  );

  return (
    <Provider>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ title: '' }} />
        <Stack.Screen name="add-memory" options={addMemoryOptions} />
        <Stack.Screen name="memory-detail" options={memoryDetailOptions} />
        <Stack.Screen name="nfc" options={nfcOptions} />
        <Stack.Screen name="vlog" options={vlogOptions} />
        <Stack.Screen name="photo-viewer" options={photoViewerOptions} />
        <Stack.Screen name="meet-future-detail" options={meetFutureDetailOptions} />
      </Stack>
      <Toast />
    </Provider>
  );
}

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <RootNavigator />
    </I18nextProvider>
  );
}
