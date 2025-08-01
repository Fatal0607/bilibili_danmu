# Bilibili直播弹幕助手

![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron)
![Vue](https://img.shields.io/badge/Vue-4FC08D?logo=vuedotjs)

基于Electron+Vue3开发的B站直播弹幕桌面应用，支持实时弹幕显示、样式自定义功能。

## ✨ 功能特性

- 🚀 实时获取B站直播间弹幕
- 🎨 弹幕样式自定义（字体/颜色/透明度/显示区域）
- 📊 弹幕数据可视化统计
- ⚙️ 用户配置持久化存储
- 📦 多平台打包支持（Windows/macOS/Linux）

## 🛠 技术栈

| 模块          | 技术方案                 |
|---------------|------------------------|
| 核心框架      | Electron + Vue3        |
| 状态管理      | Pinia                  |
| UI组件库      | Element Plus           |
| 构建工具      | Vite                   |
| 数据可视化    | ECharts                |
| 持久化存储    | pinia-plugin-persistedstate |

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 9+

### 安装依赖
```bash
npm install
# 若遇到依赖问题
npm install --force
```

### 开发模式
```bash
npm run dev
```

### 生产构建
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 📁 项目结构
```
bilibili_danmu/
├── src/
│   ├── main/          Electron主进程
│   ├── preload/       预加载脚本
│   └── renderer/      渲染进程(Vue应用)
│       └── src/
│           ├── views/ 页面组件
│           ├── store/ Pinia状态管理
│           └── api/   B站API封装
└── electron.vite.config.js Electron-Vite配置
```

## 🔌 实现原理

1. **弹幕获取**
   - 通过WebSocket连接B站直播服务器
   - 解析protobuf格式的弹幕数据
   ```js
   // 示例代码：建立WebSocket连接
   const ws = new WebSocket('wss://broadcastlv.chat.bilibili.com/sub');
   ```

2. **弹幕渲染**
   - 使用CSS动画实现滚动效果
   - 基于Canvas的弹幕碰撞检测


## 📜 开源协议
MIT License
