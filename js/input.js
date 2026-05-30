/**
 * input.js — 统一输入处理（触屏/鼠标/键盘 + 移动端虚拟摇杆）
 *
 * 桌面端：鼠标在 Canvas 上移动直接控制护盾角度
 * 移动端：屏幕底部虚拟摇杆圈控制护盾角度 + 径向移动
 * 键盘：方向键旋转（全平台通用）
 */

import { normalizeAngle, angleDiff, lerpAngle, clamp } from './utils.js';
import { MOBILE_BREAKPOINT, SHIELD_SMOOTHING } from './config.js';

/**
 * 检测是否为移动设备
 */
function isMobileDevice() {
  return window.innerWidth < MOBILE_BREAKPOINT || 'ontouchstart' in window;
}

/**
 * 初始化输入系统
 */
export function initInput(state, canvas) {
  state.inputCanvas = canvas;

  // ---- 指针状态 ----
  state.rotationOffset = 0;
  state.isPointerDown = false;
  state.targetShieldAngle = 0;
  state.targetShieldRadius = null; // null = 使用默认轨道

  // ---- 虚拟摇杆状态 ----
  state.useJoystick = isMobileDevice();
  state.joystickActive = false;
  state.joystickX = 0;       // 手指在摇杆中的 X 偏移 (-1~1)
  state.joystickY = 0;       // 手指在摇杆中的 Y 偏移 (-1~1)
  state.joystickDist = 0;    // 手指距摇杆中心的归一化距离 (0~1)

  // ---- 键盘状态 ----
  state.rotateLeft = false;
  state.rotateRight = false;
  state.spacePressed = false;

  // ---- 摇杆位置（由 resize 计算） ----
  state.joyCX = 0;
  state.joyCY = 0;
  state.joyRadius = 0;

  if (state.useJoystick) {
    initJoystickInput(state, canvas);
  } else {
    initDesktopInput(state, canvas);
  }

  // 键盘事件（全平台通用）
  initKeyboardInput(state);
}

// ====================================================================
// 桌面端输入（原有逻辑）
// ====================================================================

function initDesktopInput(state, canvas) {
  const getPointerAngle = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - state.cx;
    const dy = y - state.cy;
    if (dx * dx + dy * dy < 4) return null;
    return Math.atan2(dy, dx);
  };

  canvas.addEventListener('pointerdown', (e) => {
    const angle = getPointerAngle(e);
    if (angle !== null) state.targetShieldAngle = angle;
    state.isPointerDown = true;
    state.targetShieldRadius = null; // 桌面端用默认轨道
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!state.isPointerDown) return;
    const angle = getPointerAngle(e);
    if (angle !== null) state.targetShieldAngle = angle;
  });

  canvas.addEventListener('pointerup', () => { state.isPointerDown = false; });
  canvas.addEventListener('pointerleave', () => { state.isPointerDown = false; });
}

// ====================================================================
// 移动端虚拟摇杆输入
// ====================================================================

function initJoystickInput(state, canvas) {
  const getJoystickPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 只在摇杆区域内响应
    const dx = x - state.joyCX;
    const dy = y - state.joyCY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 允许一定溢出（手指滑出摇杆圈后仍然跟踪，但 clamp 到圈内）
    return {
      dx: dx,
      dy: dy,
      dist: dist,
      inRange: dist <= state.joyRadius * 1.5, // 1.5倍半径内都响应
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    const pos = getJoystickPos(e);
    if (pos && pos.inRange) {
      state.joystickActive = true;
      updateJoystickState(state, pos);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!state.joystickActive) return;
    const pos = getJoystickPos(e);
    if (pos) {
      updateJoystickState(state, pos);
    }
  });

  canvas.addEventListener('pointerup', () => {
    state.joystickActive = false;
    state.joystickX = 0;
    state.joystickY = 0;
    state.joystickDist = 0;
    state.targetShieldRadius = null;
  });

  canvas.addEventListener('pointerleave', () => {
    state.joystickActive = false;
    state.joystickX = 0;
    state.joystickY = 0;
    state.joystickDist = 0;
    state.targetShieldRadius = null;
  });
}

/**
 * 更新摇杆状态 → 护盾角度 + 径向偏移
 *
 * 映射规则：
 * - 手指在摇杆中的角度 → 护盾角度（直接映射）
 * - 手指距摇杆中心的距离 → 护盾外扩程度
 *   dist=0（中心）→ 护盾在默认轨道
 *   dist=joyRadius（边缘）→ 护盾外扩到最大值
 */
function updateJoystickState(state, pos) {
  const clampedDist = clamp(pos.dist, 0, state.joyRadius);
  const normalizedDist = state.joyRadius > 0 ? clampedDist / state.joyRadius : 0;

  state.joystickX = (pos.dx / state.joyRadius) || 0;
  state.joystickY = (pos.dy / state.joyRadius) || 0;
  state.joystickDist = normalizedDist;

  // 角度：手指方向 → 护盾方向
  if (pos.dist > 2) {
    state.targetShieldAngle = Math.atan2(pos.dy, pos.dx);
  }

  // 径向：手指距中心距离 → 护盾轨道偏移
  // normalizedDist=0 → null(默认), normalizedDist>0 → 外扩
  if (normalizedDist < 0.05) {
    state.targetShieldRadius = null;
  } else {
    state.targetShieldRadius = normalizedDist; // 0~1，shield.js 中映射到实际范围
  }

  state.isPointerDown = true;
}

// ====================================================================
// 键盘输入
// ====================================================================

function initKeyboardInput(state) {
  const ROTATION_SPEED = 5;

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

// ====================================================================
// 每帧更新
// ====================================================================

export function updateInput(state, dt) {
  const ROTATION_SPEED = 5;

  const left = state.rotateLeft;
  const right = state.rotateRight;

  if (left && !right) {
    state.rotationOffset -= ROTATION_SPEED * dt;
  } else if (right && !left) {
    state.rotationOffset += ROTATION_SPEED * dt;
  } else {
    state.rotationOffset *= 0.9;
  }
}

export function getTargetAngle(state) {
  return state.targetShieldAngle || 0;
}
