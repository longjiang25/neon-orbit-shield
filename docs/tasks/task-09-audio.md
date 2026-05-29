# 任务 9：音效引擎

## 开发目标
使用 Web Audio API 实现程序化音效（弹开、受伤、Boss、道具、连击、大招、游戏结束）。

## 前置依赖
- 任务 0（config.js）

## 输入文件
- `js/audio.js` — 待实现

## 详细实现规格

### 音效引擎架构
```js
let audioCtx = null;
let muted = false;

function ensureContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, duration, type = 'square', volume = 0.15, detune = 0) {
  if (muted) return;
  ensureContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  if (detune) osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, volume = 0.1) {
  // 白噪声 → 用于受伤/爆炸音效
  // 使用 AudioBuffer 生成随机样本
}
```

### 音效清单

| 函数 | 触发事件 | 频率 | 时长 | 波形 | 额外 |
|------|---------|------|------|------|------|
| playBlock() | 弹开弹幕 | 880Hz | 60ms | square | |
| playPerfectBlock() | 完美格挡 | 1320Hz | 80ms | sine | 小回声 |
| playHit() | 核心受伤 | 80Hz | 300ms | sawtooth | +噪声 +降调 |
| playCombo(level) | 连击里程碑 | 440+level*100Hz | 100ms | square | 递增音阶 |
| playPowerup() | 收集道具 | 660→880→1100 | 200ms | sine | 上行三音 |
| playBossWarning() | Boss 登场 | 200Hz 脉冲 | 2000ms | square | 8 次快速脉冲 |
| playUltimate() | 释放大招 | 110Hz→55Hz | 800ms | sawtooth | 低频震撼 + 白噪声 |
| playGameOver() | 游戏结束 | 440→220→110 | 1500ms | sawtooth | 下行三音 |
| playBossHit() | Boss 受伤 | 100Hz | 50ms | square | 短促重击 |
| playWaveClear() | 波次清除 | 440→660→880→1100 | 400ms | sine | 上行四音 |

### 初始化
- 首次用户交互（pointerdown/keydown）时调用 `ensureContext()`
- 同时触发一个静音音效来"解锁" AudioContext

### 静音切换
```js
export function toggleMute() {
  muted = !muted;
  return muted;
}
```

## 接口定义
```js
export function initAudio()
export function ensureContext()
export function playBlock()
export function playPerfectBlock()
export function playHit()
export function playCombo(level)
export function playPowerup()
export function playBossWarning()
export function playUltimate()
export function playGameOver()
export function playBossHit()
export function playWaveClear()
export function toggleMute()
```

## 验收标准
- [ ] 首次点击后 AudioContext 激活
- [ ] 弹开弹幕有"叮"的短音
- [ ] 核心受伤有低频"咚" + 噪声
- [ ] 连击音效随级别升高音调
- [ ] 道具收集有上行音阶
- [ ] Boss 警告有脉冲音
- [ ] 大招释放有震撼低频
- [ ] 静音功能正常

## 测试用例
1. 点击开始 → 确认 AudioContext 状态为 'running'
2. 弹开弹幕 → 听到"叮"
3. 核心被击中 → 听到"咚"
4. 连续弹开 5/10/15 个 → 听到递增音效
5. 收集道具 → 听到上行音
6. 释放大招 → 听到低频震撼
7. 游戏结束 → 听到下行音
