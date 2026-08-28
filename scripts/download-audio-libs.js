const fs = require('fs');
const path = require('path');
const fetch = require('cross-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const unzipper = require('unzipper');

const BASE = 'https://github.com/software-mansion-labs/rn-audio-libs/releases/download/v3.1.0';
const PKG_ROOT = path.resolve(__dirname, '../node_modules/react-native-audio-api');

const DEST_MAP = {
  'android.zip': path.join(PKG_ROOT, 'common/cpp/audioapi/external'),
  'jniLibs.zip': path.join(PKG_ROOT, 'android/src/main'),
};

async function downloadAndExtract(file) {
  const url = `${BASE}/${file}`;
  const dest = DEST_MAP[file];

  // 幂等：目标目录已存在（上次已解压）则跳过，避免每次 install 都重新下载赌网络
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
    console.log(`[audio-libs] ${dest} already exists, skipping download`);
    return;
  }

  console.log(`Downloading ${url}...`);
  console.log(`Extracting to ${dest}`);

  const agent = process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined;

  const res = await fetch(url, { agent });
  if (!res.ok) throw new Error(`Failed to download ${file}: ${res.status}`);

  await fs.promises.mkdir(dest, { recursive: true });
  await new Promise((resolve, reject) => {
    res.body
      .pipe(unzipper.Extract({ path: dest }))
      .on('close', resolve)
      .on('error', reject);
  });
  console.log(`Extracted ${file}`);
}

(async () => {
  try {
    for (const f of Object.keys(DEST_MAP)) await downloadAndExtract(f);
    console.log('All audio libs downloaded and extracted.');
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();
