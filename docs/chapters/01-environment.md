# 第 1 章：实验环境与运行基线


### 1.1 软硬件与运行环境
- **操作系统**：Windows 11 Pro 64-bit (PowerShell 7 / Windows Terminal)
- **Node.js 运行时**：v22.17.0 LTS
- **Python 环境**：Python 3.12 (通过 Astral `uv` 统一调度执行)
- **DeepSeek Harness**：
  - 核心源码：`deepseek-ai/deepseek-harness`（跟踪提交：`ce7073d512`）
  - 运行时形态：DSH Web Server 守护进程（运行于 `http://127.0.0.1:3080/`）
  - 模型服务端：`deepseek/deepseek-v4-flash-vision-exp`（经由 NewAPI 高可用网关代理）
  - 权限审批策略：`workspace-write` + `ask`
- **Cordis 插件与彩蛋扩展**：
  - 加载 `dsh-whale-girl`（v0.4.5）桌宠小肥鱼插件，实现交互状态与 Token 消耗情绪反馈联动（见资产 `00a-00d`）。

### 1.2 实验对象结构与三处预设埋点
实验工程 `locker-lab` 模拟了一个包含分层架构与领域规则的智能快递柜系统，其关键结构与预设埋点如下：

```text
locker-lab/
├── AGENTS.md                         # [埋点1] 指令层入口，定义项目代号 ORION-LOCKER 与权威基线索引
├── docs/
│   ├── adr/ADR-001.md                # 资产层：超时计费决策（1元/小时）
│   ├── mds/MOD-ORDER.md              # 资产层：订单模块职责说明
│   └── tlcd/C-MOD-ORDER.md           # 资产层：订单模块架构设计约束
├── src/main/java/com/locker/
│   ├── cell/                         # 格口子域
│   └── order/
│       └── OrderController.java      # [埋点2] 故意埋藏的2处跨层架构违规（直接依赖 Repository 与实现类）
├── .dsh/skills/
│   ├── context-audit/SKILL.md        # [埋点3] 技能按需加载标记 AUDIT-TOKEN-731
│   └── layer-check/SKILL.md          # 自动化门禁审查技能
└── tools/
    ├── make_big_docs.py              # 长文本压测生成器（25KB * 40 文件）
    ├── bloat_agents.py               # 指令层 80KB 预算截断测试器
    └── check_gate.py                 # CI/CD 自动化门禁判定脚本
```

---

