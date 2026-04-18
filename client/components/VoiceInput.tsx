import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { getBackendBaseUrl } from '@/utils/backend';

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
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRecorderRef = useRef(audioRecorder);
  audioRecorderRef.current = audioRecorder;

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

  /** device: expo-speech-recognition；legacy: 录音后上传（服务端 ASR 已关闭时为回退） */
  const [speechEngine, setSpeechEngine] = useState<'none' | 'device' | 'legacy'>('none');
  const deviceSpeechActiveRef = useRef(false);
  const speechTranscriptRef = useRef('');
  const speechListenersRef = useRef<{ remove: () => void }[]>([]);

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
    try {
      const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');
      ExpoSpeechRecognitionModule.abort();
    } catch {
      /* module missing in some clients */
    }
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
    try {
      const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');
      if (ExpoSpeechRecognitionModule.isRecognitionAvailable?.() === false) {
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
          const t = event.results[0]?.transcript;
          if (typeof t === 'string') speechTranscriptRef.current = t;
        })
      );

      speechListenersRef.current.push(
        ExpoSpeechRecognitionModule.addListener('error', (e) => {
          console.warn('expo-speech-recognition error', e);
          clearSpeechListeners();
          deviceSpeechActiveRef.current = false;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRecording(false);
          setSpeechEngine('none');
          showToast(e.message || '语音识别失败 / Speech recognition failed', 'error');
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
      const lang = locales[0]?.languageTag?.replace('_', '-') || 'en-US';

      const androidApi =
        Platform.OS === 'android' ? parseInt(String(Platform.Version), 10) : 0;
      const continuous =
        Platform.OS === 'ios' ||
        (Platform.OS === 'android' && !Number.isNaN(androidApi) && androidApi >= 33);

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
      console.warn('Device speech unavailable, using legacy recorder:', err);
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
      void audioRecorderRef.current.stop().catch(() => {
        /* not recording */
      });
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      void abortDeviceSpeech();
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

  // ============ 移动平台录音实现（expo-audio，替代已弃用的 expo-av） ============

  const startNativeRecording = async () => {
    try {
      console.log('移动平台：请求麦克风权限...');

      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        showToast('需要麦克风权限才能录音', 'error');
        return;
      }

      console.log('移动平台：麦克风权限已授予');

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      setRecordingDuration(0);

      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('移动平台：录音已开始');

    } catch (error: any) {
      console.error('移动平台录音失败:', error);
      showToast('录音失败，请重试', 'error');
    }
  };

  const stopNativeRecording = async () => {
    if (!audioRecorder.isRecording) return;

    console.log('移动平台：停止录音...');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) {
        showToast('录音文件获取失败', 'error');
        return;
      }

      console.log('移动平台：录音文件 URI:', uri);

      let audioBase64: string;
      try {
        const FS = FileSystem as {
          readAsStringAsync: (u: string, o: { encoding: string }) => Promise<string>;
          EncodingType?: { Base64: string };
        };
        const enc = FS.EncodingType?.Base64 ?? 'base64';
        audioBase64 = await FS.readAsStringAsync(uri, { encoding: enc });
      } catch (readErr) {
        console.error('移动平台：读取录音文件失败:', readErr);
        showToast('录音文件读取失败', 'error');
        return;
      }

      const b64 = typeof audioBase64 === 'string' ? audioBase64 : '';
      console.log('移动平台：音频已转为 Base64，长度:', b64.length);

      // 移动端阈值检查：至少 1KB
      const MIN_AUDIO_SIZE = 1000;
      if (b64.length < MIN_AUDIO_SIZE) {
        console.error('移动平台：音频太小，当前:', b64.length, 'bytes，阈值:', MIN_AUDIO_SIZE, 'bytes');
        showToast('未检测到有效音频，请重试并对着麦克风说话', 'error');
        return;
      }

      await uploadAudio(b64, 'recording.m4a', 'audio/m4a');

    } catch (error: any) {
      console.error('移动平台处理失败:', error);
      if (!error.message?.includes('already been unloaded')) {
        showToast('处理失败，请重试', 'error');
      }
    }
  };

  const cancelNativeRecording = async () => {
    console.log('移动平台：取消录音...');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setSpeechEngine('none');

    if (audioRecorder.isRecording) {
      try {
        await audioRecorder.stop();
      } catch (error: any) {
        console.log('停止录音时出错（忽略）:', error.message);
      }
    }

    onClose();
  };

  // ============ 统一的录音控制 ============
  const startRecording = () => {
    void (async () => {
      const ok = await tryStartDeviceSpeech();
      if (ok) return;
      setSpeechEngine('legacy');
      if (isWebPlatform) await startWebRecording();
      else await startNativeRecording();
    })();
  };

  const stopRecording = () => {
    void (async () => {
      if (deviceSpeechActiveRef.current) {
        try {
          const { ExpoSpeechRecognitionModule } = await import('expo-speech-recognition');
          ExpoSpeechRecognitionModule.stop();
        } catch {
          deviceSpeechActiveRef.current = false;
          setIsRecording(false);
          setSpeechEngine('none');
        }
        return;
      }
      if (isWebPlatform) await stopWebRecording();
      else await stopNativeRecording();
    })();
  };

  const cancelRecording = () => {
    void (async () => {
      if (deviceSpeechActiveRef.current) {
        await abortDeviceSpeech();
        onClose();
        return;
      }
      if (isWebPlatform) await cancelWebRecording();
      else await cancelNativeRecording();
    })();
  };

  // ============ 上传音频到后端 ============
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
              <Text style={styles.hint}>{subtitle}</Text>
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
              {speechEngine === 'device'
                ? 'On-device speech (iOS/Android/Web)'
                : speechEngine === 'legacy'
                  ? isWebPlatform
                    ? 'Web · 录音回退'
                    : '移动 · 录音回退'
                  : isWebPlatform
                    ? 'Web 平台'
                    : '移动平台'}
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
    marginBottom: 24,
    textAlign: 'center',
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
