jest.mock('react-native-audio-api', () => ({
  AudioRecorder: class AudioRecorder {
    constructor() {}
    start() {}
    stop() {}
    clearOnAudioReady() {}
    clearOnError() {}
    disableFileOutput() {}
    setOnAudioReady() {}
    setOnError() {}
  },
  AudioManager: {
    setAudioSessionOptions: () => {},
  },
  FileFormat: { WAV: 'wav' },
  FileDirectory: { Cache: 'cache' },
  FilePreset: { HIGH: 'high' },
}));

jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'zh', countryCode: 'CN', languageTag: 'zh-CN' }],
}));

// 全局初始化 i18n（mock 后 getLocales 返回 zh，t() 输出中文源文案，
// 测试中的中文文案断言无需修改）
require('./src/i18n');
