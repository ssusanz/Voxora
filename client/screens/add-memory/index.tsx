import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createMemory } from '@/utils/voxoraDemoStore';

const emotionMatrix = [
  { label: '喜悦', color: '#F9C74F', icon: 'emoticon-happy-outline' },
  { label: '平静', color: '#4CC9F0', icon: 'weather-night' },
  { label: '想念', color: '#B388EB', icon: 'heart-outline' },
  { label: '紧张', color: '#EF476F', icon: 'pulse' },
  { label: '希望', color: '#80ED99', icon: 'sprout-outline' },
  { label: '温暖', color: '#FFD6A5', icon: 'white-balance-sunny' },
] as const;

const weatherOptions = ['晴朗', '微风', '多云', '小雨', '雪夜', '雷雨'];
const bookOptions = ['诗集', '绘本', '旧相册', '小说', '旅行册', '未选择'];
const colorOptions = ['海盐蓝', '曙光橙', '暮光紫', '森林绿', '雾灰', '樱花粉'];

export default function AddMemoryScreen() {
  const router = useSafeRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().slice(0, 10));
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [emotion, setEmotion] = useState<string>('平静');
  const [sensoryColor, setSensoryColor] = useState<string>('海盐蓝');
  const [sensoryWeather, setSensoryWeather] = useState<string>('微风');
  const [sensoryBook, setSensoryBook] = useState<string>('诗集');
  const [soundRecorded, setSoundRecorded] = useState(false);
  const [archivedUntil, setArchivedUntil] = useState('');
  const [aphasiaMode, setAphasiaMode] = useState(true);

  const memoryType = useMemo(() => (mediaUris.length > 0 ? 'photo' : 'emotion'), [mediaUris.length]);

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.9,
      });
      if (result.canceled) return;
      const selected = result.assets.map((asset) => asset.uri);
      setMediaUris((prev) => [...prev, ...selected]);
    } catch (error) {
      console.error('pick media failed', error);
      Alert.alert('选择失败', '请稍后再试。');
    }
  };

  const removeMedia = (target: string) => {
    setMediaUris((prev) => prev.filter((uri) => uri !== target));
  };

  const onSave = async () => {
    if (!memoryDate.trim()) {
      Alert.alert('缺少日期', '请填写记录日期。');
      return;
    }

    setLoading(true);
    try {
      const finalTitle = title.trim() || `${emotion}的无声记录`;
      const archivedValue = archivedUntil.trim() || null;
      const memory = await createMemory({
        title: finalTitle,
        memoryDate: memoryDate.trim(),
        type: memoryType,
        mediaUris,
        emotionTags: [emotion],
        sensory: {
          color: sensoryColor,
          weather: sensoryWeather,
          book: sensoryBook,
          soundRecorded,
        },
        archivedUntil: archivedValue,
        isAphasiaAuthor: aphasiaMode,
        authorId: aphasiaMode ? 'm_aphasia' : 'm_creator',
      });

      Alert.alert('已封存到时间轴', '你的情绪与感官片段已加入家庭记忆节点。', [
        {
          text: '查看详情',
          onPress: () => router.replace('/memory-detail', { id: memory.id }),
        },
      ]);
    } catch (error) {
      console.error('save memory failed', error);
      Alert.alert('保存失败', '请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen backgroundColor="#070B1C" statusBarStyle="light" style={styles.container}>
      <LinearGradient colors={['#2D2A66', '#10193A', '#070B1C']} style={styles.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="x" size={20} color="#F5F2FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新增回忆（无声模式）</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基础信息</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="可不填：系统将自动生成标题"
            placeholderTextColor="#8E88B0"
            style={styles.input}
          />
          <TextInput
            value={memoryDate}
            onChangeText={setMemoryDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#8E88B0"
            style={styles.input}
          />
          <View style={styles.modeRow}>
            <Text style={styles.modeLabel}>失语症支持作者身份</Text>
            <TouchableOpacity
              onPress={() => setAphasiaMode((v) => !v)}
              style={[styles.modeSwitch, aphasiaMode && styles.modeSwitchActive]}
            >
              <Text style={[styles.modeSwitchText, aphasiaMode && styles.modeSwitchTextActive]}>
                {aphasiaMode ? '开启' : '关闭'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>视觉情绪选择矩阵</Text>
          <View style={styles.emotionGrid}>
            {emotionMatrix.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => setEmotion(item.label)}
                style={[
                  styles.emotionCard,
                  { borderColor: `${item.color}AA` },
                  emotion === item.label && { backgroundColor: `${item.color}33` },
                ]}
              >
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                <Text style={styles.emotionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>感官记录</Text>
          <Text style={styles.subLabel}>颜色</Text>
          <View style={styles.choiceRow}>
            {colorOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setSensoryColor(item)}
                style={[styles.choiceChip, sensoryColor === item && styles.choiceChipActive]}
              >
                <Text style={[styles.choiceText, sensoryColor === item && styles.choiceTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.subLabel}>天气</Text>
          <View style={styles.choiceRow}>
            {weatherOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setSensoryWeather(item)}
                style={[styles.choiceChip, sensoryWeather === item && styles.choiceChipActive]}
              >
                <Text style={[styles.choiceText, sensoryWeather === item && styles.choiceTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.subLabel}>书籍图标</Text>
          <View style={styles.choiceRow}>
            {bookOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setSensoryBook(item)}
                style={[styles.choiceChip, sensoryBook === item && styles.choiceChipActive]}
              >
                <Text style={[styles.choiceText, sensoryBook === item && styles.choiceTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => setSoundRecorded((v) => !v)}
            style={[styles.audioToggle, soundRecorded && styles.audioToggleActive]}
          >
            <Feather name="mic" size={16} color={soundRecorded ? '#070B1C' : '#F6F2FF'} />
            <Text style={[styles.audioToggleText, soundRecorded && styles.audioToggleTextActive]}>
              {soundRecorded ? '环境音已记录（模拟）' : '点击记录环境音（模拟）'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>媒体与封存</Text>
          <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}>
            <Feather name="image" size={18} color="#D9D3F9" />
            <Text style={styles.mediaPickerText}>添加照片/视频</Text>
          </TouchableOpacity>
          {mediaUris.length > 0 && (
            <View style={styles.mediaList}>
              {mediaUris.map((uri) => (
                <View key={uri} style={styles.mediaRow}>
                  <Text style={styles.mediaUri} numberOfLines={1}>
                    {uri}
                  </Text>
                  <TouchableOpacity onPress={() => removeMedia(uri)}>
                    <Feather name="trash-2" size={15} color="#FFB4C8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <TextInput
            value={archivedUntil}
            onChangeText={setArchivedUntil}
            placeholder="封存解锁日期（可选）YYYY-MM-DD"
            placeholderTextColor="#8E88B0"
            style={styles.input}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} disabled={loading} onPress={onSave}>
          <LinearGradient colors={['#8A7BFF', '#4CC9F0']} style={styles.saveGradient}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveText}>写入家庭时间轴</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070B1C',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F6F2FF',
    fontWeight: '700',
    fontSize: 17,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 130,
    gap: 14,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: '#F4EEFF',
    fontWeight: '700',
    fontSize: 15,
  },
  input: {
    borderRadius: 12,
    backgroundColor: 'rgba(7,11,28,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#F7F4FF',
  },
  modeRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeLabel: {
    color: '#D8D1F6',
    fontSize: 13,
  },
  modeSwitch: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modeSwitchActive: {
    backgroundColor: '#80ED99',
    borderColor: '#80ED99',
  },
  modeSwitchText: {
    color: '#EEE7FF',
    fontWeight: '700',
    fontSize: 12,
  },
  modeSwitchTextActive: {
    color: '#070B1C',
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionCard: {
    width: '31%',
    minWidth: 96,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 3,
  },
  emotionText: {
    color: '#F7F3FF',
    fontSize: 12,
    fontWeight: '700',
  },
  subLabel: {
    color: '#D7D0F5',
    fontSize: 12,
    marginTop: 4,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  choiceChipActive: {
    borderColor: '#8A7BFF',
    backgroundColor: 'rgba(138,123,255,0.3)',
  },
  choiceText: {
    color: '#DFD9FA',
    fontSize: 12,
    fontWeight: '600',
  },
  choiceTextActive: {
    color: '#FFFFFF',
  },
  audioToggle: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  audioToggleActive: {
    backgroundColor: '#80ED99',
    borderColor: '#80ED99',
  },
  audioToggleText: {
    color: '#EEE8FF',
    fontWeight: '700',
    fontSize: 12,
  },
  audioToggleTextActive: {
    color: '#070B1C',
  },
  mediaPicker: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mediaPickerText: {
    color: '#DCD6F8',
    fontWeight: '700',
    fontSize: 13,
  },
  mediaList: {
    gap: 6,
  },
  mediaRow: {
    borderRadius: 10,
    backgroundColor: 'rgba(7,11,28,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  mediaUri: {
    flex: 1,
    color: '#DED8F9',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
