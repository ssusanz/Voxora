// 与项目根 start_voxora_clean_dev.sh 的 PUBLIC_IP、BACKEND_PORT 一致。
// 对外发布 / 外网真机缺省走公网；纯内网调试可改为 http://<LAN_IP>:19091
export default {
  name: 'Voxora',
  scheme: 'voxora',
  slug: 'voxora',
  version: '1.0.0',
  ios: { bundleIdentifier: 'com.yourname.voxora' },
  android: { package: 'com.yourname.voxora' },
  extra: { apiUrl: 'http://116.237.2.237:19091' },
};
