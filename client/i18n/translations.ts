export const translations = {
  zh: {
    // 通用
    appName: 'Voxora',
    loading: '加载回忆中...',
    error: '错误',
    success: '成功',
    confirm: '确定',
    cancel: '取消',
    save: '保存',
    delete: '删除',

    // 主页
    home: {
      subtitle: '记录美好回忆',
      emptyTitle: '还没有回忆',
      emptySubtitle: '点击下方按钮开始记录',
      refresh: '刷新',
    },

    // 新增回忆
    addMemory: {
      title: '新增回忆',
      titleLabel: '回忆标题',
      titlePlaceholder: '给这段回忆起个名字',
      titleLabelRequired: '回忆标题 *',
      dateLabel: '回忆日期',
      dateLabelRequired: '回忆日期 *',
      datePlaceholder: 'YYYY-MM-DD',
      locationLabel: '地点',
      locationPlaceholder: '在哪里',
      weatherLabel: '天气',
      moodLabel: '心情',
      mediaLabel: '照片和视频',
      audioLabel: '音频',
      addMedia: '添加',
      addAudio: '添加音频文件',
      saveButton: '保存回忆',
      
      // 天气选项
      weatherOptions: {
        sunny: '晴天',
        cloudy: '多云',
        rainy: '雨天',
        snowy: '雪天',
        overcast: '阴天',
        windy: '大风',
      },
      
      // 心情选项
      moodOptions: {
        happy: '开心',
        touched: '感动',
        peaceful: '平静',
        excited: '兴奋',
        nostalgic: '怀念',
        warm: '温馨',
        surprised: '惊喜',
        sad: '忧伤',
      },
      
      // 提示
      alertTitleRequired: '请输入回忆标题',
      alertDateRequired: '请选择回忆日期',
      alertSaveSuccess: '回忆已保存',
      alertSaveFailed: '保存失败',
      alertImagePickFailed: '选择图片失败',
      alertAudioPickFailed: '选择音频失败',
    },

    // 回忆详情
    memoryDetail: {
      notFound: '回忆不存在',
      playAudio: '播放音频',
      pauseAudio: '暂停音频',
    },

    // 语言
    language: {
      current: '中文',
      switchTo: 'English',
    },
  },

  en: {
    // Common
    appName: 'Voxora',
    loading: 'Loading memories...',
    error: 'Error',
    success: 'Success',
    confirm: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',

    // Home
    home: {
      subtitle: 'Capture Beautiful Moments',
      emptyTitle: 'No Memories Yet',
      emptySubtitle: 'Tap the button below to start',
      refresh: 'Refresh',
    },

    // Add Memory
    addMemory: {
      title: 'New Memory',
      titleLabel: 'Memory Title',
      titlePlaceholder: 'Give this memory a name',
      titleLabelRequired: 'Memory Title *',
      dateLabel: 'Date',
      dateLabelRequired: 'Date *',
      datePlaceholder: 'YYYY-MM-DD',
      locationLabel: 'Location',
      locationPlaceholder: 'Where',
      weatherLabel: 'Weather',
      moodLabel: 'Mood',
      mediaLabel: 'Photos & Videos',
      audioLabel: 'Audio',
      addMedia: 'Add',
      addAudio: 'Add Audio File',
      saveButton: 'Save Memory',
      
      // Weather options
      weatherOptions: {
        sunny: 'Sunny',
        cloudy: 'Cloudy',
        rainy: 'Rainy',
        snowy: 'Snowy',
        overcast: 'Overcast',
        windy: 'Windy',
      },
      
      // Mood options
      moodOptions: {
        happy: 'Happy',
        touched: 'Touched',
        peaceful: 'Peaceful',
        excited: 'Excited',
        nostalgic: 'Nostalgic',
        warm: 'Warm',
        surprised: 'Surprised',
        sad: 'Sad',
      },
      
      // Alerts
      alertTitleRequired: 'Please enter a title',
      alertDateRequired: 'Please select a date',
      alertSaveSuccess: 'Memory saved',
      alertSaveFailed: 'Failed to save',
      alertImagePickFailed: 'Failed to pick image',
      alertAudioPickFailed: 'Failed to pick audio',
    },

    // Memory Detail
    memoryDetail: {
      notFound: 'Memory not found',
      playAudio: 'Play Audio',
      pauseAudio: 'Pause Audio',
    },

    // Language
    language: {
      current: 'English',
      switchTo: '中文',
    },
  },
};

export type Language = 'zh' | 'en';
export type TranslationKey = keyof typeof translations.zh;
