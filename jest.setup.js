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
