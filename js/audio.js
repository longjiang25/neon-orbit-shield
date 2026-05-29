/**
 * audio.js — 程序化音效引擎
 * 使用 Web Audio API 生成所有音效，无需加载外部音频文件
 */

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

function playTone(freq, duration, type = 'square', volume = 0.12, detune = 0) {
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

function playNoise(duration, volume = 0.08) {
  if (muted) return;
  ensureContext();
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
  source.stop(audioCtx.currentTime + duration);
}

export function initAudio() {
  // 首次用户交互时激活 AudioContext
  const handler = () => {
    ensureContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    document.removeEventListener('pointerdown', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('pointerdown', handler);
  document.addEventListener('keydown', handler);
}

// 弹开弹幕 — 短促清脆 "叮"
export function playBlock() {
  playTone(880, 0.06, 'square', 0.10);
  setTimeout(() => playTone(1320, 0.04, 'sine', 0.06), 30);
}

// 完美格挡 — 更高音 + 回声
export function playPerfectBlock() {
  playTone(1320, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(1760, 0.05, 'sine', 0.06), 50);
}

// 核心受伤 — 低频 "咚" + 噪声
export function playHit() {
  playTone(80, 0.25, 'sawtooth', 0.15);
  playNoise(0.15, 0.1);
}

// 连击里程碑 — 音调随连击级别递增
export function playCombo(level) {
  const baseFreq = 440 + level * 110;
  playTone(baseFreq, 0.08, 'square', 0.10);
  setTimeout(() => playTone(baseFreq * 1.5, 0.06, 'square', 0.07), 40);
}

// 收集道具 — 上行三音阶
export function playPowerup() {
  playTone(660, 0.06, 'sine', 0.10);
  setTimeout(() => playTone(880, 0.06, 'sine', 0.10), 70);
  setTimeout(() => playTone(1100, 0.08, 'sine', 0.12), 140);
}

// Boss 登场 — 脉冲警告音
export function playBossWarning() {
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      playTone(200, 0.1, 'square', 0.12);
    }, i * 250);
  }
}

// 大招释放 — 低频震撼
export function playUltimate() {
  playTone(110, 0.4, 'sawtooth', 0.18);
  playNoise(0.3, 0.12);
  setTimeout(() => playTone(55, 0.4, 'sine', 0.15), 400);
}

// 游戏结束 — 下行三音
export function playGameOver() {
  playTone(440, 0.3, 'sawtooth', 0.12);
  setTimeout(() => playTone(220, 0.3, 'sawtooth', 0.12), 350);
  setTimeout(() => playTone(110, 0.5, 'sawtooth', 0.15), 700);
}

// Boss 受伤 — 短促重击
export function playBossHit() {
  playTone(100, 0.05, 'square', 0.14);
  playNoise(0.05, 0.06);
}

// 波次清除 — 上行四音阶
export function playWaveClear() {
  playTone(440, 0.06, 'sine', 0.08);
  setTimeout(() => playTone(660, 0.06, 'sine', 0.08), 80);
  setTimeout(() => playTone(880, 0.06, 'sine', 0.08), 160);
  setTimeout(() => playTone(1100, 0.1, 'sine', 0.10), 240);
}

// 静音切换
export function toggleMute() {
  muted = !muted;
  return muted;
}

// 获取静音状态
export function isMuted() {
  return muted;
}
