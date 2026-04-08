import { Screen } from '@/components/Screen';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useState, useEffect, useCallback } from 'react';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 家庭成员数据
interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  joinDate: string;
  memoryCount: number;
  interactionScore: number;
  isOnline: boolean;
  relationship: 'self' | 'spouse' | 'parent' | 'child' | 'sibling' | 'relative';
}

const mockFamilyMembers: FamilyMember[] = [
  { id: '1', name: '我', avatar: '', joinDate: '2023-01-15', memoryCount: 128, interactionScore: 100, isOnline: true, relationship: 'self' },
  { id: '2', name: '爸爸', avatar: '', joinDate: '2023-01-15', memoryCount: 86, interactionScore: 78, isOnline: true, relationship: 'parent' },
  { id: '3', name: '妈妈', avatar: '', joinDate: '2023-01-15', memoryCount: 92, interactionScore: 85, isOnline: false, relationship: 'parent' },
  { id: '4', name: '小美', avatar: '', joinDate: '2023-06-20', memoryCount: 45, interactionScore: 62, isOnline: true, relationship: 'spouse' },
  { id: '5', name: '奶奶', avatar: '', joinDate: '2023-02-10', memoryCount: 38, interactionScore: 45, isOnline: false, relationship: 'relative' },
  { id: '6', name: '小强', avatar: '', joinDate: '2023-08-05', memoryCount: 52, interactionScore: 58, isOnline: true, relationship: 'sibling' },
];

// 关系颜色映射
const relationshipColors: Record<string, string> = {
  self: '#7C6AFF',
  spouse: '#FF7B8A',
  parent: '#FFB74D',
  child: '#4CAF50',
  sibling: '#29B6F6',
  relative: '#AB47BC',
};

// 家庭成员头像节点
function FamilyNode({ 
  member, 
  isCenter,
  onPress 
}: { 
  member: FamilyMember; 
  isCenter: boolean;
  onPress: () => void;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (member.isOnline && !isCenter) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const nodeSize = isCenter ? 72 : 56;
  const borderWidth = isCenter ? 4 : 3;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.nodeContainer, pulseStyle]}>
        {/* 在线状态光晕 */}
        {member.isOnline && (
          <View style={[styles.onlineGlow, { backgroundColor: relationshipColors[member.relationship] }]} />
        )}
        {/* 头像 */}
        <View 
          style={[
            styles.avatarNode,
            { 
              width: nodeSize, 
              height: nodeSize, 
              borderRadius: nodeSize / 2,
              borderWidth,
              borderColor: relationshipColors[member.relationship],
              backgroundColor: relationshipColors[member.relationship] + '20',
            }
          ]}
        >
          <Text style={[styles.avatarInitial, { color: relationshipColors[member.relationship] }]}>
            {member.name.charAt(0)}
          </Text>
          {member.isOnline && <View style={[styles.onlineDot, { backgroundColor: '#4CAF50' }]} />}
        </View>
        {/* 名字 */}
        <Text style={[styles.nodeName, isCenter && styles.nodeNameCenter]}>
          {member.name}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// 关系连线
function ConnectionLine({ 
  from, 
  to, 
  thickness 
}: { 
  from: { x: number; y: number }; 
  to: { x: number; y: number };
  thickness: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <View
      style={[
        styles.connectionLine,
        {
          width: length,
          height: thickness,
          left: from.x,
          top: from.y - thickness / 2,
          transform: [{ rotate: `${angle}deg` }],
          transformOrigin: 'left center',
        }
      ]}
    />
  );
}

// 共享白板
function SharedWhiteboard({ 
  content, 
  onEdit 
}: { 
  content: string; 
  onEdit: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(content);

  return (
    <Animated.View entering={FadeInUp.duration(500)} style={styles.whiteboard}>
      <View style={styles.whiteboardHeader}>
        <View style={styles.whiteboardTitleRow}>
          <Ionicons name="create-outline" size={16} color="#7C6AFF" />
          <Text style={styles.whiteboardTitle}>家庭寄语</Text>
        </View>
        <TouchableOpacity onPress={onEdit}>
          <Ionicons name="pencil" size={18} color="#8B8680" />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.whiteboardContent}
        value={text}
        onChangeText={setText}
        multiline
        placeholder="写下对家人的祝福..."
        placeholderTextColor="#B2AEAA"
        editable={false}
        onPress={onEdit}
      />
      <View style={styles.whiteboardFooter}>
        <Text style={styles.whiteboardHint}>点击编辑</Text>
      </View>
    </Animated.View>
  );
}

