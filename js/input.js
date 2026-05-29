/**
 * input.js — 统一输入处理（触屏/鼠标/键盘）
 * 绑定 pointer events 到 canvas，绑定 key events 到 window
 */

import { normalizeAngle, angleDiff, lerpAngle } from './utils.js';

/**
 * 初始化输入系统
 * @param {Object} state  游戏全局状态
 * @param {HTMLCanvasElement} canvas  画布元素
 */
export function initInput(state, canvas) {
  // ---- 存储引用 ----
  state.inputCanvas = canvas;

  // ---- 初始化指针状态 ----
  state.rotationOffset = 0;
  state.isPointerDown = false;
  state.targetShieldAngle = 0;

  // ---- 初始化键盘状态 ----
  state.rotateLeft = false;
  state.rotateRight = false;
  state.spacePressed = false;

  // ========== 指针事件 ==========
  const getPointerAngle = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - state.cx;
    const dy = y - state.cy;

    // 指针非常接近中心时保持上一个角度不变
    if (dx * dx + dy * dy < 4) {
      return null;
    }
    return Math.atan2(dy, dx);
  };

  const onPointerDown = (e) => {
    const angle = getPointerAngle(e);
    if (angle !== null) {
      state.targetShieldAngle = angle;
    }
    state.isPointerDown = true;
  };

  const onPointerMove = (e) => {
    const angle = getPointerAngle(e);
    if (angle !== null) {
      state.targetShieldAngle = angle;
    }
    state.isPointerDown = true;
  };

  const onPointerUp = () => {
    state.isPointerDown = false;
    // 不归零 targetShieldAngle，保持最后位置
  };

  const onPointerLeave = () => {
    state.isPointerDown = false;
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  // ========== 键盘事件 ==========
  const ROTATION_SPEED = 5; // rad/s

  const onKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        state.rotateLeft = true;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        state.rotateRight = true;
        break;
      case ' ':
        state.spacePressed = true;
        break;
    }
  };

  const onKeyUp = (e) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        state.rotateLeft = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        state.rotateRight = false;
        break;
      case ' ':
        state.spacePressed = false;
        break;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

/**
 * 每帧更新输入状态（处理键盘旋转偏移）
 * @param {Object} state  游戏全局状态
 * @param {number}  dt    帧间隔（秒）
 */
export function updateInput(state, dt) {
  const ROTATION_SPEED = 5; // rad/s，与 initInput 中一致

  const left = state.rotateLeft;
  const right = state.rotateRight;

  if (left && !right) {
    state.rotationOffset -= ROTATION_SPEED * dt;
  } else if (right && !left) {
    state.rotationOffset += ROTATION_SPEED * dt;
  } else {
    // 两者都不按或同时按下 → 衰减
    state.rotationOffset *= 0.9;
  }
}

/**
 * 获取当前指针目标角度
 * @param {Object} state  游戏全局状态
 * @returns {number} 目标角度（弧度）
 */
export function getTargetAngle(state) {
  return state.targetShieldAngle || 0;
}
