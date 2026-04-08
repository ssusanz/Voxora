import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Alert, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState } from 'react';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

const WEATHER_OPTIONS = [
  { id: 'sunny', label: '晴天', icon: 'sunny' as const, color: '#FFB74D' },
  { id: 'cloudy', label: '多云', icon: 'cloudy' as const, color: '#90A4AE' },
  { id: 'rainy', label: '雨天', icon: 'rainy' as const, color: '#5C6BC0' },
  { id: 'snowy', label: '雪天', icon: 'snow' as const, color: '#B3E5FC' },
  { id: 'clear', label: '夜晚', icon: 'moon' as const, color: '#7E57C2' },
];

const MOOD_OPTIONS = [
  { id: 'happy', label: '开心', icon: 'happy' as const, color: '#FFD54F' },
  { id: 'excited', label: '兴奋', icon: 'heart' as const, color: '#FF7B8A' },
  { id: 'peaceful', label: '平静', icon: 'leaf' as const, color: '#81C784' },
  { id: 'relaxed', label: '放松', icon: 'cafe' as const, color: '#FFAB91' },
  { id: 'grateful', label: '感恩', icon: 'star' as const, color: '#FFB74D' },
];

export default function AddMemoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  
  const [title, setTitle] = useState('');
  const [selectedWeather, setSelectedWeather] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sealed, setSealed] = useState(false);
  const [unlockDate, setUnlockDate] = useState<string | null>(null);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const recordAudio = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要麦克风权限才能录音');
      return;
    }
    Alert.alert('提示', '录音功能即将上线');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入回忆标题');
      return;
    }
    if (images.length === 0) {
      Alert.alert('提示', '请至少添加一张照片');
      return;
    }
    if (!selectedWeather) {
      Alert.alert('提示', '请选择天气');
      return;
    }
    if (!selectedMood) {
      Alert.alert('提示', '请选择心情');
      return;
    }

    // TODO: 调用 API 保存回忆
    Alert.alert('成功', '回忆已保存', [
      { text: '确定', onPress: () => router.back() }
    ]);
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'top']} style={styles.screen}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#2D3436" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>新增回忆</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 标题输入 */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Text style={styles.sectionLabel}>标题</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.titleInput}
                placeholder="给这个回忆起个名字..."
                placeholderTextColor="#B2AEAA"
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />
              <Text style={styles.charCount}>{title.length}/50</Text>
            </View>
          </Animated.View>

          {/* 天气选择 */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)}>
            <Text style={styles.sectionLabel}>天气</Text>
            <View style={styles.optionsRow}>
              {WEATHER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    selectedWeather === option.id && { backgroundColor: option.color + '20', borderColor: option.color }
                  ]}
                  onPress={() => setSelectedWeather(option.id)}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={24} 
                    color={selectedWeather === option.id ? option.color : '#8B8680'} 
                  />
                  <Text style={[
                    styles.optionLabel,
                    selectedWeather === option.id && { color: option.color }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* 心情选择 */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)}>
            <Text style={styles.sectionLabel}>心情</Text>
            <View style={styles.optionsRow}>
              {MOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    selectedMood === option.id && { backgroundColor: option.color + '20', borderColor: option.color }
                  ]}
                  onPress={() => setSelectedMood(option.id)}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={24} 
                    color={selectedMood === option.id ? option.color : '#8B8680'} 
                  />
                  <Text style={[
                    styles.optionLabel,
                    selectedMood === option.id && { color: option.color }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* 图片上传 */}
          <Animated.View entering={FadeInDown.delay(400).duration(300)}>
            <Text style={styles.sectionLabel}>照片</Text>
            <View style={styles.imagesGrid}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={22} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 9 && (
                <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                  <Ionicons name="add" size={32} color="#8B8680" />
                  <Text style={styles.addImageText}>添加照片</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* 音频录制 */}
          <Animated.View entering={FadeInDown.delay(500).duration(300)}>
            <Text style={styles.sectionLabel}>语音记录（可选）</Text>
            <TouchableOpacity style={styles.audioButton} onPress={recordAudio}>
              <View style={styles.audioIcon}>
                <Ionicons name={audioUri ? 'mic' : 'mic-outline'} size={24} color={audioUri ? '#FF6B6B' : '#7C6AFF'} />
              </View>
              <View style={styles.audioContent}>
                <Text style={styles.audioTitle}>
                  {audioUri ? '已录制语音' : '点击录制语音'}
                </Text>
                <Text style={styles.audioHint}>
                  {audioUri ? '可重新录制' : '记录当下的声音'}
                </Text>
              </View>
              {audioUri && (
                <TouchableOpacity onPress={() => setAudioUri(null)}>
                  <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* 时光胶囊 */}
          <Animated.View entering={FadeInDown.delay(600).duration(300)}>
            <TouchableOpacity 
              style={styles.capsuleToggle}
              onPress={() => setSealed(!sealed)}
            >
              <View style={styles.capsuleLeft}>
                <Ionicons name="time" size={22} color={sealed ? '#FFB74D' : '#8B8680'} />
                <View>
                  <Text style={styles.capsuleTitle}>时光胶囊</Text>
                  <Text style={styles.capsuleHint}>
                    {sealed ? '设为封存回忆' : '封存后可在特定日期解锁'}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.toggleSwitch,
                sealed && styles.toggleSwitchActive
              ]}>
                <View style={[
                  styles.toggleKnob,
                  sealed && styles.toggleKnobActive
                ]} />
              </View>
            </TouchableOpacity>
            
            {sealed && (
              <View style={styles.datePickerContainer}>
                <Ionicons name="calendar-outline" size={18} color="#7C6AFF" />
                <TextInput
                  style={styles.dateInput}
                  placeholder="选择解锁日期"
                  placeholderTextColor="#B2AEAA"
                  value={unlockDate || ''}
                  onChangeText={setUnlockDate}
                />
              </View>
            )}
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* 保存按钮 */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
            <LinearGradient
              colors={['#7C6AFF', '#9D91FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>保存回忆</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F3F0',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  scrollContent: {
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 12,
    marginTop: 20,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  titleInput: {
    fontSize: 16,
    color: '#2D3436',
    paddingRight: 50,
  },
  charCount: {
    position: 'absolute',
    right: 16,
    top: 16,
    fontSize: 12,
    color: '#B2AEAA',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 70,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B8680',
    marginTop: 4,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageItem: {
    width: (Dimensions.get('window').width - 48 - 30) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  addImageBtn: {
    width: (Dimensions.get('window').width - 48 - 30) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E6E3',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: '#8B8680',
    marginTop: 4,
  },
  audioButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  audioContent: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 2,
  },
  audioHint: {
    fontSize: 12,
    color: '#8B8680',
  },
  capsuleToggle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  capsuleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capsuleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 2,
  },
  capsuleHint: {
    fontSize: 12,
    color: '#8B8680',
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8E6E3',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#FFE0B2',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: '#2D3436',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#F5F3F0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});


