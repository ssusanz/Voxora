import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useEffect } from 'react';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/utils/localeFormat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 宠物数据
interface Pet {
  id: string;
  name: string;
  level: number;
  experience: number;
  maxExperience: number;
  mood: 'happy' | 'excited' | 'sleepy' | 'hungry';
  energy: number;
  maxEnergy: number;
  avatarEmoji: string;
  lastFedAt: number;
  evolutionStage: number;
}

interface EnergySource {
  id: string;
  type: 'memory' | 'like' | 'comment' | 'family';
  description: string;
  amount: number;
  timestamp: number;
  fromMember: string;
}

const mockPet: Pet = {
  id: '1',
  name: '小星',
  level: 5,
  experience: 680,
  maxExperience: 1000,
  mood: 'happy',
  energy: 85,
  maxEnergy: 100,
  avatarEmoji: 'star',
  lastFedAt: Date.now() - 2 * 60 * 60 * 1000,
  evolutionStage: 2,
};

const mockEnergySources: EnergySource[] = [
  { id: '1', type: 'memory', description: '发布了新回忆', amount: 50, timestamp: Date.now() - 10 * 60 * 1000, fromMember: '爸爸' },
  { id: '2', type: 'like', description: '收到点赞', amount: 10, timestamp: Date.now() - 30 * 60 * 1000, fromMember: '妈妈' },
  { id: '3', type: 'comment', description: '收到评论', amount: 20, timestamp: Date.now() - 60 * 60 * 1000, fromMember: '小美' },
  { id: '4', type: 'family', description: '家庭互动', amount: 30, timestamp: Date.now() - 2 * 60 * 60 * 1000, fromMember: '全家' },
  { id: '5', type: 'memory', description: '发布了新回忆', amount: 50, timestamp: Date.now() - 3 * 60 * 60 * 1000, fromMember: '我' },
];

// 宠物心情动画
function PetMoodAnimation({ mood }: { mood: Pet['mood'] }) {
  const bounce = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    if (mood === 'excited') {
      rotate.value = withRepeat(
        withSequence(
          withTiming(-15, { duration: 200 }),
          withTiming(15, { duration: 200 }),
          withTiming(0, { duration: 200 })
        ),
        -1
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1
      );
    } else if (mood === 'happy') {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1
      );
    }
  }, [mood]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  const getMoodIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (mood) {
      case 'happy': return 'star';
      case 'excited': return 'sparkles';
      case 'sleepy': return 'moon';
      case 'hungry': return 'leaf';
      default: return 'star';
    }
  };

  const getMoodColor = (): string => {
    switch (mood) {
      case 'happy': return '#FFD700';
      case 'excited': return '#FF7B8A';
      case 'sleepy': return '#9E9E9E';
      case 'hungry': return '#4CAF50';
      default: return '#FFD700';
    }
  };

  return (
    <Animated.View style={[styles.petContainer, bounceStyle]}>
      <View style={[styles.petAvatar, { backgroundColor: '#FFF9E6' }]}>
        <Ionicons name={getMoodIcon()} size={40} color={getMoodColor()} />
      </View>
      <View style={styles.petGlow} />
      {[...Array(6)].map((_, i) => (
        <Particle key={i} index={i} />
      ))}
    </Animated.View>
  );
}

function Particle({ index }: { index: number }) {
  const float = useSharedValue(0);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    const delay = index * 500;
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0.3, { duration: 2000 })
        ),
        -1
      )
    );
  }, []);

  const particleStyle = useAnimatedStyle(() => {
    const angle = (index / 6) * Math.PI * 2;
    const radius = 50;
    return {
      position: 'absolute',
      left: 35 + Math.cos(angle) * radius,
      top: 35 + Math.sin(angle) * radius,
      opacity: opacity.value,
      transform: [{ translateY: float.value * -10 }],
    };
  });

  return (
    <Animated.View style={particleStyle}>
      <Ionicons name="sparkles" size={12} color="#FFD700" />
    </Animated.View>
  );
}

function ExperienceBar({ current, max, level }: { current: number; max: number; level: number }) {
  const progress = current / max;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress * 100, { duration: 800, easing: Easing.out(Easing.ease) });
  }, [current]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.expContainer}>
      <View style={styles.expHeader}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LV.{level}</Text>
        </View>
        <Text style={styles.expText}>{current} / {max}</Text>
      </View>
      <View style={styles.expTrack}>
        <Animated.View style={[styles.expFill, progressStyle]}>
          <LinearGradient
            colors={['#7C6AFF', '#9D91FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.expGradient}
          />
        </Animated.View>
      </View>
    </View>
  );
}

