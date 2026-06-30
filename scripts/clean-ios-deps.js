// @ts-check
// postinstall: 在 Windows 上自动删除 iOS/macOS 预编译库，避免 Metro 因 symlink 崩溃
const fs = require('fs');
const path = require('path');

if (process.platform !== 'win32') {
  process.exit(0);
}

const externalDir = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-audio-api',
  'common',
  'cpp',
  'audioapi',
  'external',
);

const iosDirs = ['ffmpeg_ios', 'iphoneos', 'iphonesimulator', 'macosx'];

let deleted = 0;
for (const dir of iosDirs) {
  const dirPath = path.join(externalDir, dir);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3 });
      console.log(`  [clean-ios] deleted ${dir}`);
      deleted++;
    } catch (e) {
      console.error(`  [clean-ios] failed to delete ${dir}: ${e.message}`);
    }
  }
}

if (deleted > 0) {
  console.log(
    `  [clean-ios] removed ${deleted} iOS/macOS dir(s) — iOS is not supported on Windows`,
  );
} else {
  console.log('  [clean-ios] no iOS/macOS dirs found, skipping');
}
