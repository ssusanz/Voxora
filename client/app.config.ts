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

/**
 * iOS Bundle ID（EAS `eas build -p ios` 必填）。须在你当前 Apple Team 下可注册（全球唯一）。
 * `com.anonymous.*` 易被占用；默认改为与 Expo 账号一致的 reverse-DNS。
 * 覆盖：`IOS_BUNDLE_IDENTIFIER=com.yourcompany.yourapp`
 */
const iosBundleIdentifier =
  (typeof process.env.IOS_BUNDLE_IDENTIFIER === 'string' && process.env.IOS_BUNDLE_IDENTIFIER.trim()) ||
  'com.susanshpd.voxora';

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
    "version": "1.2.1",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": iosBundleIdentifier,
      /**
       * 与 Android usesCleartextTraffic 对应：当前后端为 http 时避免 ATS 拦截。
       * 全站 HTTPS 后可改为按域名 NSExceptionDomains 或移除此项。
       */
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true,
        },
      },
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": `com.anonymous.x${projectId || '0'}`,
      /** 允许 http 明文 API（局域网 / 公网 IP 无 TLS 时）；上架生产若已全站 https 可再改为 false */
      // @ts-expect-error Expo prebuild 会写入 manifest；@expo/config-types 可能未收录
      usesCleartextTraffic: true,
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
          /** quicksearchbox：传统云端；as：Android System Intelligence，端侧识别常用（Pixel） */
          androidSpeechServicePackages: [
            'com.google.android.googlequicksearchbox',
            'com.google.android.as',
          ],
        },
      ],
      /** 与 android.usesCleartextTraffic 双保险：EAS 预构建写入 Gradle，避免 OkHttp 明文 http 被拒 */
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      ...baseExtra,
      /** 与 EXPO_PUBLIC_BACKEND_BASE_URL 同步写入，便于 Constants.expoConfig.extra 在独立包内读取 */
      backendBaseUrl:
        (typeof process.env.EXPO_PUBLIC_BACKEND_BASE_URL === 'string' &&
          process.env.EXPO_PUBLIC_BACKEND_BASE_URL.trim()) ||
        '',
      eas: {
        ...baseEas,
        projectId: easProjectId,
      },
    },
  };
}
