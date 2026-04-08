import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

import EmotionPicker, { EmotionType } from '@/components/EmotionPicker';
import VisualEmotionMatrix from '@/components/VisualEmotionMatrix';

interface MemoryFormData {
  title: string;
  images: string[];
  emotion?: EmotionType;
  color?: string;
  weather?: string;
  sensory?: string;
  isSealed: boolean;
  unlockDate?: Date;
  location: string;
}

export default function AddMemoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ emotion?: string }>();
  
  const [formData, setFormData] = useState<MemoryFormData>({
    title: '',
    images: [],
    emotion: (params.emotion as EmotionType) || undefined,
    isSealed: false,
    unlockDate: undefined,
    location: '',
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showVisualMatrix, setShowVisualMatrix] = useState(false);

  // 更新表单数据
  const updateForm = useCallback((key: keyof MemoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // 选择图片
  const handlePickImage = async () => {
    // TODO: 实现图片选择
    console.log('选择图片');
  };

  // 提交回忆
  const handleSubmit = useCallback(async () => {
    // 调用 API 保存回忆
    console.log('保存回忆:', formData);
    router.back();
  }, [formData, router]);

  // 判断是否为纯情感记录（无图片、无文字）
  const isPureEmotion = !formData.title && formData.images.length === 0;

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>记录此刻</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          style={[styles.submitButton, isPureEmotion && styles.submitButtonDisabled]}
          disabled={isPureEmotion}
        >
          <Text style={[styles.submitText, isPureEmotion && styles.submitTextDisabled]}>
            完成
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 图片上传区 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>上传照片</Text>
          <TouchableOpacity 
            style={styles.imageUploadArea}
            onPress={handlePickImage}
            activeOpacity={0.8}
          >
            {formData.images.length === 0 ? (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="camera" size={40} color="#CCC" />
                <Text style={styles.uploadText}>添加照片或视频</Text>
                <Text style={styles.uploadHint}>记录美好瞬间</Text>
              </View>
            ) : (
              <View style={styles.imagesPreview}>
                <Image 
                  source={{ uri: formData.images[0] }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                {formData.images.length > 1 && (
                  <View style={styles.moreImagesBadge}>
                    <Text style={styles.moreImagesText}>+{formData.images.length - 1}</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 标题输入 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>标题</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="为这段回忆起个名字..."
            placeholderTextColor="#CCC"
            value={formData.title}
            onChangeText={(text) => updateForm('title', text)}
            maxLength={50}
          />
        </View>

        {/* 情感选择 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>情感记录</Text>
            <TouchableOpacity 
              onPress={() => setShowVisualMatrix(!showVisualMatrix)}
              style={styles.matrixToggle}
            >
              <Ionicons 
                name={showVisualMatrix ? 'grid' : 'apps'} 
                size={18} 
                color="#7C6AFF" 
              />
              <Text style={styles.matrixToggleText}>
                {showVisualMatrix ? '简化模式' : '感官矩阵'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showVisualMatrix ? (
            <VisualEmotionMatrix
              selectedColor={formData.color}
              selectedWeather={formData.weather}
              selectedSensory={formData.sensory}
              onColorSelect={(id) => updateForm('color', id)}
              onWeatherSelect={(id) => updateForm('weather', id)}
              onSensorySelect={(id) => updateForm('sensory', id)}
            />
          ) : (
            <EmotionPicker
              selectedEmotion={formData.emotion}
              onSelect={(emotion) => updateForm('emotion', emotion)}
            />
          )}
        </View>

        {/* 位置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>位置</Text>
          <View style={styles.locationInput}>
            <Ionicons name="location" size={20} color="#7C6AFF" />
            <TextInput
              style={styles.locationTextInput}
              placeholder="添加位置..."
              placeholderTextColor="#CCC"
              value={formData.location}
              onChangeText={(text) => updateForm('location', text)}
            />
          </View>
        </View>

        {/* 封存选项 */}
        <View style={styles.section}>
          <View style={styles.sealOption}>
            <View style={styles.sealInfo}>
              <View style={styles.sealIconContainer}>
                <Ionicons name="time" size={22} color="#7C6AFF" />
              </View>
              <View style={styles.sealTextContainer}>
                <Text style={styles.sealTitle}>封存回忆</Text>
                <Text style={styles.sealDescription}>
                  将这段情感设定在特定日期解锁
                </Text>
              </View>
            </View>
            <Switch
              value={formData.isSealed}
              onValueChange={(value) => updateForm('isSealed', value)}
              trackColor={{ false: '#E0E0E0', true: '#B39DDB' }}
              thumbColor={formData.isSealed ? '#7C6AFF' : '#FFF'}
            />
          </View>
          
          {formData.isSealed && (
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={18} color="#7C6AFF" />
              <Text style={styles.datePickerText}>
                {formData.unlockDate 
                  ? formData.unlockDate.toLocaleDateString('zh-CN')
                  : '选择解锁日期'
                }
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>

        {/* 非语言用户提示 */}
        <View style={styles.aphasiaTip}>
          <View style={styles.tipIcon}>
            <Ionicons name="hand-left" size={20} color="#7C6AFF" />
          </View>
          <Text style={styles.tipText}>
            即使不输入任何文字，通过选择颜色、天气和感官图标，你也能完成一次完整的情感记录。家人会收到你的情感快照。
          </Text>
        </View>
      </ScrollView>

      {/* 日期选择器 */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.unlockDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) updateForm('unlockDate', date);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F3',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#7C6AFF',
    borderRadius: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  submitTextDisabled: {
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  matrixToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    borderRadius: 12,
  },
  matrixToggleText: {
    fontSize: 12,
    color: '#7C6AFF',
    fontWeight: '500',
  },
  imageUploadArea: {
    height: 180,
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F0F0F3',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 12,
    color: '#CCC',
    marginTop: 4,
  },
  imagesPreview: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  moreImagesBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  moreImagesText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  titleInput: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  locationTextInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  sealOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sealIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sealTextContainer: {
    flex: 1,
  },
  sealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  sealDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  datePickerText: {
    flex: 1,
    fontSize: 14,
    color: '#7C6AFF',
  },
  aphasiaTip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 106, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 106, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
