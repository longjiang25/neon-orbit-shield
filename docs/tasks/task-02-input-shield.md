# 任务 2：输入系统 + 护盾

## 开发目标
实现统一输入处理（Pointer Events + 键盘）和护盾渲染/逻辑。

## 前置依赖
- 任务 0（config.js, utils.js）
- 任务 1（renderer.js 的发光工具函数）

## 输入文件
- `js/input.js` — 待实现
- `js/shield.js` — 待实现

## 详细实现规格

### input.js

#### initInput(state, canvas)
- 绑定 `pointerdown`, `pointermove`, `pointerup`, `pointerleave` 到 Canvas
- 绑定 `keydown`, `keyup` 到 window
- `touch-action: none` 已在 CSS 中设置

#### 指针处理
- 获取 Canvas `getBoundingClientRect()`
- 计算指针相对于画布的坐标：`x = e.clientX - rect.left`, `y = e.clientY - rect.top`
- `targetShieldAngle = Math.atan2(y - state.cy, x - state.cx)`
- `state.isPointerDown = true` on pointerdown/pointermove

#### 键盘处理
- 方向键左/A：`rotationOffset -= ROTATION_SPEED * dt`
- 方向键右/D：`rotationOffset += ROTATION_SPEED * dt`
- 空格：开始游戏 / 释放大招
- `rotationOffset` 在无按键时衰减归零

#### 防误触
- 检查 `e.pointerType === 'touch'` 来判断是否为触屏
- 菜单/结束画面的按钮优先处理（pointer-events 已在 CSS 中控制）

### shield.js

#### updateShield(state, dt)
- `targetAngle = state.targetShieldAngle + (state.rotationOffset || 0)`
- `state.shieldAngle = lerpAngle(state.shieldAngle, targetAngle, SHIELD_SMOOTHING)`

#### renderShield(ctx, state)
- 画轨道虚线圆（淡色，低透明度）
- 画护盾弧线（`drawGlowArc`）
- 弧线两端各画一个小光点
- 如果有护盾扩大道具，弧长更宽

#### isWithinShield(angle, state)
- `diff = Math.abs(angleDiff(angle, state.shieldAngle))`
- `return diff <= state.shieldArc / 2`

## 接口定义
```js
// input.js
export function initInput(state, canvas)
export function updateInput(state, dt)

// shield.js
export function initShield(state)
export function updateShield(state, dt)
export function renderShield(ctx, state)
export function isWithinShield(angle, state)
```

## 验收标准
- [ ] 鼠标移动 → 护盾跟随鼠标方向旋转
- [ ] 触屏拖动 → 护盾跟随手指
- [ ] 键盘方向键 → 护盾持续旋转
- [ ] 护盾渲染有霓虹发光效果
- [ ] 轨道虚线圆可见
- [ ] 离开 Canvas → 不跳变

## 测试用例
1. 移动鼠标 → 护盾平滑跟随
2. 快速移动鼠标 → 护盾有惯性跟随（非瞬切）
3. 按住左箭头 → 护盾逆时针旋转
4. DevTools 移动模拟 → 触屏拖动正常
5. 鼠标移出画布 → 护盾停在原位

## 已知风险
- `Math.atan2` 在 dx=dy=0 时返回 0，需特殊处理
- iOS Safari 的 elastic scroll 可能干扰触屏 → CSS 已设 `overscroll-behavior: none`
