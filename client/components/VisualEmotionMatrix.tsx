import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// 颜色选项
const COLORS = [
  { id: 'warm', color: '#FFB74D', label: '温暖', icon: 'sunny' },
  { id: 'cool', color: '#64B5F6', label: '清凉', icon: 'water' },
  { id: 'vibrant', color: '#FF7B8A', label: '活力', icon: 'heart' },
  { id: 'peaceful', color: '#81C784', label: '宁静', icon: 'leaf' },
  { id: 'mysterious', color: '#7C6AFF', label: '神秘', icon: 'sparkles' },
  { id: 'soft', color: '#F8BBD9', label: '柔和', icon: 'flower' },
];

// 天气选项
const WEATHER_ICONS: Array<{ id: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { id: 'sunny', icon: 'sunny', label: '晴' },
  { id: 'cloudy', icon: 'cloud-outline', label: '阴' },
  { id: 'rainy', icon: 'rainy', label: '雨' },
  { id: 'snowy', icon: 'snow-outline', label: '雪' },
  { id: 'windy', icon: 'thunderstorm-outline', label: '风' },
  { id: 'foggy', icon: 'cloud', label: '雾' },
];

// 感官图标
const SENSORY_ICONS: Array<{ id: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { id: 'music', icon: 'musical-notes', label: '音乐' },
  { id: 'food', icon: 'restaurant', label: '美食' },
  { id: 'coffee', icon: 'cafe', label: '咖啡' },
  { id: 'book', icon: 'book', label: '阅读' },
  { id: 'nature', icon: 'leaf', label: '自然' },
  { id: 'pet', icon: 'paw', label: '宠物' },
];

interface VisualEmotionMatrixProps {
  selectedColor?: string;
  selectedWeather?: string;
  selectedSensory?: string;
  onColorSelect: (colorId: string) => void;
  onWeatherSelect: (weatherId: string) => void;
  onSensorySelect: (sensoryId: string) => void;
}

interface SelectionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isSelected: boolean;
  color?: string;
  onPress: () => void;
}

function SelectionButton({ icon, label, isSelected, color = '#7C6AFF', onPress }: SelectionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.selectionButton,
        isSelected && { borderColor: color, borderWidth: 2 }
      ]}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: isSelected ? `${color}20` : '#F5F5F5' }
        ]}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={isSelected ? color : '#999'} 
          />
        </View>
        <Text style={[
          styles.selectionLabel,
          isSelected && { color: color, fontWeight: '600' }
        ]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function VisualEmotionMatrix({
  selectedColor,
  selectedWeather,
  selectedSensory,
  onColorSelect,
  onWeatherSelect,
  onSensorySelect,
}: VisualEmotionMatrixProps) {
  return (
    <View style={styles.container}>
      {/* 颜色选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>选择颜色</Text>
        <View style={styles.grid}>
          {COLORS.map((item) => (
            <SelectionButton
              key={item.id}
              icon={item.icon as keyof typeof Ionicons.glyphMap}
              label={item.label}
              isSelected={selectedColor === item.id}
              color={item.color}
              onPress={() => onColorSelect(item.id)}
            />
          ))}
        </View>
      </View>

      {/* 天气选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>选择天气</Text>
        <View style={styles.grid}>
          {WEATHER_ICONS.map((item) => (
            <SelectionButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isSelected={selectedWeather === item.id}
              onPress={() => onWeatherSelect(item.id)}
            />
          ))}
        </View>
      </View>

      {/* 感官选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>选择感官</Text>
        <View style={styles.grid}>
          {SENSORY_ICONS.map((item) => (
            <SelectionButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isSelected={selectedSensory === item.id}
              onPress={() => onSensorySelect(item.id)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectionButton: {
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectionLabel: {
    fontSize: 11,
    color: '#666',
  },
});
