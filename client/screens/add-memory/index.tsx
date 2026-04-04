import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { createFormDataFile } from '@/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
const API_BASE_URL =
  EXPO_PUBLIC_BACKEND_BASE_URL ||
  (Platform.OS === 'web'
    ? ''
    : 'http://localhost:9091');

interface MediaFile {
  uri: string;
  type: string;
  name: string;
}

export default function AddMemoryScreen() {
  const router = useSafeRouter();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);

  // 表单数据
  const [title, setTitle] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState('');
  const [mood, setMood] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [audioFile, setAudioFile] = useState<MediaFile | null>(null);

  // 获取天气选项
  const getWeatherOptions = () => {
    const options = t.addMemory.weatherOptions;
    return language === 'zh' 
      ? ['晴天', '多云', '雨天', '雪天', '阴天', '大风']
      : ['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Overcast', 'Windy'];
  };

  // 获取心情选项
  const getMoodOptions = () => {
    const options = t.addMemory.moodOptions;
    return language === 'zh'
      ? ['开心', '感动', '平静', '兴奋', '怀念', '温馨', '惊喜', '忧伤']
      : ['Happy', 'Touched', 'Peaceful', 'Excited', 'Nostalgic', 'Warm', 'Surprised', 'Sad'];
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset, index) => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          name: asset.type === 'video' ? `video_${Date.now()}_${index}.mp4` : `photo_${Date.now()}_${index}.jpg`,
        }));
        setMediaFiles([...mediaFiles, ...newFiles]);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert(t.error, t.addMemory.alertImagePickFailed);
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAudioFile({
          uri: asset.uri,
          type: asset.mimeType || 'audio/mpeg',
          name: asset.name || `audio_${Date.now()}.mp3`,
        });
      }
    } catch (error) {
      console.error('Failed to pick audio:', error);
      Alert.alert(t.error, t.addMemory.alertAudioPickFailed);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const removeAudio = () => {
    setAudioFile(null);
  };

  const uploadFiles = async (): Promise<{ mediaKeys: string[]; audioKey: string | null }> => {
    const mediaKeys: string[] = [];
    let audioKey: string | null = null;

    // 上传媒体文件
    for (const file of mediaFiles) {
      const formData = new FormData();
      const formDataFile = await createFormDataFile(file.uri, file.name, file.type);
      formData.append('file', formDataFile as any);

      /**
       * 服务端文件：server/src/routes/upload.ts
       * 接口：POST /api/v1/upload
       * FormData 参数：file: File
       */
      const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        mediaKeys.push(result.data.key);
      }
    }

    // 上传音频文件
    if (audioFile) {
      const formData = new FormData();
      const formDataFile = await createFormDataFile(audioFile.uri, audioFile.name, audioFile.type);
      formData.append('file', formDataFile as any);

      const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        audioKey = result.data.key;
      }
    }

    return { mediaKeys, audioKey };
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t.addMemory.alertTitleRequired);
      return;
    }

    if (!memoryDate) {
      Alert.alert(t.addMemory.alertDateRequired);
      return;
    }

    setLoading(true);
    try {
      // 先上传文件
      const { mediaKeys, audioKey } = await uploadFiles();

      // 创建回忆记录
      /**
       * 服务端文件：server/src/routes/memories.ts
       * 接口：POST /api/v1/memories
       * Body 参数：title: string, memory_date: string, location?: string, weather?: string, mood?: string, media_keys?: string[], audio_key?: string
       */
      const response = await fetch(`${API_BASE_URL}/api/v1/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          memory_date: memoryDate,
          location: location.trim() || null,
          weather: weather || null,
          mood: mood || null,
          media_keys: mediaKeys.length > 0 ? mediaKeys : null,
          audio_key: audioKey,
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert(t.success, t.addMemory.alertSaveSuccess, [
          { text: t.confirm, onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(t.error, result.error || t.addMemory.alertSaveFailed);
      }
    } catch (error) {
      console.error('Failed to save memory:', error);
      Alert.alert(t.error, t.addMemory.alertSaveFailed);
    } finally {
      setLoading(false);
    }
  };

  const weatherOptions = getWeatherOptions();
  const moodOptions = getMoodOptions();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* 背景 */}
          <LinearGradient
            colors={['rgba(123,110,246,0.1)', 'rgba(92,224,216,0.05)', 'transparent']}
            style={styles.background}
          />

          {/* 头部 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="x" size={24} color="#EEEAF6" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t.addMemory.title}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* 标题输入 */}
            <View style={styles.section}>
              <Text style={styles.label}>{t.addMemory.titleLabelRequired}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t.addMemory.titlePlaceholder}
                placeholderTextColor="#6B6880"
              />
            </View>

            {/* 日期和地点 */}
            <View style={styles.row}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.label}>{t.addMemory.dateLabelRequired}</Text>
                <TextInput
                  style={styles.input}
                  value={memoryDate}
                  onChangeText={setMemoryDate}
                  placeholder={t.addMemory.datePlaceholder}
                  placeholderTextColor="#6B6880"
                />
              </View>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.label}>{t.addMemory.locationLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder={t.addMemory.locationPlaceholder}
                  placeholderTextColor="#6B6880"
                />
              </View>
            </View>

            {/* 天气 */}
            <View style={styles.section}>
              <Text style={styles.label}>{t.addMemory.weatherLabel}</Text>
              <View style={styles.optionsGrid}>
                {weatherOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.optionChip,
                      weather === item && styles.optionChipActive,
                    ]}
                    onPress={() => setWeather(weather === item ? '' : item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        weather === item && styles.optionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 心情 */}
            <View style={styles.section}>
              <Text style={styles.label}>{t.addMemory.moodLabel}</Text>
              <View style={styles.optionsGrid}>
                {moodOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.optionChip,
                      mood === item && styles.optionChipActive,
                    ]}
                    onPress={() => setMood(mood === item ? '' : item)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        mood === item && styles.optionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 媒体文件 */}
            <View style={styles.section}>
              <Text style={styles.label}>{t.addMemory.mediaLabel}</Text>
              <View style={styles.mediaGrid}>
                {mediaFiles.map((file, index) => (
                  <View key={index} style={styles.mediaItem}>
                    {file.type.startsWith('image/') ? (
                      <Image source={{ uri: file.uri }} style={styles.mediaPreview} />
                    ) : (
                      <View style={styles.videoPreview}>
                        <Feather name="video" size={24} color="#7B6EF6" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeMedia(index)}
                    >
                      <Feather name="x" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addMediaButton} onPress={pickImage}>
                  <Feather name="plus" size={24} color="#8E8BA3" />
                  <Text style={styles.addMediaText}>{t.addMemory.addMedia}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 音频 */}
            <View style={styles.section}>
              <Text style={styles.label}>{t.addMemory.audioLabel}</Text>
              {audioFile ? (
                <View style={styles.audioItem}>
                  <MaterialCommunityIcons name="music-note" size={24} color="#7B6EF6" />
                  <Text style={styles.audioName} numberOfLines={1}>
                    {audioFile.name}
                  </Text>
                  <TouchableOpacity onPress={removeAudio}>
                    <Feather name="x" size={18} color="#8E8BA3" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addAudioButton} onPress={pickAudio}>
                  <Feather name="music" size={20} color="#8E8BA3" />
                  <Text style={styles.addAudioText}>{t.addMemory.addAudio}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* 保存按钮 */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7B6EF6', '#5CE0D8']}
                style={styles.saveButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>{t.addMemory.saveButton}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1026',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EEEAF6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EEEAF6',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#EEEAF6',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionChipActive: {
    backgroundColor: 'rgba(123,110,246,0.2)',
    borderColor: '#7B6EF6',
  },
  optionText: {
    fontSize: 14,
    color: '#8E8BA3',
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#EEEAF6',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(123,110,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaText: {
    fontSize: 12,
    color: '#8E8BA3',
    marginTop: 4,
  },
  audioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  audioName: {
    flex: 1,
    fontSize: 14,
    color: '#EEEAF6',
    marginHorizontal: 12,
  },
  addAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },
  addAudioText: {
    fontSize: 14,
    color: '#8E8BA3',
    marginLeft: 8,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(13,16,38,0.95)',
  },
  saveButton: {
    shadowColor: '#7B6EF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
