import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import EmotionPicker, { EmotionType } from '@/components/EmotionPicker';
import VisualEmotionMatrix from '@/components/VisualEmotionMatrix';
import VoiceInput from '@/components/VoiceInput';
import { createFormDataFile } from '@/utils';
import { useToast } from '@/hooks/useToast';
import { getBackendBaseUrl } from '@/utils/backend';

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ 
    emotion?: string;
    editId?: string;
    title?: string;
    mood?: string;
    location?: string;
    date?: string;
    images?: string[];
  }>();
  const { showSuccess, showError, showInfo } = useToast();

  // 判断是否为编辑模式
  const isEditMode = !!params.editId;
  
  // 解析传入的图片数组
  const parseImages = (): string[] => {
    if (!params.images) return [];
    if (Array.isArray(params.images)) return params.images;
    try {
      return JSON.parse(params.images);
    } catch {
      return [];
    }
  };

  const [formData, setFormData] = useState<MemoryFormData>({
    title: params.title || '',
    images: parseImages(),
    emotion: (params.emotion || params.mood) as EmotionType || undefined,
    isSealed: false,
    unlockDate: undefined,
    location: params.location || '',
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showVisualMatrix, setShowVisualMatrix] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // 更新表单数据
  const updateForm = useCallback((key: keyof MemoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  // 语音输入处理（提取模式）
  const handleVoiceComplete = useCallback(async (data: { transcription: string; extractedInfo: any }) => {
    setIsProcessingVoice(true);

    try {
      const { transcription, extractedInfo } = data;

      console.log('语音识别成功:', transcription);
      console.log('提取的信息:', extractedInfo);

      // 智能填充表单
      setFormData(prev => ({
        ...prev,
        title: extractedInfo?.title || prev.title,
        emotion: extractedInfo?.emotion || prev.emotion,
        color: extractedInfo?.color || prev.color,
        weather: extractedInfo?.weather || prev.weather,
        sensory: extractedInfo?.sensory || prev.sensory,
      }));

      // 提示用户
      showSuccess(t('addMemory.voiceSuccess'));
    } catch (error: any) {
      console.error('语音处理失败:', error);
      showError(t('addMemory.voiceFailed'));
    } finally {
      setIsProcessingVoice(false);
    }
  }, []);

  // 选择图片（支持多选）
  const handlePickImage = async () => {
    try {
      // 请求相册权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(t('addMemory.permissionDenied'));
        return;
      }

      // 选择图片（支持多选）
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 9, // 最多选择 9 张
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map(asset => asset.uri);
        console.log('选择图片成功:', newImages.length, '张');

        // 更新表单数据：如果已有图片，追加新图片；如果没有，直接设置
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages].slice(0, 9), // 最多 9 张
        }));
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      showError(t('addMemory.selectFailed'));
    }
  };

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // 提交回忆
  const handleSubmit = useCallback(async () => {
    try {
      console.log('开始保存回忆:', formData, '编辑模式:', isEditMode);

      // 1. 上传新图片（如果有）
      const uploadedUrls: string[] = [];
      for (let i = 0; i < formData.images.length; i++) {
        const imageUri = formData.images[i];
        
        // 跳过已经是 URL 的图片
        if (imageUri.startsWith('http')) {
          uploadedUrls.push(imageUri);
          continue;
        }
        
        const fileName = `memory_${Date.now()}_${i}.jpg`;
        const file = await createFormDataFile(imageUri, fileName, 'image/jpeg');
        const formDataFile = new FormData();
        formDataFile.append('file', file as any);

        const uploadRes = await fetch(`${getBackendBaseUrl()}/api/v1/upload/image`, {
          method: 'POST',
          body: formDataFile,
        });

        if (!uploadRes.ok) {
          const errJson = (await uploadRes.json().catch(() => ({}))) as {
            message?: string;
            error?: string;
          };
          const detail =
            (typeof errJson.message === 'string' && errJson.message) ||
            (typeof errJson.error === 'string' && errJson.error) ||
            `HTTP ${uploadRes.status}`;
          throw new Error(`图片 ${i + 1} 上传失败：${detail}`);
        }

        const uploadData = await uploadRes.json();
        uploadedUrls.push(uploadData.url);
        console.log(`图片 ${i + 1} 上传成功:`, uploadData.url);
      }

      // 2. 保存回忆到数据库
      const memoryData = {
        title: formData.title || t('common.untitled'),
        date: new Date().toISOString().split('T')[0],
        location: formData.location || '',
        weather: formData.weather || 'sunny',
        mood: formData.emotion || 'happy',
        images: uploadedUrls,
        userId: 'user_1',
        familyId: 'family_1',
        isSealed: formData.isSealed,
        unlockDate: formData.unlockDate?.toISOString() || null,
      };

      let savedMemory;
      if (isEditMode && params.editId) {
        // 编辑模式：调用更新 API
        /**
         * 服务端文件：server/src/routes/memories.ts
         * 接口：PUT /api/v1/memories/:id
         * Path 参数：id: string
         */
        const saveRes = await fetch(`${getBackendBaseUrl()}/api/v1/memories/${params.editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memoryData),
        });

        if (!saveRes.ok) {
          throw new Error('更新回忆失败');
        }

        savedMemory = await saveRes.json();
        console.log('回忆更新成功:', savedMemory);
        showSuccess(t('addMemory.updateSuccess'));
      } else {
        // 新建模式：调用创建 API
        /**
         * 服务端文件：server/src/routes/memories.ts
         * 接口：POST /api/v1/memories
         * Body 参数：title: string, date: string, location?: string, weather?: string, mood?: string, images?: string[], userId?: string, familyId?: string, isSealed?: boolean, unlockDate?: string
         */
        const saveRes = await fetch(`${getBackendBaseUrl()}/api/v1/memories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memoryData),
        });

        if (!saveRes.ok) {
          throw new Error('保存回忆失败');
        }

        savedMemory = await saveRes.json();
        console.log('回忆保存成功:', savedMemory);
        showSuccess(t('addMemory.saveSuccess'));
      }

      router.back();
    } catch (error: any) {
      console.error('保存回忆失败:', error);
      showError(error.message || t('addMemory.saveFailed'));
    }
  }, [formData, router, isEditMode, params.editId]);

  // 判断是否为纯情感记录（无图片、无文字）
  const isPureEmotion = !formData.title && formData.images.length === 0;

  return (
    <Screen safeAreaEdges={['top']} style={styles.screen}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? t('addMemory.editTitle') : t('addMemory.title')}</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          style={[styles.submitButton, isPureEmotion && styles.submitButtonDisabled]}
          disabled={isPureEmotion}
        >
          <Text style={[styles.submitText, isPureEmotion && styles.submitTextDisabled]}>
            {t('addMemory.complete')}
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
          <Text style={styles.sectionTitle}>{t('addMemory.uploadPhotos')}</Text>

          {/* 封面图 */}
          <TouchableOpacity
            style={[styles.coverImageContainer, formData.images.length === 0 && { flex: 1 }]}
            onPress={handlePickImage}
            activeOpacity={0.8}
          >
            {formData.images.length === 0 ? (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="camera" size={40} color="#CCC" />
                <Text style={styles.uploadText}>{t('addMemory.addPhotos')}</Text>
                <Text style={styles.uploadHint}>{t('addMemory.photoTip')}</Text>
              </View>
            ) : (
              <View style={styles.coverImageWrapper}>
                <Image
                  source={{ uri: formData.images[0] }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
                <View style={styles.coverLabel}>
                  <Text style={styles.coverLabelText}>{t('addMemory.cover')}</Text>
                </View>
                {/* 删除封面按钮 */}
                <TouchableOpacity
                  style={styles.deleteImageButton}
                  onPress={() => handleRemoveImage(0)}
                >
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          {/* 缩略图列表 */}
          {formData.images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailScrollView}
              contentContainerStyle={styles.thumbnailContainer}
            >
              {formData.images.slice(1).map((uri, index) => (
                <View key={`thumb-${index + 1}`} style={styles.thumbnailWrapper}>
                  <Image
                    source={{ uri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  {/* 删除按钮 */}
                  <TouchableOpacity
                    style={styles.deleteThumbnailButton}
                    onPress={() => handleRemoveImage(index + 1)}
                  >
                    <Ionicons name="close" size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* 添加更多按钮 */}
              {formData.images.length < 9 && (
                <TouchableOpacity
                  style={styles.addMoreButton}
                  onPress={handlePickImage}
                >
                  <Ionicons name="add" size={24} color="#999" />
                  <Text style={styles.addMoreText}>{t('addMemory.complete')}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {/* 添加更多提示（只有一张图时显示） */}
          {formData.images.length === 1 && (
            <TouchableOpacity
              style={styles.addMoreSingleButton}
              onPress={handlePickImage}
            >
              <Ionicons name="add-circle-outline" size={20} color="#7C6AFF" />
              <Text style={styles.addMoreSingleText}>{t('addMemory.addPhotos')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 标题输入 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>标题</Text>
          <View style={styles.titleInputContainer}>
            <TextInput
              style={styles.titleInput}
              placeholder="为这段回忆起个名字..."
              placeholderTextColor="#CCC"
              value={formData.title}
              onChangeText={(text) => updateForm('title', text)}
              maxLength={50}
            />
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={() => setShowVoiceInput(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isProcessingVoice ? "ellipsis-horizontal" : "mic"}
                size={20}
                color={isProcessingVoice ? "#999" : "#7C6AFF"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 情感选择 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('addMemory.emotion')}</Text>
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
                {showVisualMatrix ? t('addMemory.voiceTip') : t('addMemory.emotion')}
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
          <Text style={styles.sectionTitle}>{t('addMemory.location')}</Text>
          <View style={styles.locationInput}>
            <Ionicons name="location" size={20} color="#7C6AFF" />
            <TextInput
              style={styles.locationTextInput}
              placeholder={t('addMemory.enterLocation')}
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
                <Text style={styles.sealTitle}>{t('addMemory.sealMemory')}</Text>
                <Text style={styles.sealDescription}>
                  {t('addMemory.sealTip')}
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
                  : t('addMemory.selectDate')
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

      {/* 语音输入 */}
      <VoiceInput
        visible={showVoiceInput}
        onClose={() => setShowVoiceInput(false)}
        onComplete={handleVoiceComplete}
        mode="extract"
        title={t('addMemory.voiceInput')}
        subtitle={t('addMemory.voiceTip')}
      />
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  // 封面图容器
  coverImageContainer: {
    height: 200,
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F0F0F3',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  coverImageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverLabel: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(124, 106, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  coverLabelText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteImageButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 缩略图列表
  thumbnailScrollView: {
    marginTop: 12,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbnailWrapper: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  deleteThumbnailButton: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 添加更多按钮
  addMoreButton: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F8F8FA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  // 单张图时添加更多按钮
  addMoreSingleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    gap: 6,
  },
  addMoreSingleText: {
    fontSize: 13,
    color: '#7C6AFF',
    fontWeight: '500',
  },
  titleInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    paddingRight: 8,
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
