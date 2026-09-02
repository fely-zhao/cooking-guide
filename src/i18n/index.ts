import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import { settingsStorage } from '../services/storage';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

export type AppLanguage = 'zh' | 'en';

/**
 * 语言解析优先级：设置页覆盖（MMKV settings.language）> 系统语言 > 'zh' 兜底。
 * MMKV 无值 = 用户从未选择，跟随系统语言；选择后立即写入 MMKV，此后固定。
 * 详见 docs/架构与技术文档.md 3.5。
 */
function resolveInitialLanguage(): AppLanguage {
  const stored = settingsStorage.get('language');
  if (stored) return stored;
  try {
    if (getLocales()[0]?.languageCode === 'en') return 'en';
  } catch {
    // native module 不可用（如 jest 环境）时走兜底
  }
  return 'zh';
}

/** 唯一切换入口：MMKV 持久化 + i18next 即时切换必须同时做，禁止单独改其一 */
export function changeAppLanguage(lang: AppLanguage): void {
  settingsStorage.set('language', lang);
  void i18n.changeLanguage(lang);
}

// t() 的 key 类型来自 zh-CN.json；新增 key 先加 zh-CN.json 再同步 en.json
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: typeof zhCN;
    };
  }
}

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zhCN },
    en: { translation: en },
  },
  lng: resolveInitialLanguage(),
  fallbackLng: 'zh',
  interpolation: { escapeValue: false }, // RN 渲染无 HTML 注入面，不需要 escape
});

export default i18n;
