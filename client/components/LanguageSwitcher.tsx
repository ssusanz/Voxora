import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '@/locales/i18n';

interface Language {
  code: string;
  name: string;
  icon: string;
}

const languages: Language[] = [
  { code: 'zh-CN', name: '中文', icon: 'language' },
  { code: 'en', name: 'English', icon: 'language' },
  { code: 'hi', name: 'हिंदी', icon: 'language' },
];

interface LanguageSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

export default function LanguageSwitcher({ visible, onClose }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const currentLanguage = getCurrentLanguage();

  const handleSelectLanguage = async (langCode: string) => {
    await changeLanguage(langCode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.container}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('language.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.languageList}>
            {languages.map((lang) => {
              const isSelected = currentLanguage === lang.code;

              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.languageItem, isSelected && styles.languageItemSelected]}
                  onPress={() => handleSelectLanguage(lang.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.languageIconContainer}>
                    <Ionicons
                      name={lang.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={isSelected ? '#7C6AFF' : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.languageInfo}>
                    <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
                      {lang.name}
                    </Text>
                    <Text style={styles.languageCode}>{lang.code}</Text>
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#7C6AFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '85%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    paddingVertical: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  languageItemSelected: {
    backgroundColor: 'rgba(124, 106, 255, 0.05)',
  },
  languageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  languageNameSelected: {
    color: '#7C6AFF',
  },
  languageCode: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
