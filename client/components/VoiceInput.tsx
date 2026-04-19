import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { requireOptionalNativeModule } from 'expo';
import { getBackendBaseUrl } from '@/utils/backend';

/** 与 expo-speech-recognition 的 ExpoSpeechRecognitionModule 一致的最小形状（不经由会 requireNativeModule 的包入口加载） */
type NativeSpeechModule = {
  isRecognitionAvailable?: () => boolean;
  supportsOnDeviceRecognition?: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (
    event: string,
    cb: (e: { message?: string; results?: { transcript?: string }[] }) => void
  ) => { remove: () => void };
  start: (opts: Record<string, unknown>) => void;
  stop?: () => void;
  abort?: () => void;
};

let expoSpeechNativeModule: NativeSpeechModule | null | undefined;

/**
 * 使用 requireOptionalNativeModule，避免 import('expo-speech-recognition') 时其入口文件
 * 同步 requireNativeModule 并在 Expo Go / 未重编原生壳 时抛错刷红屏。
 */
function getOptionalExpoSpeechNativeModule(): NativeSpeechModule | null {
  if (expoSpeechNativeModule !== undefined) {
    return expoSpeechNativeModule;
  }
  const mod = requireOptionalNativeModule<NativeSpeechModule>('ExpoSpeechRecognition');
  if (!mod) {
    expoSpeechNativeModule = null;
    return null;
  }
  const stop = mod.stop;
  const abort = mod.abort;
  if (typeof abort === 'function') {
    mod.abort = () => abort();
  }
  if (typeof stop === 'function') {
    mod.stop = () => stop();
  }
  expoSpeechNativeModule = mod;
  return mod;
}

/** 是否在 Expo Go 中运行（Store Client 即官方 Expo Go 壳） */
function isRunningInsideExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** BCP-47 风格：统一小写、`_` → `-` */
function normSpeechLangTag(tag: string): string {
  return tag.trim().replace(/_/g, '-').toLowerCase();
}

/**
 * `SFSpeechRecognizer` / 系统识别常用 `zh-CN`、`en-US`；`expo-localization` 常返回 `zh-Hans-CN` 等。
 */
function normalizeSpeechRecognizerLocaleTag(tag: string): string {
  const n = normSpeechLangTag(tag);
  if (n.startsWith('zh-hans') || n === 'zh-cn' || n === 'zh-sg' || n.startsWith('cmn-hans')) return 'zh-CN';
  if (n.startsWith('zh-hant-hk') || n.startsWith('zh-hk')) return 'zh-HK';
  if (n.startsWith('zh-hant-mo')) return 'zh-MO';
  if (n.startsWith('zh-hant-tw') || n === 'zh-tw') return 'zh-TW';
  if (n === 'zh' || n.startsWith('cmn-')) return 'zh-CN';
  if (n.startsWith('en-gb')) return 'en-GB';
  if (n.startsWith('en-au')) return 'en-AU';
  if (n.startsWith('en-in')) return 'en-IN';
  if (n.startsWith('en-')) return 'en-US';
  return tag.trim().replace(/_/g, '-');
}

function getSpeechNativeModuleHint(): string {
  if (isRunningInsideExpoGo()) {
    return (
      'Expo Go 不含 expo-speech-recognition 原生模块：请确认后端已配置 GEMINI_API_KEY，以使用「录音 → 服务端转写」；' +
      '或安装开发构建 / EAS 包以启用本机识别。'
    );
  }
  return (
    '未找到语音识别原生模块。请重新编译并安装包含插件的应用：在 client 目录执行 npx expo run:android（或 iOS 对应命令），' +
    '或确认 EAS 构建 profile 已包含 expo-speech-recognition。'
  );
}

interface VoiceInputProps {
  visible: boolean;
  onClose: () => void;
  onTranscribed?: (text: string) => void;
  onComplete?: (data: { transcription: string; extractedInfo: any }) => void;
  mode?: 'transcribe' | 'extract';
  title?: string;
  subtitle?: string;
}

// Toast 消息组件
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function Toast({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    toasts.forEach(toast => {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, 3000);
      return () => clearTimeout(timer);
    });
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <View style={toastStyles.container}>
      {toasts.map(toast => (
        <View key={toast.id} style={[toastStyles.toast, toastStyles[toast.type]]}>
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : 'information-circle'}
            size={20}
            color={toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#3B82F6'}
          />
          <Text style={toastStyles.message}>{toast.message}</Text>
        </View>
      ))}
    </View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  success: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  error: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  info: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  message: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
});

