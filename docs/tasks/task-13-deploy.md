# 任务 13：GitHub Pages 部署

## 开发目标
创建 GitHub 仓库、推送代码、启用 GitHub Pages、验证线上 URL 并配置社交分享。

## 前置依赖
- 任务 12 测试通过

## 部署步骤

### Step 1: 创建 GitHub 仓库
```bash
cd neon-orbit-shield

# 初始化 git（如果还没做）
git init
git add -A
git commit -m "Neon Orbit Shield - 霓虹轨道护盾游戏 v1.0

功能：
- 轨道护盾防御玩法
- 4 种弹幕类型
- 3 个 Boss（环形炮台 / 双子卫星 / 虚空之眼）
- 5 种道具
- 连击评级系统 + 能量大招
- Classic / Challenge 双模式
- 成就系统 + 最高分持久化
- 桌面端 + 移动端完美适配

🤖 Generated with Claude Code"

git branch -M main
```

### Step 2: 创建远程仓库并推送
```bash
# 使用 gh CLI
gh repo create neon-orbit-shield --public --push --source=. --description "🛡️ 霓虹轨道护盾 — 赛博朋克风格轨道防御游戏"

# 或手动在 GitHub.com 创建后
# git remote add origin https://github.com/<username>/neon-orbit-shield.git
# git push -u origin main
```

### Step 3: 启用 GitHub Pages
1. 打开 `https://github.com/<username>/neon-orbit-shield/settings/pages`
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. 点击 **Save**
5. 等待 1-2 分钟部署

### Step 4: 验证线上 URL
1. 访问 `https://<username>.github.io/neon-orbit-shield/`
2. 在桌面端测试完整功能
3. 在手机端测试（扫码或直接访问）
4. 发送给朋友测试

### Step 5: 社交分享优化
- 更新 `index.html` 中 `og:url` 为实际 URL
- 确保 `og:image` 存在（可选截图）
- 测试在微信/Facebook/Twitter 分享时的预览卡片

### Step 6: 更新 README
- 添加线上演示链接
- 补充截图
- 添加操作说明

## 分享 URL
```
https://<username>.github.io/neon-orbit-shield/
```

## 验收标准
- [ ] GitHub 仓库创建成功
- [ ] 代码推送到 main 分支
- [ ] GitHub Pages 部署成功（无 404）
- [ ] 线上 URL 在桌面端可正常游戏
- [ ] 线上 URL 在手机端可正常游戏
- [ ] 朋友收到链接后可以即点即玩
- [ ] 社交分享预览正常

## 已知风险
- GitHub Pages 首次部署有 1-5 分钟延迟
- 缓存导致的旧版本问题：通过 URL 加参数 `?v=1` 或清除缓存
- 仓库名称决定 URL 路径：`neon-orbit-shield` → `/neon-orbit-shield/`
