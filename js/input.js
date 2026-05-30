/**
 * input.js — 统一输入处理（触屏/鼠标/键盘 + 移动端 DOM 虚拟摇杆）
 *
 * 桌面端：鼠标在 Canvas 上移动直接控制护盾角度
 * 移动端：屏幕底部 DOM 虚拟摇杆圈控制护盾角度 + 径向移动
 * 键盘：方向键旋转（全平台通用）
 */

import { normalizeAngle, angleDiff, lerpAngle, clamp } from './utils.js';
import { MOBILE_BREAKPOINT } from './config.js';

function isMobileDevice() {
  return window.innerWidth < MOBILE_BREAKPOINT || 'ontouchstart' in window;
}

export function initInput(state, canvas) {
  state.inputCanvas = canvas;

  // ---- 指针/摇杆状态 ----
  state.rotationOffset = 0;
  state.isPointerDown = false;
  state.targetShieldAngle = 0;
  state.targetShieldRadius = null;

  state.useJoystick = isMobileDevice();
  state.joystickActive = false;
  state.joystickDX = 0;
  state.joystickDY = 0;
  state.joystickRing = null;
  state.joystickThumb = null;

  // ---- 键盘 ----
  state.rotateLeft = false;
  state.rotateRight = false;
  state.spacePressed = false;

  if (state.useJoystick) {
    initJoystickInput(state);
  } else {
    initDesktopInput(state, canvas);
  }

  initKeyboardInput(state);
}

// ====================================================================
// 桌面端
// ====================================================================

function initDesktopInput(state, canvas) {
  const getAngle = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - state.cx;
    const dy = y - state.cy;
    if (dx * dx + dy * dy < 4) return null;
    return Math.atan2(dy, dx);
  };

  canvas.addEventListener('pointerdown', (e) => {
    const a = getAngle(e);
    if (a !== null) state.targetShieldAngle = a;
    state.isPointerDown = true;
    state.targetShieldRadius = null;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state.isPointerDown) return;
    const a = getAngle(e);
    if (a !== null) state.targetShieldAngle = a;
  });
  canvas.addEventListener('pointerup', () => { state.isPointerDown = false; });
  canvas.addEventListener('pointerleave', () => { state.isPointerDown = false; });
}

// ====================================================================
// 移动端 DOM 摇杆
// ====================================================================

function initJoystickInput(state) {
  const ring = document.getElementById('joystick-ring');
  const thumb = document.getElementById('joystick-thumb');
  const zone = document.getElementById('joystick-zone');
  if (!ring || !thumb || !zone) {
    console.warn('Joystick DOM elements not found, falling back to desktop');
    state.useJoystick = false;
    initDesktopInput(state, state.inputCanvas);
    return;
  }

  // 显示摇杆区域
  zone.classList.add('mobile-visible');

  state.joystickRing = ring;
  state.joystickThumb = thumb;

  const RING_SIZE = 140; // CSS 中定义的尺寸

  const getJoystickPos = (e) => {
    const rect = ring.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const maxR = rect.width / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = clamp(dist, 0, maxR);
    return {
      dx: dist > 0 ? (dx / dist) * clampedDist : 0,
      dy: dist > 0 ? (dy / dist) * clampedDist : 0,
      dist: clampedDist,
      maxR: maxR,
      cx: cx,
      cy: cy,
    };
  };

  const updateThumb = (pos) => {
    const tx = 50 + (pos.dx / pos.maxR) * 40; // -40~+40 from center
    const ty = 50 + (pos.dy / pos.maxR) * 40;
    thumb.style.left = tx + '%';
    thumb.style.top = ty + '%';
  };

  ring.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const pos = getJoystickPos(e);
    state.joystickActive = true;
    state.joystickDX = pos.dx / pos.maxR;
    state.joystickDY = pos.dy / pos.maxR;
    updateThumb(pos);
    thumb.classList.add('active');
    applyJoystickToShield(state);
  });

  ring.addEventListener('pointermove', (e) => {
    if (!state.joystickActive) return;
    e.preventDefault();
    const pos = getJoystickPos(e);
    state.joystickDX = pos.dx / pos.maxR;
    state.joystickDY = pos.dy / pos.maxR;
    updateThumb(pos);
    applyJoystickToShield(state);
  });

  const release = () => {
    state.joystickActive = false;
    state.joystickDX = 0;
    state.joystickDY = 0;
    state.targetShieldRadius = null;
    thumb.style.left = '50%';
    thumb.style.top = '50%';
    thumb.classList.remove('active');
  };

  ring.addEventListener('pointerup', release);
  ring.addEventListener('pointerleave', release);
  ring.addEventListener('pointercancel', release);
}

function applyJoystickToShield(state) {
  const dx = state.joystickDX;
  const dy = state.joystickDY;
  const dist = clamp(Math.sqrt(dx * dx + dy * dy), 0, 1);

  // 角度映射：手指方向 → 护盾方向
  if (dist > 0.05) {
    state.targetShieldAngle = Math.atan2(dy, dx);
    state.isPointerDown = true;
  }

  // 径向映射：手指距中心距离 → 护盾外扩
  if (dist < 0.08) {
    state.targetShieldRadius = null; // 默认位置
  } else {
    state.targetShieldRadius = dist; // 0~1 → shield.js 映射到 min~max
  }
}

// ====================================================================
// 键盘
// ====================================================================

function initKeyboardInput(state) {
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A':
        state.rotateLeft = true; break;
      case 'ArrowRight': case 'd': case 'D':
        state.rotateRight = true; break;
      case ' ':
        state.spacePressed = true; break;
    }
  });
  window.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A':
        state.rotateLeft = false; break;
      case 'ArrowRight': case 'd': case 'D':
        state.rotateRight = false; break;
      case ' ':
        state.spacePressed = false; break;
    }
  });
}

export function updateInput(state, dt) {
  const SPEED = 5;
  if (state.rotateLeft && !state.rotateRight) {
    state.rotationOffset -= SPEED * dt;
  } else if (state.rotateRight && !state.rotateLeft) {
    state.rotationOffset += SPEED * dt;
  } else {
    state.rotationOffset *= 0.9;
  }
}

export function getTargetAngle(state) {
  return state.targetShieldAngle || 0;
}