function EnergySourceItem({ source, index }: { source: EnergySource; index: number }) {
  const { t } = useTranslation();
  const timeLabel = formatRelativeTime(source.timestamp, t);
  const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    memory: 'images-outline',
    like: 'heart-outline',
    comment: 'chatbubble-outline',
    family: 'people-outline',
  };

  const typeColors: Record<string, string> = {
    memory: '#7C6AFF',
    like: '#FF7B8A',
    comment: '#FFB74D',
    family: '#4CAF50',
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 80).duration(300)}
      style={styles.energyItem}
    >
      <View style={[styles.energyIcon, { backgroundColor: typeColors[source.type] + '20' }]}>
        <Ionicons name={typeIcons[source.type]} size={18} color={typeColors[source.type]} />
      </View>
      <View style={styles.energyContent}>
        <Text style={styles.energyDesc}>{source.description}</Text>
        <Text style={styles.energyMeta}>
          {t('pet.energyMeta', { member: source.fromMember, time: timeLabel })}
        </Text>
      </View>
      <View style={styles.energyAmount}>
        <Text style={styles.energyValue}>+{source.amount}</Text>
        <Ionicons name="flash" size={12} color="#FFD700" />
      </View>
    </Animated.View>
  );
}

function PetStatusIndicator({ mood, energy }: { mood: Pet['mood']; energy: number }) {
  const moodTexts: Record<string, string> = {
    happy: '心情愉悦',
    excited: '超级兴奋',
    sleepy: '有点困',
    hungry: '饿了',
  };

  const moodColors: Record<string, string> = {
    happy: '#4CAF50',
    excited: '#FFD700',
    sleepy: '#9E9E9E',
    hungry: '#FF9800',
  };

  return (
    <View style={styles.statusContainer}>
      <View style={styles.statusItem}>
        <View style={[styles.statusDot, { backgroundColor: moodColors[mood] }]} />
        <Text style={styles.statusText}>{moodTexts[mood]}</Text>
      </View>
      <View style={styles.statusItem}>
        <Ionicons name="battery-full" size={14} color={energy > 50 ? '#4CAF50' : '#FF9800'} />
        <Text style={styles.statusText}>{energy}%</Text>
      </View>
    </View>
  );
}

function EvolutionStage({ stage }: { stage: number }) {
  const evolutionIcons: { icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { icon: 'leaf', color: '#81C784' },
    { icon: 'star', color: '#FFD700' },
    { icon: 'sparkles', color: '#FF7B8A' },
    { icon: 'sunny', color: '#FFB74D' },
    { icon: 'planet', color: '#7C6AFF' },
  ];
  return (
    <View style={styles.evolutionContainer}>
      <Text style={styles.evolutionLabel}>进化进度</Text>
      <View style={styles.evolutionStars}>
        {evolutionIcons.map((item, index) => (
          <View
            key={index}
            style={[
              styles.evolutionStar,
              index < stage && styles.evolutionStarActive,
              index < stage && { opacity: 1 },
              index >= stage && { opacity: 0.3 }
            ]}
          >
            <Ionicons name={item.icon} size={24} color={item.color} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PetScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pet] = useState<Pet>(mockPet);
  const [energySources] = useState<EnergySource[]>(mockEnergySources);
  const lastFedLabel = formatRelativeTime(pet.lastFedAt, t);

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} style={styles.screen}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('pet.title')}</Text>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={22} color="#8B8680" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View entering={FadeInUp.duration(500)} style={styles.petCard}>
            <View style={styles.petCardHeader}>
              <View>
                <Text style={styles.petName}>{pet.name}</Text>
                <PetStatusIndicator mood={pet.mood} energy={pet.energy} />
              </View>
              <View style={styles.lastFed}>
                <Ionicons name="time-outline" size={14} color="#8B8680" />
                <Text style={styles.lastFedText}>{t('pet.lastFed', { time: lastFedLabel })}</Text>
              </View>
            </View>
            
            <View style={styles.petStage}>
              <PetMoodAnimation mood={pet.mood} />
            </View>

            <ExperienceBar current={pet.experience} max={pet.maxExperience} level={pet.level} />
            <EvolutionStage stage={pet.evolutionStage} />
          </Animated.View>

          <View style={styles.energySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>能量来源</Text>
              <Text style={styles.sectionSubtitle}>全家人的互动都在喂养小星</Text>
            </View>
            {energySources.map((source, index) => (
              <EnergySourceItem key={source.id} source={source} index={index} />
            ))}
          </View>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  petCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  petCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  petName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#8B8680',
  },
  lastFed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastFedText: {
    fontSize: 12,
    color: '#8B8680',
  },
  petStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    marginBottom: 20,
  },
  petContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  petGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFD700',
    opacity: 0.15,
  },
  expContainer: {
    marginBottom: 20,
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: 'rgba(124, 106, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C6AFF',
  },
  expText: {
    fontSize: 12,
    color: '#8B8680',
  },
  expTrack: {
    height: 8,
    backgroundColor: '#E8E6E3',
    borderRadius: 4,
    overflow: 'hidden',
  },
  expFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  expGradient: {
    flex: 1,
  },
  evolutionContainer: {
    backgroundColor: '#F5F3F0',
    borderRadius: 16,
    padding: 16,
  },
  evolutionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B8680',
    marginBottom: 12,
  },
  evolutionStars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  evolutionStar: {
    opacity: 0.3,
  },
  evolutionStarActive: {
    opacity: 1,
  },
  evolutionEmoji: {
    fontSize: 24,
  },
  energySection: {
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8B8680',
  },
  energyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  energyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  energyContent: {
    flex: 1,
  },
  energyDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 2,
  },
  energyMeta: {
    fontSize: 12,
    color: '#8B8680',
  },
  energyAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  energyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFB74D',
  },
});
