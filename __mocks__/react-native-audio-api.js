'use strict';

module.exports = {
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
};
