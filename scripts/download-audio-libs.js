/**
 * postinstall: 确保 react-native-audio-api 的预编译原生库就位。
 *
 * 三级回退：
 *   1. vendor/audio-libs/ 有 zip → 直接解压（零网络）
 *   2. vendor 没有 → GitHub 下载，先存回 vendor/ 再解压（下次不再赌网络）
 *   3. 下载也失败 → 明确报错并给出代理配置提示
 *
 * 背景：这些 .a/.so 是构建必需产物，但 node_modules 里留不住（清理工具 /
 * 依赖重装都可能冲掉），GitHub 直连又时常不通，所以本地必须留一份 zip。
 */
const fs = require('fs');
const path = require('path');
const fetch = require('cross-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const unzipper = require('unzipper');

const BASE = 'https://github.com/software-mansion-labs/rn-audio-libs/releases/download/v3.1.0';
const PKG_ROOT = path.resolve(__dirname, '../node_modules/react-native-audio-api');
const VENDOR_DIR = path.resolve(__dirname, '../vendor/audio-libs');

const DEST_MAP = {
  'android.zip': path.join(PKG_ROOT, 'common/cpp/audioapi/external'),
  'jniLibs.zip': path.join(PKG_ROOT, 'android/src/main'),
};

// 幂等检查必须看解压产物本身：external/ 与 android/src/main/ 在 npm 包里自带
// 其他内容（include/ 等），目录非空不代表预编译库已就位
const CHECK_MAP = {
  'android.zip': path.join(PKG_ROOT, 'common/cpp/audioapi/external/android'),
  'jniLibs.zip': path.join(PKG_ROOT, 'android/src/main/jniLibs'),
};

async function downloadToVendor(file) {
  const url = `${BASE}/${file}`;
  const dest = path.join(VENDOR_DIR, file);
  const tmp = `${dest}.part`;

  const agent = process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined;

  console.log(`[audio-libs] downloading ${url}`);
  const res = await fetch(url, { agent });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  try {
    await new Promise((resolve, reject) => {
      // 先写 .part 再 rename，避免中断留下截断的 zip 污染 vendor 缓存
      res.body.pipe(fs.createWriteStream(tmp)).on('finish', resolve).on('error', reject);
    });
    fs.renameSync(tmp, dest);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
  console.log(`[audio-libs] saved to ${dest}`);
}

async function extractZip(zipPath, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  await new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: dest }))
      .on('close', resolve)
      .on('error', reject);
  });
}

async function ensureLib(file) {
  const check = CHECK_MAP[file];

  // 幂等：解压产物已存在则跳过，避免每次 install 都重新下载赌网络
  if (fs.existsSync(check) && fs.readdirSync(check).length > 0) {
    console.log(`[audio-libs] ${check} already exists, skipping`);
    return;
  }

  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  const vendorZip = path.join(VENDOR_DIR, file);

  if (fs.existsSync(vendorZip)) {
    console.log(`[audio-libs] using vendored ${file}`);
  } else {
    try {
      await downloadToVendor(file);
    } catch (err) {
      throw new Error(
        `下载 ${file} 失败：${err.message}\n` +
          'GitHub 直连可能被阻断。请在 PowerShell 配置代理后重试：\n' +
          '  $env:HTTPS_PROXY = "http://127.0.0.1:<代理端口>"\n' +
          '  node scripts\\download-audio-libs.js',
      );
    }
  }

  console.log(`[audio-libs] extracting ${file} to ${DEST_MAP[file]}`);
  try {
    await extractZip(vendorZip, DEST_MAP[file]);
  } catch (err) {
    throw new Error(
      `解压 ${file} 失败：${err.message}\n` +
        `vendor 缓存可能损坏，删除后重试：vendor/audio-libs/${file}`,
    );
  }
  console.log(`[audio-libs] extracted ${file}`);
}

(async () => {
  try {
    for (const f of Object.keys(DEST_MAP)) await ensureLib(f);
    console.log('[audio-libs] all native libs in place.');
  } catch (err) {
    console.error('[audio-libs] Failed:', err.message);
    process.exit(1);
  }
})();
