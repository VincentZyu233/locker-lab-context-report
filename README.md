<p align="center">
  <img src="docs/public/logo.png" width="120" height="120" alt="小肥鱼桌宠" style="border-radius: 20px; box-shadow: 0 6px 16px rgba(0,0,0,0.15);" />
</p>

<h1 align="center">LockerLab Context Governance Report</h1>

<p align="center">
  <b>《软件设计与体系结构》第 3 章实验报告：DeepSeek Harness 三层上下文工程与高效记忆管理</b>
</p>

<p align="center">
  <a href="https://vincentzyu233.github.io/locker-lab-context-report/"><img src="https://img.shields.io/badge/Online_Docs-GitHub_Pages-6366f1?style=flat-square&logo=githubpages&logoColor=white" alt="Online Docs"></a>
  <a href="https://github.com/VincentZyu233/locker-lab-context-report/actions"><img src="https://img.shields.io/github/actions/workflow/status/VincentZyu233/locker-lab-context-report/deploy.yml?branch=main&style=flat-square&logo=githubactions&logoColor=white&label=Deploy" alt="Build Status"></a>
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/Core_Runtime-DeepSeek_Harness-0284c7?style=flat-square" alt="DSH"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square" alt="License"></a>
</p>

---

## 🌐 在线报告与交互画廊

- 📖 **VitePress 在线文档站点**：[https://vincentzyu233.github.io/locker-lab-context-report/](https://vincentzyu233.github.io/locker-lab-context-report/)
- 📷 **实验证据高保真画廊**：[在线截图画廊 (25 张实测证据 + 小肥鱼彩蛋)](https://vincentzyu233.github.io/locker-lab-context-report/gallery)

---

## 🏗️ 交付结构与核心实验

| 实验层级 | 核心机制 | 实验验证内容 | 关键产出 |
|---|---|---|---|
| **1. 指令层 (Instruction)** | 字节预算截断与动态刷新 | 双态对照验证代号消歧，80KB 预算硬截断实测 | `AGENTS.md` / `order/AGENTS.md` |
| **2. 资产层 (Asset)** | 权威基线索引与按需沙箱 | 去掉基线全仓盲搜对比，`context-audit` 技能暗号按需读取 | `docs/adr/ADR-001.md` / `.dsh/skills/` |
| **3. 会话层 (Session)** | 流式日志有损压缩与沉淀 | 承受 1MB 文本轰炸与三个灵魂问题，架构决策回写资产层 | `docs/adr/ADR-002.md` (99行) |
| **4. 子代理 (Subagent)** | 绝密口令隔离与架构复核 | 父会话绝密口令物理零泄露，独立识别 `OrderController` 违规 | 独立上下文沙箱执行 |
| **5. 自动化门禁 (Quality Gate)** | CI/CD 架构阻断与自动化 | 触发 `layer-check` 生成 `gate.json`，运行门禁触发 Exit Code 1 | `reports/gate.json` / `check_gate.py` |
| **彩蛋扩展** | `dsh-whale-girl` 桌宠联动 | 监控交互状态、Token 消耗与情绪变化（唱歌、吃饭、摸摸头） | 4 张桌宠彩蛋截图 |

---

## 💻 本地运行指南

```bash
# 1. 克隆本仓库并进入根目录
git clone https://github.com/VincentZyu233/locker-lab-context-report.git
cd locker-lab-context-report

# 2. 安装项目依赖
npm install

# 3. 启动本地开发预览服务器
npm run docs:dev

# 4. 生产构建静态站点
npm run docs:build
```
