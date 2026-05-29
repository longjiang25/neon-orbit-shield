# 任务 12：浏览器测试

## 开发目标
使用 Playwright MCP 自动化测试 + 手动测试核对 21 项测试清单，确保桌面端和移动端均正常。

## 前置依赖
- 任务 11 完成（游戏完整可玩）

## 测试清单（21 项）

| # | 测试项 | 方法 | 预期结果 |
|---|--------|------|---------|
| 1 | 页面加载无 JS 错误 | Playwright + 控制台 | 0 errors |
| 2 | Canvas 自适应窗口 | Playwright resize | Canvas 尺寸跟随 |
| 3 | 护盾跟随鼠标 | Playwright 鼠标移动 | 护盾角度跟随 |
| 4 | 护盾跟随触屏 | Playwright touch | 护盾角度跟随 |
| 5 | 键盘方向键旋转 | Playwright keydown | 护盾旋转 |
| 6 | 弹幕正常生成 | Playwright 等待 | 弹幕从边缘飞入 |
| 7 | 护盾正确阻挡 | Playwright 定位护盾 | 弹幕消失 + 粒子 |
| 8 | 漏弹扣血 | 观察 | 血量减少 |
| 9 | 粒子特效显示 | 观察 | 视觉确认 |
| 10 | 分数 + 连击正确 | 观察 HUD | 数字递增 |
| 11 | 能量积累 + 大招 | Playwright 空格 | 能量满后释放 |
| 12 | Boss 完整流程 | 等待第 5 波 | 出现→攻击→击败 |
| 13 | 道具收集生效 | 等待道具 | 效果生效 |
| 14 | 难度递增 | 长时间运行 | 弹幕变快变密 |
| 15 | 菜单→游戏→结束→重来 | Playwright 全流程 | 状态流转正常 |
| 16 | 最高分持久化 | 刷新后检查 | 最高分保留 |
| 17 | 音效播放 | 手动听 | 有声音 |
| 18 | 移动端触屏完整 | Playwright 移动模拟 | 可玩 |
| 19 | 横竖屏切换 | Playwright rotate | 自适应 |
| 20 | 切后台暂停 | 切换标签页 | 游戏暂停 |
| 21 | 无内存泄漏 | 长时间运行 | 帧率不下降 |

## Playwright 测试脚本设计

```js
// 测试 1: 页面加载
await page.goto('http://localhost:3000');
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg); });
// 检查 errors.length === 0

// 测试 3: 护盾跟随鼠标
await page.mouse.move(400, 300);
// 检查护盾角度变化

// 测试 5: 键盘控制
await page.keyboard.down('ArrowRight');
// 检查护盾旋转

// 测试 15: 完整流程
await page.click('canvas'); // 开始
await page.waitForTimeout(30000); // 玩 30 秒
// 检查分数变化
// 等待游戏结束
// 检查 gameover-screen 可见
// 点击重新开始
// 检查状态重置
```

## 验收标准
- [ ] 所有 21 项测试通过（或标注已知限制）
- [ ] Playwright 自动化脚本运行完毕无致命错误
- [ ] 手动测试补充 Playwright 覆盖不到的视觉/音频验证

## 测试报告
- 测试结果填入 `docs/test-report.md`
- 每个失败项标注原因和修复状态
