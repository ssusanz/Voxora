import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import { I18nextProvider } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import i18n from '@/locales/i18n';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

function RootNavigator() {
  const { t } = useTranslation();

  return (
    <Provider>
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ title: '' }} />
        <Stack.Screen
          name="add-memory"
          options={{
            title: t('addMemory.fabLabel'),
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="memory-detail"
          options={{
            title: t('memoryDetail.title'),
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="nfc"
          options={{
            title: t('nfc.title'),
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="vlog"
          options={{
            title: t('vlog.title'),
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="photo-viewer"
          options={{
            title: t('common.photoViewer'),
            animation: 'fade',
            presentation: 'card',
          }}
        />
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
