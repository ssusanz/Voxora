import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * 创建 FormData 文件对象
 * 用于文件上传到后端
 *
 * @param uri - 文件 URI
 * @param name - 文件名
 * @param type - MIME 类型
 * @returns FormData 文件对象
 */
export function createFormDataFile(uri: string, name: string, type: string): any {
  return {
    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
    name,
    type,
  };
}
