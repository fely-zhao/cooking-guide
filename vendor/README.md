# vendor/ — 本地缓存，不入 git

`audio-libs/` 存放 react-native-audio-api 的预编译原生库 zip（android.zip、jniLibs.zip）。

`scripts/download-audio-libs.js` 按三级回退取库：

1. 本目录有 zip → 直接解压进 node_modules（零网络）
2. 本目录没有 → 从 GitHub 下载，**先存回本目录**再解压
3. 下载失败 → 报错并提示配置代理（`HTTPS_PROXY` 环境变量）

node_modules 里的库丢失时（依赖重装、清理工具等），重跑该脚本即可本地秒级恢复。
