# LockerLab Context Governance Report Site

《软件设计与体系结构》第3章实验报告：**高效记忆管理：DeepSeek Harness 的上下文工程**

🌐 **在线文档站点**：[https://VincentZyu233.github.io/locker-lab-context-report/](https://VincentZyu233.github.io/locker-lab-context-report/)

## 本地启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run docs:dev

# 3. 生产静态构建
npm run docs:build
```

## 交付结构
- 指令层（Instruction Layer）：`AGENTS.md` 规范注入与 64KB 预算截断
- 资产层（Asset Layer）：权威基线剪枝索引与按需技能
- 会话层（Session Layer）：1MB 文本轰炸与 ADR-002 回写闭环
- 子代理隔离（Subagent Sandbox）：绝密口令物理隔离与客观复核
- 自动化门禁（CI Gate）：`check_gate.py` 自动化拦截
- 彩蛋专栏：`dsh-whale-girl` 桌宠情绪与 Token 监控联动
