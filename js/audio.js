/**
 * audio.js — 程序化音效引擎
 * 使用 Web Audio API 生成所有音效，无需加载外部音频文件
 *
 * 微信浏览器兼容策略：
 * - AudioContext 必须在用户手势中直接创建/恢复
 * - 创建后立即播放静音缓冲来"解锁"音频
 * - 同时监听 touchstart + click 确保首次交互就激活
 */

let audioCtx = null;
let muted = false;
let audioUnlocked = false;

/**
 * 创建并激活 AudioContext（必须在用户手势中调用）
 */
function ensureContext() {
  if (audioUnlocked) {
    // 已解锁，只需确保未 suspend
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return;
  }

  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported');
        return;
      }
      audioCtx = new AudioCtx();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        unlockAudio();
      }).catch(() => {
        // 某些浏览器 resume 可能失败，重试一次
        setTimeout(() => {
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => unlockAudio()).catch(() => {});
          }
        }, 100);
      });
    } else if (audioCtx.state === 'running') {
      unlockAudio();
    }
  } catch (e) {
    console.warn('Failed to create AudioContext:', e.message);
  }
}

/**
 * 播放静音缓冲来"解锁"音频（微信等浏览器需要）
 */
function unlockAudio() {
  if (audioUnlocked || !audioCtx) return;
  try {
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
    source.stop(audioCtx.currentTime + 0.001);
    audioUnlocked = true;
  } catch (e) {
    // 静默失败
    audioUnlocked = true; // 即使解锁失败也标记，避免死循环
  }
}

// ====================================================================
// 音效生成
// ====================================================================

function playTone(freq, duration, type = 'square', volume = 0.12, detune = 0) {
  if (muted || !audioCtx || !audioUnlocked) return;
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
      return;
    }
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
  } catch (e) {
    // 静默处理
  }
}

function playNoise(duration, volume = 0.08) {
  if (muted || !audioCtx || !audioUnlocked) return;
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
      return;
    }
    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
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
  } catch (e) {
    // 静默处理
  }
}

// ====================================================================
// 初始化和解锁
// ====================================================================

export function initAudio() {
  // 多重保险：在多种用户手势事件中都尝试激活音频
  const unlock = (e) => {
    ensureContext();
  };

  // touchstart — 最早触发（微信常用）
  document.addEventListener('touchstart', unlock, { once: false, passive: true });
  // pointerdown — 标准
  document.addEventListener('pointerdown', unlock, { once: false });
  // click — 兜底
  document.addEventListener('click', unlock, { once: false });
  // keydown — 键盘
  document.addEventListener('keydown', unlock, { once: false });

  // 微信 JS-SDK 就绪后也尝试激活
  if (typeof window.WeixinJSBridge !== 'undefined') {
    try {
      window.WeixinJSBridge.invoke('getNetworkType', {}, () => {
        ensureContext();
      });
    } catch (e) {}
  } else {
    document.addEventListener('WeixinJSBridgeReady', () => {
      try {
        window.WeixinJSBridge.invoke('getNetworkType', {}, () => {
          ensureContext();
        });
      } catch (e) {}
    }, { once: true });
  }
}

/**
 * 供外部主动调用，确保 AudioContext 已激活
 * 在菜单点击等明确的用户手势中调用
 */
export function ensureAudioContext() {
  ensureContext();
}

// ====================================================================
// 音效函数
// ====================================================================

export function playBlock() {
  playTone(880, 0.06, 'square', 0.10);
  setTimeout(() => playTone(1320, 0.04, 'sine', 0.06), 30);
}

export function playPerfectBlock() {
  playTone(1320, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(1760, 0.05, 'sine', 0.06), 50);
}

export function playHit() {
  playTone(80, 0.25, 'sawtooth', 0.15);
  playNoise(0.15, 0.1);
}

export function playCombo(level) {
  const baseFreq = 440 + level * 110;
  playTone(baseFreq, 0.08, 'square', 0.10);
  setTimeout(() => playTone(baseFreq * 1.5, 0.06, 'square', 0.07), 40);
}

export function playPowerup() {
  playTone(660, 0.06, 'sine', 0.10);
  setTimeout(() => playTone(880, 0.06, 'sine', 0.10), 70);
  setTimeout(() => playTone(1100, 0.08, 'sine', 0.12), 140);
}

export function playBossWarning() {
  for (let i = 0; i < 8; i++) {
    setTimeout(() => { playTone(200, 0.1, 'square', 0.12); }, i * 250);
  }
}

export function playUltimate() {
  playTone(110, 0.4, 'sawtooth', 0.18);
  playNoise(0.3, 0.12);
  setTimeout(() => playTone(55, 0.4, 'sine', 0.15), 400);
}

export function playGameOver() {
  playTone(440, 0.3, 'sawtooth', 0.12);
  setTimeout(() => playTone(220, 0.3, 'sawtooth', 0.12), 350);
  setTimeout(() => playTone(110, 0.5, 'sawtooth', 0.15), 700);
}

export function playBossHit() {
  playTone(100, 0.05, 'square', 0.14);
  playNoise(0.05, 0.06);
}

export function playWaveClear() {
  playTone(440, 0.06, 'sine', 0.08);
  setTimeout(() => playTone(660, 0.06, 'sine', 0.08), 80);
  setTimeout(() => playTone(880, 0.06, 'sine', 0.08), 160);
  setTimeout(() => playTone(1100, 0.1, 'sine', 0.10), 240);
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}