// 成员详情卡片
function MemberDetailCard({ 
  member, 
  onClose 
}: { 
  member: FamilyMember | null;
  onClose: () => void;
}) {
  if (!member) return null;

  return (
    <Animated.View entering={FadeInUp.duration(300)} style={styles.detailCard}>
      <TouchableOpacity style={styles.detailClose} onPress={onClose}>
        <Ionicons name="close" size={20} color="#8B8680" />
      </TouchableOpacity>
      <View style={[styles.detailAvatar, { backgroundColor: relationshipColors[member.relationship] + '20' }]}>
        <Text style={[styles.detailInitial, { color: relationshipColors[member.relationship] }]}>
          {member.name.charAt(0)}
        </Text>
      </View>
      <Text style={styles.detailName}>{member.name}</Text>
      <View style={styles.detailStats}>
        <View style={styles.detailStat}>
          <Text style={styles.detailStatValue}>{member.memoryCount}</Text>
          <Text style={styles.detailStatLabel}>回忆</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailStat}>
          <Text style={styles.detailStatValue}>{member.interactionScore}</Text>
          <Text style={styles.detailStatLabel}>亲密度</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailStat}>
          <Text style={styles.detailStatValue}>{member.joinDate.split('-')[0]}</Text>
          <Text style={styles.detailStatLabel}>加入</Text>
        </View>
      </View>
      <View style={styles.detailBadge}>
        <View style={[styles.detailBadgeDot, { backgroundColor: member.isOnline ? '#4CAF50' : '#B2AEAA' }]} />
        <Text style={styles.detailBadgeText}>{member.isOnline ? '在线' : '离线'}</Text>
      </View>
    </Animated.View>
  );
}

// 拓扑图布局位置计算
function calculateNodePositions(members: FamilyMember[], centerX: number, centerY: number) {
  const positions: Record<string, { x: number; y: number }> = {};
  const center = members.find(m => m.relationship === 'self');
  const others = members.filter(m => m.relationship !== 'self');

  if (center) {
    positions[center.id] = { x: centerX - 36, y: centerY - 36 };
  }

  const radius = Math.min(centerX, centerY) * 0.65;
  others.forEach((member, index) => {
    const angle = (index / others.length) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius - 28;
    const y = centerY + Math.sin(angle) * radius - 28;
    positions[member.id] = { x, y };
  });

  return positions;
}

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const [familyMembers] = useState<FamilyMember[]>(mockFamilyMembers);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [whiteboardContent, setWhiteboardContent] = useState('愿我们一家人永远幸福美满');

  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT * 0.32;
  const nodePositions = calculateNodePositions(familyMembers, centerX, centerY);

  const connections = familyMembers
    .filter(m => m.relationship !== 'self')
    .map(m => ({
      from: nodePositions[familyMembers[0].id] || { x: 0, y: 0 },
      to: nodePositions[m.id] || { x: 0, y: 0 },
      thickness: Math.max(2, m.interactionScore / 25),
      color: relationshipColors[m.relationship],
    }));

  const handleWhiteboardEdit = () => {
    // TODO: 打开编辑模式
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} style={styles.screen}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* 头部 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>家庭空间</Text>
          <TouchableOpacity style={styles.inviteButton}>
            <Ionicons name="person-add-outline" size={20} color="#7C6AFF" />
            <Text style={styles.inviteText}>邀请</Text>
          </TouchableOpacity>
        </View>

        {/* 共享白板 */}
        <SharedWhiteboard content={whiteboardContent} onEdit={handleWhiteboardEdit} />

        {/* 拓扑图 */}
        <View style={styles.topologyContainer}>
          <ScrollView 
            contentContainerStyle={styles.topologyScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.topologyMap, { height: SCREEN_HEIGHT * 0.55 }]}>
              {/* 连接线 */}
              {connections.map((conn, index) => (
                <ConnectionLine
                  key={`conn-${index}`}
                  from={conn.from}
                  to={conn.to}
                  thickness={conn.thickness}
                />
              ))}

              {/* 家庭成员节点 */}
              {familyMembers.map((member) => (
                <View
                  key={member.id}
                  style={[
                    styles.nodePosition,
                    { 
                      left: nodePositions[member.id]?.x || 0,
                      top: nodePositions[member.id]?.y || 0,
                    }
                  ]}
                >
                  <FamilyNode
                    member={member}
                    isCenter={member.relationship === 'self'}
                    onPress={() => setSelectedMember(member)}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 成员详情卡片 */}
        {selectedMember && (
          <MemberDetailCard 
            member={selectedMember} 
            onClose={() => setSelectedMember(null)} 
          />
        )}
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
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  inviteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C6AFF',
  },
  whiteboard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  whiteboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  whiteboardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whiteboardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C6AFF',
  },
  whiteboardContent: {
    fontSize: 15,
    color: '#2D3436',
    lineHeight: 22,
    minHeight: 44,
  },
  whiteboardFooter: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  whiteboardHint: {
    fontSize: 11,
    color: '#B2AEAA',
  },
  topologyContainer: {
    flex: 1,
  },
  topologyScroll: {
    flexGrow: 1,
  },
  topologyMap: {
    position: 'relative',
    width: '100%',
  },
  nodePosition: {
    position: 'absolute',
  },
  nodeContainer: {
    alignItems: 'center',
  },
  onlineGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.2,
    top: -2,
  },
  avatarNode: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nodeName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#8B8680',
  },
  nodeNameCenter: {
    color: '#2D3436',
    fontWeight: '700',
  },
  connectionLine: {
    position: 'absolute',
    backgroundColor: '#D8D6D3',
    borderRadius: 2,
  },
  detailCard: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#7C6AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  detailClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  detailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailInitial: {
    fontSize: 28,
    fontWeight: '700',
  },
  detailName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 16,
  },
  detailStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailStat: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C6AFF',
  },
  detailStatLabel: {
    fontSize: 12,
    color: '#8B8680',
    marginTop: 2,
  },
  detailDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8E6E3',
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailBadgeText: {
    fontSize: 12,
    color: '#8B8680',
    fontWeight: '500',
  },
});
