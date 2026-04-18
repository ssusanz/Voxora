import { View, Text, ActivityIndicator } from 'react-native';

import { Screen } from '@/components/Screen';

export default function DemoPage() {
  return (
    <Screen statusBarStyle="auto">
      <View className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
        <ActivityIndicator size="large" color="#7C6AFF" />
        <Text className="text-base font-bold text-foreground mt-6">APP 开发中</Text>
        <Text className="text-sm mt-2 text-muted">即将为您呈现应用界面</Text>
      </View>
    </Screen>
  );
}
