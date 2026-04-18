import { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.COZE_PROJECT_NAME || process.env.EXPO_PUBLIC_COZE_PROJECT_NAME || '应用';
const projectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;
/**
 * Expo / EAS 的 slug，须与 expo.dev 上项目名一致。
 * 当前账号下已由 `eas init` 创建的项目为 `myapp`（见 projects/myapp）。
 */
const slugAppName = projectId ? `app${projectId}` : 'myapp';

/** `eas init` 在动态 app.config 下无法自动写入，需保留在此（可被 EAS_PROJECT_ID 覆盖） */
const EAS_DEFAULT_PROJECT_ID = 'fc6787d7-ab8c-4e35-b55f-dd49251d1192';

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseExtra =
    config.extra && typeof config.extra === 'object' ? (config.extra as Record<string, unknown>) : {};
  const baseEas =
    baseExtra.eas && typeof baseExtra.eas === 'object' ? (baseExtra.eas as Record<string, unknown>) : {};
  const easProjectId =
    (typeof process.env.EAS_PROJECT_ID === 'string' && process.env.EAS_PROJECT_ID.trim()) ||
    (typeof baseEas.projectId === 'string' && baseEas.projectId.trim()) ||
    EAS_DEFAULT_PROJECT_ID;

  return {
    ...config,
    "name": appName,
    "slug": slugAppName,
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": `com.anonymous.x${projectId || '0'}`
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      process.env.EXPO_PUBLIC_BACKEND_BASE_URL ? [
        "expo-router",
        {
          "origin": process.env.EXPO_PUBLIC_BACKEND_BASE_URL
        }
      ] : 'expo-router',
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": `允许Voxora 家庭回忆录App访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许Voxora 家庭回忆录App使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许Voxora 家庭回忆录App访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": `Voxora 家庭回忆录App需要访问您的位置以提供周边服务及导航功能。`
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": `Voxora 家庭回忆录App需要访问相机以拍摄照片和视频。`,
          "microphonePermission": `Voxora 家庭回忆录App需要访问麦克风以录制视频声音。`,
          "recordAudioAndroid": true
        }
      ],
      [
        "expo-speech-recognition",
        {
          microphonePermission: `${appName} needs the microphone to capture your voice for memories.`,
          speechRecognitionPermission: `${appName} transcribes speech on your device (no region-locked cloud ASR).`,
          androidSpeechServicePackages: ["com.google.android.googlequicksearchbox"],
        },
      ],
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      ...baseExtra,
      eas: {
        ...baseEas,
        projectId: easProjectId,
      },
    },
  };
}