/** Web Speech API 实例（lib.dom 与 RN Web 不完全一致，此处手写最小形状） */
interface WebSpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: { results: { length: number; [i: number]: { 0: { transcript?: string } } } }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

// Web 平台录音状态类型
interface WebRecordingState {
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  stream: MediaStream | null;
  mimeType: string;
}

export default function VoiceInput({
  visible,
  onClose,
  onTranscribed,
  onComplete,
  mode = 'transcribe',
  title = '语音输入',
  subtitle = '点击麦克风开始录音'
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const webRecordingRef = useRef<WebRecordingState>({
    mediaRecorder: null,
    audioChunks: [],
    stream: null,
    mimeType: 'audio/webm',
  });
  const isWebPlatform = Platform.OS === 'web';

  // Toast 辅助函数
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onTranscribedRef = useRef(onTranscribed);
  onTranscribedRef.current = onTranscribed;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  /**
   * device: iOS/Android 系统 Speech API（expo-speech-recognition，音频由系统处理）
   * browser: Web Speech API
   * legacy: 录音上传 `/api/v1/voice/transcribe`（Expo Go / 无原生模块时；服务端 Gemini）
   */
  const [speechEngine, setSpeechEngine] = useState<'none' | 'device' | 'browser' | 'legacy'>('none');
  const deviceSpeechActiveRef = useRef(false);
  const speechTranscriptRef = useRef('');
  const speechListenersRef = useRef<{ remove: () => void }[]>([]);
  /** Web Speech API 实例（仅 web） */
  const browserSpeechRecRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  /** Expo Go / 无本机识别模块：expo-av 录音后上传服务端 Gemini 转写 */
  const nativeCloudRecordingRef = useRef<{
    stopAndUnloadAsync: () => Promise<unknown>;
    getURI: () => string | null;
  } | null>(null);

  const clearSpeechListeners = () => {
    speechListenersRef.current.forEach((s) => {
      try {
        s.remove();
      } catch {
        /* ignore */
      }
    });
    speechListenersRef.current = [];
  };

  const abortDeviceSpeech = async () => {
    if (!deviceSpeechActiveRef.current) {
      clearSpeechListeners();
      return;
    }
    getOptionalExpoSpeechNativeModule()?.abort?.();
    clearSpeechListeners();
    deviceSpeechActiveRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRecording(false);
    setSpeechEngine('none');
  };

  const finalizeDeviceSpeech = async (text: string) => {
    setIsProcessing(true);
    try {
      const m = modeRef.current;
      if (m === 'extract') {
        const baseUrl = getBackendBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/voice/extract-memory-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcription: text }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
          throw new Error(body.message || body.error || '提取回忆信息失败');
        }
        const data = (await res.json()) as { transcription: string; extractedInfo: unknown };
        onCompleteRef.current?.({
          transcription: data.transcription,
          extractedInfo: data.extractedInfo ?? null,
        });
        showToast('语音识别成功', 'success');
        setTimeout(() => onCloseRef.current(), 500);
      } else {
        onTranscribedRef.current?.(text);
        showToast('语音识别成功', 'success');
        setTimeout(() => onCloseRef.current(), 500);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '处理失败';
      showToast(msg, 'error');
    } finally {
      setIsProcessing(false);
      setSpeechEngine('none');
    }
  };

  const tryStartDeviceSpeech = async (): Promise<boolean> => {
    const ExpoSpeechRecognitionModule = getOptionalExpoSpeechNativeModule();
    if (!ExpoSpeechRecognitionModule) {
      return false;
    }

    try {
      if (ExpoSpeechRecognitionModule?.isRecognitionAvailable?.() === false) {
        showToast('当前设备未提供可用的系统语音识别服务。', 'error');
        return false;
      }

      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        showToast('需要麦克风与语音识别权限 / Mic & speech recognition required', 'error');
        return false;
      }

      speechTranscriptRef.current = '';
      clearSpeechListeners();

      speechListenersRef.current.push(
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          const t = event.results?.[0]?.transcript;
          if (typeof t === 'string') speechTranscriptRef.current = t;
        })
      );

      speechListenersRef.current.push(
        ExpoSpeechRecognitionModule.addListener('error', (e) => {
          const errCode =
            e && typeof e === 'object' && 'error' in e && typeof (e as { error?: string }).error === 'string'
              ? (e as { error: string }).error
              : '';
          const nativeCode =
            e && typeof e === 'object' && 'code' in e && typeof (e as { code?: unknown }).code === 'number'
              ? (e as { code: number }).code
              : undefined;
          /**
           * Android SpeechRecognizer.ERROR_CLIENT(5)：常见于识别已结束或 stop() 与 onEnd 竞态。
           * Release 不再打 warn（避免 logcat 误报）；开发包可 console.debug 看一眼。
           */
          const benignAndroidClient5 =
            Platform.OS === 'android' &&
            errCode === 'client' &&
            nativeCode === 5 &&
            (!deviceSpeechActiveRef.current || speechTranscriptRef.current.trim().length > 0);
          if (benignAndroidClient5) {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.debug('[VoiceInput] ignored benign Android ERROR_CLIENT(5)');
            }
            return;
          }
          console.warn('expo-speech-recognition error', e);
          clearSpeechListeners();
          deviceSpeechActiveRef.current = false;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRecording(false);
          setSpeechEngine('none');
          const networkHint =
            Platform.OS === 'android' && errCode === 'network'
              ? '语音识别云端不可用（常见于网络环境）。已在 Android 13+ 优先使用端侧识别；若仍失败，请在系统设置中为中文下载离线语音数据，或改用文字输入。'
              : Platform.OS === 'ios' && errCode === 'network'
                ? '语音识别需要网络或本机离线听写包。请在 设置 → 通用 → 键盘 → 听写 中开启听写，并下载当前语言；或连接网络后再试。'
                : '';
          const langHint =
            errCode === 'language-not-supported'
              ? Platform.OS === 'ios'
                ? '本机听写资源在：设置 → 通用 → 键盘 → 听写（与「翻译」里的离线语言不是同一套）。请在该页下载「普通话-中国大陆」等；或连接网络以使用在线识别。/ On iPhone: Settings → General → Keyboard → Dictation (not Translate). Download Mandarin, or use Wi‑Fi for online recognition.'
                : '当前识别引擎不支持所选语言。请在系统设置中下载该语言的离线语音，或到设置 → 系统语言中切换为已安装离线包的语言后再试。'
              : '';
          showToast(
            langHint ||
              networkHint ||
              (typeof e === 'object' && e && 'message' in e && typeof (e as { message?: string }).message === 'string'
                ? (e as { message: string }).message
                : '') ||
              '语音识别失败 / Speech recognition failed',
            'error'
          );
        })
      );

      speechListenersRef.current.push(
        ExpoSpeechRecognitionModule.addListener('end', () => {
          clearSpeechListeners();
          deviceSpeechActiveRef.current = false;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRecording(false);
          const raw = speechTranscriptRef.current.trim();
          if (!raw) {
            showToast('未识别到语音内容 / No speech recognized', 'error');
            setSpeechEngine('none');
            return;
          }
          void finalizeDeviceSpeech(raw);
        })
      );

      const { getLocales } = await import('expo-localization');
      const locales = getLocales();
      const lang = normalizeSpeechRecognizerLocaleTag(
        locales[0]?.languageTag?.replace('_', '-') || 'en-US'
      );

      const androidApi =
        Platform.OS === 'android' ? parseInt(String(Platform.Version), 10) : 0;
      const continuous =
        Platform.OS === 'ios' ||
        (Platform.OS === 'android' && !Number.isNaN(androidApi) && androidApi >= 33);

      /**
       * iOS / Android：均经 `expo-speech-recognition` → 系统 Speech API；**不传** `requiresOnDeviceRecognition`，
       * 与产品「可联网、服务端 Gemini」一致，避免强制纯端侧带来的语言包/网络问题。
       */
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous,
        addsPunctuation: true,
      });

      deviceSpeechActiveRef.current = true;
      setSpeechEngine('device');
      setIsRecording(true);
      setRecordingDuration(0);
      intervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      return true;
    } catch (err) {
      console.warn('expo-speech-recognition start failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (
        /native module|ExpoSpeechRecognition|Cannot find native module|isRecognitionAvailable/i.test(msg) ||
        (err instanceof TypeError && /undefined/i.test(msg))
      ) {
        showToast(getSpeechNativeModuleHint(), 'error');
      } else {
        showToast(`语音识别启动失败：${msg}`, 'error');
      }
      return false;
    }
  };

  const abortNativeCloudRecording = async () => {
    const rec = nativeCloudRecordingRef.current;
    nativeCloudRecordingRef.current = null;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
    } catch {
      /* ignore */
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRecording(false);
    setSpeechEngine('none');
  };

  /** 无 expo-speech-recognition 时（如 Expo Go）：录音 → POST /api/v1/voice/transcribe（服务端 Gemini） */
  const tryStartNativeCloudRecording = async (): Promise<boolean> => {
    if (isWebPlatform) return false;
    try {
      const { Audio } = await import('expo-av');
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        showToast('需要麦克风权限以录音并云端转写', 'error');
        return false;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      nativeCloudRecordingRef.current = recording;
      setSpeechEngine('legacy');
      setIsRecording(true);
      setRecordingDuration(0);
      intervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      return true;
    } catch (e) {
      console.warn('tryStartNativeCloudRecording:', e);
      showToast(e instanceof Error ? e.message : '无法开始录音', 'error');
      return false;
    }
  };

  const abortBrowserSpeech = () => {
    const r = browserSpeechRecRef.current;
    browserSpeechRecRef.current = null;
    if (!r) return;
    try {
      r.abort();
    } catch {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    }
  };

  /** Web：优先浏览器本机语音识别（不上传音频） */
  const tryStartBrowserSpeech = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    const w = window as unknown as {
      SpeechRecognition?: new () => WebSpeechRecognitionLike;
      webkitSpeechRecognition?: new () => WebSpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return false;

    try {
      const rec = new Ctor();
      const { getLocales } = await import('expo-localization');
      const locales = getLocales();
      rec.lang = locales[0]?.languageTag?.replace('_', '-') || 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      speechTranscriptRef.current = '';

      rec.onresult = (event: { results: { length: number; [i: number]: { 0: { transcript?: string } } } }) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          const seg = event.results[i];
          text += seg[0]?.transcript ?? '';
        }
        speechTranscriptRef.current = text;
      };

      rec.onerror = (event: { error?: string }) => {
        console.warn('Web Speech error', event);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRecording(false);
        setSpeechEngine('none');
        browserSpeechRecRef.current = null;
        const code = typeof event?.error === 'string' ? event.error : '';
        if (code !== 'aborted' && code !== 'no-speech') {
          showToast(
            code === 'not-allowed'
              ? '请允许麦克风权限以使用浏览器语音识别 / Allow microphone for speech recognition'
              : '浏览器语音识别失败 / Speech recognition failed',
            'error'
          );
        }
      };

      rec.onend = () => {
        browserSpeechRecRef.current = null;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRecording(false);
        setSpeechEngine('none');
        const raw = speechTranscriptRef.current.trim();
        if (!raw) {
          showToast('未识别到语音内容 / No speech recognized', 'error');
          return;
        }
        void finalizeDeviceSpeech(raw);
      };

      browserSpeechRecRef.current = rec;
      rec.start();
      setSpeechEngine('browser');
      setIsRecording(true);
      setRecordingDuration(0);
      intervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      return true;
    } catch (e) {
      console.warn('Web SpeechRecognition unavailable:', e);
      return false;
    }
  };

  // 清理函数
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (webRecordingRef.current.stream) {
        webRecordingRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      void abortDeviceSpeech();
      void abortNativeCloudRecording();
      abortBrowserSpeech();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      void abortDeviceSpeech();
      void abortNativeCloudRecording();
      abortBrowserSpeech();
      setSpeechEngine('none');
    }
  }, [visible]);

  // ============ Web 平台录音实现 ============
  const startWebRecording = async () => {
    try {
      console.log('Web 平台：请求麦克风权限...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      webRecordingRef.current.stream = stream;
      console.log('Web 平台：麦克风权限已授予');

      // 检测支持的音频格式
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      console.log('Web 平台：使用的音频格式:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      webRecordingRef.current.mediaRecorder = mediaRecorder;
      webRecordingRef.current.audioChunks = [];
      webRecordingRef.current.mimeType = mimeType;

      mediaRecorder.ondataavailable = (event) => {
        console.log('Web 平台：收到音频数据块，大小:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          webRecordingRef.current.audioChunks.push(event.data);
        }
      };

      // 设置 timeslice=500ms，让 ondataavailable 每 500ms 自动触发，确保数据被定期收集
      mediaRecorder.start(500);
      console.log('Web 平台：录音已开始，state:', mediaRecorder.state);

      setSpeechEngine('legacy');
      setIsRecording(true);
      setRecordingDuration(0);
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error: any) {
      console.error('Web 平台录音失败:', error);
      showToast('麦克风权限不足，请允许访问', 'error');
    }
  };

  const stopWebRecording = async () => {
    const { mediaRecorder, audioChunks, mimeType } = webRecordingRef.current;

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      console.log('Web 平台：没有正在进行的录音');
      return;
    }

    console.log('Web 平台：停止录音，state:', mediaRecorder.state);
    console.log('Web 平台：当前收集的音频块数量:', audioChunks.length);
    console.log('Web 平台：音频格式:', mimeType);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        console.log('Web 平台：录音已停止');

        if (webRecordingRef.current.stream) {
          webRecordingRef.current.stream.getTracks().forEach(track => track.stop());
        }

        const audioBlob = new Blob(audioChunks, { type: mimeType });
        console.log('Web 平台：合并后音频大小:', audioBlob.size, 'bytes');
        console.log('Web 平台：收集到的音频块数量:', audioChunks.length);

        // 阈值检查：至少 1KB
        const MIN_AUDIO_SIZE = 1000;
        if (audioBlob.size < MIN_AUDIO_SIZE) {
          console.error('Web 平台：录音文件太小，当前:', audioBlob.size, 'bytes，阈值:', MIN_AUDIO_SIZE, 'bytes');
          showToast('未检测到有效音频，请重试并对着麦克风说话', 'error');
          resolve();
          return;
        }

        const audioBase64 = await blobToBase64(audioBlob);
        console.log('Web 平台：音频已转为 Base64，长度:', audioBase64?.length ?? 0);
        if (typeof audioBase64 !== 'string' || audioBase64.length < MIN_AUDIO_SIZE) {
          console.error('Web 平台：Base64 无效或过短');
          showToast('未检测到有效音频，请重试并对着麦克风说话', 'error');
          resolve();
          return;
        }

        // 根据 mimeType 确定文件扩展名
        const extension = mimeType.includes('ogg') ? '.ogg' : mimeType.includes('mp4') ? '.mp4' : '.webm';
        const filename = `recording${extension}`;

        // 关闭弹窗并上传
        resolve();
        await uploadAudio(audioBase64, filename, mimeType);
      };

      // 直接停止，因为 timeslice=500 会让 ondataavailable 自动触发
      try {
        console.log('Web 平台：停止录音...');
        mediaRecorder.stop();
      } catch (e) {
        console.error('Web 平台：停止录音失败', e);
        resolve();
      }
    });
  };

  const cancelWebRecording = async () => {
    console.log('Web 平台：取消录音...');

    const { mediaRecorder, stream } = webRecordingRef.current;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setSpeechEngine('none');

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    webRecordingRef.current = {
      mediaRecorder: null,
      audioChunks: [],
      stream: null,
      mimeType: 'audio/webm',
    };

    onClose();
  };

  // Blob 转 Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const parts = typeof result === 'string' ? result.split(',') : [];
        const base64 = parts.length > 1 ? parts[1] : parts[0];
        resolve(base64 && base64.length > 0 ? base64 : '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ============ 统一的录音控制 ============
  const startRecording = () => {
    void (async () => {
      if (isWebPlatform) {
        const browserOk = await tryStartBrowserSpeech();
        if (browserOk) return;
        await startWebRecording();
        return;
      }
      if (getOptionalExpoSpeechNativeModule()) {
        const ok = await tryStartDeviceSpeech();
        if (ok) return;
      }
      const cloudOk = await tryStartNativeCloudRecording();
      if (cloudOk) return;
      showToast(
        '无法开始语音：请允许麦克风，并确保服务端已配置 GEMINI_API_KEY（Expo Go / 无本机模块时走云端转写）；或安装含 expo-speech-recognition 的独立包。',
        'error'
      );
    })().catch((e) => console.warn('VoiceInput startRecording:', e));
  };

  const stopRecording = () => {
    void (async () => {
      if (deviceSpeechActiveRef.current) {
        const mod = getOptionalExpoSpeechNativeModule();
        try {
          /** Android：立刻 stop 易与引擎收尾竞态触发 ERROR_CLIENT(5)；微延迟更稳 */
          if (Platform.OS === 'android') {
            await new Promise<void>((r) => setTimeout(r, 40));
            if (!deviceSpeechActiveRef.current) return;
          }
          mod?.stop?.();
        } catch {
          deviceSpeechActiveRef.current = false;
          setIsRecording(false);
          setSpeechEngine('none');
        }
        return;
      }
      if (nativeCloudRecordingRef.current) {
        const rec = nativeCloudRecordingRef.current;
        nativeCloudRecordingRef.current = null;
        try {
          if (Platform.OS === 'android') {
            await new Promise<void>((r) => setTimeout(r, 40));
          }
          await rec.stopAndUnloadAsync();
        } catch {
          setIsRecording(false);
          setSpeechEngine('none');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }
        const uri = rec.getURI();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRecording(false);
        if (!uri) {
          showToast('未获得录音文件', 'error');
          setSpeechEngine('none');
          return;
        }
        try {
          /** SDK 54：主入口 `readAsStringAsync` 已弃用且会抛错，须用 legacy 子路径 */
          const FileSystem = await import('expo-file-system/legacy');
          const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
          await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
          const lower = uri.toLowerCase();
          const mimeType = lower.includes('.webm') ? 'audio/webm' : 'audio/m4a';
          const filename = mimeType === 'audio/webm' ? 'recording.webm' : 'recording.m4a';
          await uploadAudio(b64, filename, mimeType);
        } catch (e) {
          console.warn('native cloud recording finalize:', e);
          showToast(e instanceof Error ? e.message : '读取录音失败', 'error');
          setSpeechEngine('none');
        }
        return;
      }
      if (browserSpeechRecRef.current) {
        try {
          browserSpeechRecRef.current.stop();
        } catch {
          abortBrowserSpeech();
          setIsRecording(false);
          setSpeechEngine('none');
        }
        return;
      }
      if (isWebPlatform) await stopWebRecording();
    })().catch((e) => console.warn('VoiceInput stopRecording:', e));
  };

  const cancelRecording = () => {
    void (async () => {
      if (deviceSpeechActiveRef.current) {
        await abortDeviceSpeech();
        onClose();
        return;
      }
      if (nativeCloudRecordingRef.current) {
        await abortNativeCloudRecording();
        onClose();
        return;
      }
      if (browserSpeechRecRef.current || speechEngine === 'browser') {
        abortBrowserSpeech();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsRecording(false);
        setSpeechEngine('none');
        onClose();
        return;
      }
      if (isWebPlatform) await cancelWebRecording();
      else onClose();
    })().catch((e) => console.warn('VoiceInput cancelRecording:', e));
  };

  // ============ 上传音频到后端（仅 Web 且浏览器不支持 Web Speech 时用于转写；移动端不使用） ============
  const uploadAudio = async (audioBase64: string, filename: string, mimeType: string) => {
    if (typeof audioBase64 !== 'string' || audioBase64.trim().length < 100) {
      showToast('未检测到有效音频，请重试并对着麦克风说话', 'error');
      setSpeechEngine('none');
      return;
    }

    setIsProcessing(true);

    const baseUrl = getBackendBaseUrl();
    const apiUrl = mode === 'extract'
      ? `${baseUrl}/api/v1/voice/transcribe-and-extract`
      : `${baseUrl}/api/v1/voice/transcribe`;

    console.log('调用后端 API:', apiUrl);

    try {
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioBase64,
          filename,
          mimeType,
        }),
      });

      console.log('后端 API 响应状态:', apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('后端 API 错误:', apiResponse.status, errorText);
        let userMsg = '语音处理失败';
        try {
          const j = JSON.parse(errorText) as { message?: string; error?: string };
          if (j.message) userMsg = j.message;
          else if (j.error) userMsg = j.error;
        } catch {
          if (apiResponse.status === 503 && errorText) userMsg = '语音识别服务暂不可用';
        }
        showToast(userMsg, 'error');
        return;
      }

      const data = await apiResponse.json();
      console.log('语音处理成功:', data);

      if (mode === 'extract') {
        if (onComplete && data.transcription) {
          onComplete({
            transcription: data.transcription,
            extractedInfo: data.extractedInfo || null,
          });
          showToast('语音识别成功', 'success');
          setTimeout(() => onClose(), 500);
        } else {
          showToast('未识别到语音内容，请重试', 'error');
        }
      } else if (onTranscribed) {
        if (data.transcription) {
          onTranscribed(data.transcription);
          showToast('语音识别成功', 'success');
          setTimeout(() => onClose(), 500);
        } else {
          showToast('未识别到语音内容，请重试', 'error');
        }
      }

    } catch (error: any) {
      console.error('上传失败:', error);
      showToast('网络请求失败，请重试', 'error');
    } finally {
      setIsProcessing(false);
      setSpeechEngine('none');
    }
  };

  // ============ 格式化时长 ============
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ============ 渲染 ============
  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={cancelRecording}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Toast 提示 */}
            <Toast toasts={toasts} onDismiss={dismissToast} />

            {/* 加载指示器 */}
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <View style={styles.processingContent}>
                  <Ionicons name="sync" size={32} color="#7C6AFF" />
                  <Text style={styles.processingText}>正在识别语音...</Text>
                </View>
              </View>
            )}

            {/* 录音波形动画 */}
            <View style={styles.waveContainer}>
              {[40, 60, 50, 70, 45].map((height, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveBar,
                    { height: isRecording ? height : 20, animationDelay: `${index * 100}ms` }
                  ]}
                />
              ))}
            </View>

            {/* 录音提示 */}
            <Text style={styles.title}>
              {isProcessing
                ? '处理中...'
                : isRecording
                  ? speechEngine === 'device'
                    ? '正在聆听…'
                    : '正在录音...'
                  : title}
            </Text>

            {/* 录音时长 */}
            {isRecording && (
              <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
            )}

            {!isRecording && !isProcessing && (
              <>
                <Text style={styles.hint}>{subtitle}</Text>
                {!isWebPlatform && isRunningInsideExpoGo() ? (
                  <Text style={styles.expoGoBanner}>
                    Expo Go：语音将录音并上传到你的后端，由服务端 Gemini 转写（需配置 GEMINI_API_KEY 且手机能访问
                    EXPO_PUBLIC_BACKEND_BASE_URL）。亦可用开发构建启用本机识别。
                  </Text>
                ) : null}
              </>
            )}

            {/* 录音按钮 */}
            {!isProcessing && (
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={32}
                  color="#FFF"
                />
              </TouchableOpacity>
            )}

            {/* 取消按钮 */}
            {!isProcessing && (
              <TouchableOpacity style={styles.cancelButton} onPress={cancelRecording}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            )}

            {/* 平台标识 */}
            <Text style={styles.platformHint}>
              {!isWebPlatform && isRunningInsideExpoGo() && speechEngine === 'none'
                ? 'Expo Go · 默认云端转写'
                : speechEngine === 'device'
                  ? '本机识别 · Speech API'
                  : speechEngine === 'browser'
                    ? '本机识别 · Web Speech'
                    : speechEngine === 'legacy'
                      ? isWebPlatform
                        ? 'Web · 云端转写'
                        : '移动 · 云端转写（Gemini）'
                      : isWebPlatform
                        ? 'Web'
                        : '移动'}
            </Text>
          </View>
        </View>
      </Modal>
    </>
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
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: 280,
    minHeight: 320,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  processingContent: {
    alignItems: 'center',
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    marginBottom: 20,
  },
  waveBar: {
    width: 6,
    backgroundColor: '#7C6AFF',
    borderRadius: 3,
    marginHorizontal: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  duration: {
    fontSize: 32,
    fontWeight: '300',
    color: '#7C6AFF',
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
    textAlign: 'center',
  },
  expoGoBanner: {
    fontSize: 12,
    color: '#B45309',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    textAlign: 'left',
    lineHeight: 18,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C6AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  recordButtonActive: {
    backgroundColor: '#FF4757',
  },
  cancelButton: {
    padding: 8,
  },
  platformHint: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 10,
    color: '#CCC',
  },
});
