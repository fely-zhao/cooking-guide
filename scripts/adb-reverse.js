const { execSync } = require('child_process');
const fs = require('fs');

// Try to locate adb — prefer explicit path, fall back to PATH
function findAdb() {
  const candidates = [
    // Common Windows locations
    `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`,
    'C:\\Android\\Sdk\\platform-tools\\adb.exe',
    'C:\\platform-tools\\adb.exe',
    // WSL / Linux / macOS — just use PATH
    'adb',
  ];

  for (const candidate of candidates) {
    try {
      // On Windows, check if file exists
      if (candidate.endsWith('.exe') && !fs.existsSync(candidate)) continue;
      // Quick test — just check version
      execSync(`"${candidate}" --version`, { stdio: 'pipe' });
      return candidate;
    } catch {
      // Not found or not working, try next
    }
  }
  return null;
}

const adb = findAdb();
if (!adb) {
  console.error('[adb-reverse] 找不到 adb，请安装 Android SDK platform-tools 或将 adb 加入 PATH');
  process.exit(1);
}

console.log(`[adb-reverse] 使用 adb: ${adb}`);

const PORTS = [4000, 5000, 3001, 8081];
let failed = 0;

for (const port of PORTS) {
  try {
    execSync(`"${adb}" reverse tcp:${port} tcp:${port}`, { stdio: 'pipe' });
    console.log(`  tcp:${port} → OK`);
  } catch {
    failed++;
    console.error(`  tcp:${port} → 失败（模拟器未运行或 adb 不可用）`);
  }
}

if (failed === PORTS.length) {
  console.error('[adb-reverse] 所有端口转发失败，请确认模拟器已启动');
  process.exit(1);
}

console.log('[adb-reverse] 完成');
