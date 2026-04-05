/**
 * Metro 入口：必须在 @expo/metro-runtime 之前执行 polyfill。
 * metro-runtime → location/install.native → expo → Expo.fx → winter/runtime →
 * async-require/setup → HMRClient.setup（expo/src/async-require/hmr.ts）会访问 document / location；
 * 仅在 app/_layout 里 import 时序太晚，Hermes 会报 Property 'document' doesn't exist。
 */
import './polyfills/domMinimal';
import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

renderRootComponent(App);
