# Neon Orbit Shield — 霓虹轨道护盾

一款赛博朋克风格的轨道护盾防御游戏。旋转能量护盾，保护中央核心不被霓虹弹幕摧毁。

## 🎮 玩法

- **鼠标/触屏**：拖动控制护盾旋转
- **键盘**：方向键 / WASD 旋转护盾
- **空格键**：释放大招（能量满时）

阻挡弹幕得分，弹幕击中核心扣血。每 5 波出现 Boss！

## 🚀 快速开始

直接在浏览器中打开 `index.html`，或部署到任意静态托管服务。

### GitHub Pages 部署

1. Fork 或创建仓库
2. Settings → Pages → Source: Deploy from branch `main`
3. 访问 `https://<username>.github.io/neon-orbit-shield/`

## 🛠 技术栈

- HTML5 Canvas
- ES6 Modules
- Web Audio API
- 零依赖，纯原生 JavaScript

## 📁 项目结构

```
├── index.html
├── css/
│   ├── style.css
│   └── animations.css
├── js/
│   ├── main.js          # 入口 + 游戏循环
│   ├── config.js        # 所有常量参数
│   ├── utils.js         # 数学工具
│   ├── renderer.js      # 渲染引擎
│   ├── shield.js        # 护盾系统
│   ├── projectile.js    # 弹幕系统
│   ├── particle.js      # 粒子特效
│   ├── boss.js          # Boss 系统
│   ├── powerup.js       # 道具系统
│   ├── difficulty.js    # 难度管理
│   ├── audio.js         # 音效引擎
│   ├── ui.js            # UI 管理
│   └── storage.js       # 数据持久化
├── docs/
│   ├── design.md
│   ├── tasks/
│   └── test-report.md
└── assets/
    └── favicon.svg
```

## 📄 License

MIT
