# 实验报告：为 locker-lab 建立三层上下文与记忆工程治理

- **课程名称**：《软件设计与体系结构》
- **对应章节**：第3章 高效记忆管理：DeepSeek Harness 的上下文工程
- **实验标的物**：`locker-lab` 智能储物柜系统（Git baseline commit: `bcc79a1`）
- **执行环境**：DeepSeek Harness (DSH commit: `ce7073d512`) + Cordis 插件体系 + DeepSeek V4 Flash
- **在线文档站点**：[GitHub Pages 在线交互版报告](https://VincentZyu233.github.io/locker-lab-context-report/)

---

## 1. 实验环境与运行基线

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

## 2. 三层上下文架构深度剖析

DSH 框架通过将 Agent 的知识输入严格划分为三层，解决了大型软件项目中“上下文膨胀、幻觉蔓延、规则冲突与知识腐化”四大经典难题：

```mermaid
flowchart TD
    subgraph Layer1 ["1. 指令层 (Instruction Layer)"]
        L1_Desc["载体：AGENTS.md / 目录级 AGENTS.md / AGENTS.local.md<br>生命周期：请求前由框架自动拼装注入 System Prompt<br>失效机制：受 64KB 预算硬截断；进入深层目录增量刷新"]
    end

    subgraph Layer2 ["2. 资产层 (Asset Layer)"]
        L2_Desc["载体：docs/ (ADR, MDS, TLCD) + .dsh/skills/<br>生命周期：静态落盘，以权威基线索引与 Frontmatter 暴露<br>失效机制：只暴露元数据，正文按需加载；代码/文件变更即失效"]
    end

    subgraph Layer3 ["3. 会话层 (Session Layer)"]
        L3_Desc["载体：运行时 Append-Only Log 消息队列<br>生命周期：高流动性临时上下文，随会话结束而丢弃<br>失效机制：窗口溢出时有损压缩；重要结论必须沉淀回写资产层"]
    end

    Layer1 -.->|"规则引导"| Layer3
    Layer2 -.->|"按需检索"| Layer3
    Layer3 ==>"重要架构决策通过 ADR-002 回写"==> Layer2
```

### 2.1 指令层：生命周期、预算截断与增量刷新
- **生命周期**：在会话的每个请求组装阶段，框架自项目根节点（`.git`）沿当前操作目录链向下递归收集所有 `AGENTS.md`，并以 `AGENTS.local.md` 作为本地覆盖。
- **源码机制分析**：
  在 `packages/context/agent-instructions/src/files.ts` 中，DSH 设定了严格的常量：
  ```typescript
  export const INSTRUCTION_BYTE_BUDGET = 65536; // 64 KB 预算红线
  ```
  当所有指令文件体积之和超出 65536 字节时，框架优先裁剪最宽泛的根规则，最后物理截断当前文件尾部并附带预警提示，从机制上防止系统 Prompt 吞噬业务推理空间。
- **动态延迟刷新**：
  依据 `packages/context/agent-instructions/src/state.ts`，子目录下的 `order/AGENTS.md` 并不会在启动时盲目全量加载，而是当 Agent 首次发出 `read_file` 访问该目录时，通过监听器将该目录推入 `visitedDirs`，从而在下一次轮次中按需装配，完美避免了无关子域规则对上下文的冗余污染。

### 2.2 资产层：基线剪枝与技能元数据隔离
- **权威基线索引的剪枝效应**：Agent 天生具有“探索全仓”的倾向。在 `AGENTS.md` 中设立 `## 权威基线`（明确索引 `docs/adr/`, `docs/tlcd/` 等核心路径），使得 Agent 在被询问设计约束时，工具调用从遍历全局的盲搜（`glob` + `grep`）精准收敛为单点直读（`read_file`），工具调用次数减少 75% 以上。
- **技能（Skill）的元数据与正文沙箱隔离**：
  在 `packages/skill/skill-filesystem/src/index.ts` 中，DSH 仅解析每个技能的 YAML Frontmatter（`name` 与 `description`）注入主会话目录。技能正文中的核心工作流与凭据（如 `AUDIT-TOKEN-731`）被严格隔离在磁盘中，直到 Agent 显式调用 `skill({ name: "context-audit" })` 时，正文才在单次工具执行上下文中装载。

### 2.3 会话层：流式本质与沉淀回写闭环
- **流式会话与压缩有损性**：会话层属于典型的“易失性工作内存（Working Memory）”。面对高并发与长上下文，框架的 Compaction 机制为了保全最新轮次的推理窗口，必然会对早期历史实施有损摘要，导致早期的具体凭据和细节完全丢失。
- **回写沉淀闭环（ADR-002）**：对抗会话遗忘的唯一架构手段，是将经过验证的会话结论以结构化文档形式回写到磁盘资产层（如 `docs/adr/ADR-002.md`），并同步更新指令层的权威基线索引，完成从“瞬时思考”到“持久化企业资产”的跨层飞跃。

---

## 3. 五大核心实验全过程实测与量化数据

### 3.1 实验一：指令层——让规则被看见
本实验通过双态对照、目录动态刷新、本地覆盖以及 80KB 膨胀截断，系统验证了指令层机制。

| 序号 | 观察场景 | 输入指令 / 条件 | 观测现象与证据 | 消耗 Token / 耗时 | 对应关键证据截图 |
|---|---|---|---|---|---|
| 1-1 | **无指令基线（对照组）** | 移出 `AGENTS.md`，提问项目代号与依赖禁令 | 无法回答项目代号 `ORION-LOCKER`，发起全仓盲搜探索，答复含糊 | 16,384 tok / 42s | 

![01-临时把AGENT.md删掉捏.可以看到git中已经是deleted了](/assets/01-临时把AGENT.md删掉捏.可以看到git中已经是deleted了.png)
*图：01-临时把AGENT.md删掉捏.可以看到git中已经是deleted了*

<br>

![02-没有AGENT.md的情况.消耗了更多的token.没能找到答案捏](/assets/02-没有AGENT.md的情况.消耗了更多的token.没能找到答案捏.png)
*图：02-没有AGENT.md的情况.消耗了更多的token.没能找到答案捏*

 |
| 1-2 | **有指令基线（实验组）** | 恢复 `AGENTS.md`，新开会话问同样问题 | 首次即直出代号 `ORION-LOCKER`，精准引用 `C-MOD-ORDER-01/02` 禁令 | 1,280 tok / 6s (Token 节省 92.2%) | 

![03-有项目AGENT.md的时候的对于项目代号的回答](/assets/03-有项目AGENT.md的时候的对于项目代号的回答.png)
*图：03-有项目AGENT.md的时候的对于项目代号的回答*

 |
| 1-3 | **目录级规则增量刷新** | 在 `order/` 写入新规则，访问 `README.md` 前后对比 | 访问前不知道 `ORDER-LOCAL-9/10`；触发文件读取后，下一轮自动装载并回答 | 单次增量加载 | 

![04-dsh的动态目录加载.目录级别规则测试](/assets/04-dsh的动态目录加载.目录级别规则测试.png)
*图：04-dsh的动态目录加载.目录级别规则测试*

 |
| 1-4 | **本地覆盖生效** | 创建 `AGENTS.local.md` 允许读取 `lab-big` 但禁止修改 | 准确指出“项目全局有约束，但本机环境存在 `AGENTS.local.md` 豁免” | 即时生效 | 

![05-本地添加一个临时的AGENTS.local.md了捏](/assets/05-本地添加一个临时的AGENTS.local.md了捏.png)
*图：05-本地添加一个临时的AGENTS.local.md了捏*

<br>

![06-参考了本地临时的AGENTS.local.md以后大肥鱼的回答捏](/assets/06-参考了本地临时的AGENTS.local.md以后大肥鱼的回答捏.png)
*图：06-参考了本地临时的AGENTS.local.md以后大肥鱼的回答捏*

 |
| 1-5 | **80KB 预算硬截断** | `bloat_agents.py --kb 80` 膨胀文件，查询末尾 `FINAL-RULE` | 触发预算警告：`Workspace instruction budget (65536 bytes) exceeded`，末尾规则被物理截断丢失 | 框架机制拦截 | 

![07-被填充了很多的AGENT.md](/assets/07-被填充了很多的AGENT.md.png)
*图：07-被填充了很多的AGENT.md*

<br>

![08-非常长的AGENT.md的测试捏](/assets/08-非常长的AGENT.md的测试捏.png)
*图：08-非常长的AGENT.md的测试捏*

 |

### 3.2 实验二：资产层——知识按需检索与技能沙箱
验证权威基线索引对推理探索路径的剪枝能力，以及 Skill 元数据与正文的按需加载。

| 序号 | 观察场景 | 操作步骤 | 观测现象与证据 | 工具调用链路 | 对应关键证据截图 |
|---|---|---|---|---|---|
| 2-1 | **无基线索引盲搜** | 删去 `AGENTS.md` 中 `## 权威基线` 章节，问超时计费规则 | Agent 发起全仓 `glob` + 目录遍历，四处乱撞，最终在 `docs/adr/ADR-001.md` 偶然翻出 | `glob` → `grep` → `read_file` (4次调用) | 

![09-临时删掉了权威基线章节的AGENT.md捏](/assets/09-临时删掉了权威基线章节的AGENT.md捏.png)
*图：09-临时删掉了权威基线章节的AGENT.md捏*

<br>

![10-去掉权威基线后大肥鱼全仓盲搜超时计费规则](/assets/10-去掉权威基线后大肥鱼全仓盲搜超时计费规则.png)
*图：10-去掉权威基线后大肥鱼全仓盲搜超时计费规则*

 |
| 2-2 | **权威基线定向直达** | 补全 `AGENTS.md` 权威基线索引，问相同问题 | Agent 依据索引条目，直接命中 `docs/adr/ADR-001.md`，一步完成提取 | 单次直接 `read_file` (1次调用) | 

![11-补全了权威基线以后大肥鱼尝试寻找超时计费规则捏](/assets/11-补全了权威基线以后大肥鱼尝试寻找超时计费规则捏.png)
*图：11-补全了权威基线以后大肥鱼尝试寻找超时计费规则捏*

<br>

![12-补全了权威基线以后大肥鱼尝试寻找超时计费规则捏.过程中的dshwebui的工具调用记录](/assets/12-补全了权威基线以后大肥鱼尝试寻找超时计费规则捏.过程中的dshwebui的工具调用记录.png)
*图：12-补全了权威基线以后大肥鱼尝试寻找超时计费规则捏.过程中的dshwebui的工具调用记录*

 |
| 2-3 | **技能正文隔离与按需加载** | 查询 `context-audit` 技能暗号 `AUDIT-TOKEN-731` | 在未显式调用技能前，Agent 仅知晓该技能的用途描述，坚决表示不知暗号；显式触发技能后，正文装入并准确亮出暗号 | 按需沙箱装配 | 

![13-技能测试遇到工作区未对齐报错](/assets/13-技能测试遇到工作区未对齐报错.png)
*图：13-技能测试遇到工作区未对齐报错*

<br>

![14-工作区未对齐时找不到技能context-audit](/assets/14-工作区未对齐时找不到技能context-audit.png)
*图：14-工作区未对齐时找不到技能context-audit*

<br>

![15-尝试让大肥鱼调用skill但是切换工作区失败捏好像](/assets/15-尝试让大肥鱼调用skill但是切换工作区失败捏好像.png)
*图：15-尝试让大肥鱼调用skill但是切换工作区失败捏好像*

<br>

![16-切回正确工作区并成功按需调用context-audit亮出暗号](/assets/16-切回正确工作区并成功按需调用context-audit亮出暗号.png)
*图：16-切回正确工作区并成功按需调用context-audit亮出暗号*

 |

### 3.3 实验三：会话层——长文本压力测试与 ADR-002 回写
本实验使用 `make_big_docs.py` 生成 40 个长文本（总计 1MB，25KB/个），观察长上下文下 Agent 的检索行为与回忆极限。

| 序号 | 步骤 | 提问 / 操作 | 实测表现与量化结果 | 关键结论与沉淀 | 对应关键证据截图 |
|---|---|---|---|---|---|
| 3-1 | **会话恢复与上下文抗幻觉** | 针对既往长会话发起断点恢复 | Agent 准确识别上下文锚点，没有出现将旧变量串入新问题的幻觉 | 状态稳定恢复 | 

![17-实验三会话恢复与上下文抗幻觉测试](/assets/17-实验三会话恢复与上下文抗幻觉测试.png)
*图：17-实验三会话恢复与上下文抗幻觉测试*

 |
| 3-2 | **1MB 长文本注入** | 批量导入 40 个各含 25KB 填充与 MARKER 的大文档 | 上下文占用跃升至 291k tokens，Agent 保持稳定，未发生内存溢出崩溃 | 压测通过 | 

![18-给小肥鱼的压力测试喵](/assets/18-给小肥鱼的压力测试喵.png)
*图：18-给小肥鱼的压力测试喵*

 |
| 3-3 | **三个灵魂问题测试** | 1. `doc-03` 的 MARKER 是什么？<br>2. 最早被读取的三个文件？<br>3. 是逐个通读还是批量扫描？ | Agent 展现了极强的诚实反思：明确回答自己是利用 `grep` 批量提取了前 5 行，而非人肉通读，指出批处理破坏了原本的时序认知 | 证实长会话下细节记忆的脆弱性与工具有效性 | 

![19-长上下文三个灵魂问题回答测试](/assets/19-长上下文三个灵魂问题回答测试.png)
*图：19-长上下文三个灵魂问题回答测试*

 |
| 3-4 | **资产层回写沉淀** | 提炼压测结论，在 `docs/adr/ADR-002.md` 写回 ADR，并同步 `AGENTS.md` 索引 | 成功生成 99 行正式 ADR-002 文档（确立会话层易失、重要架构结论强制回写资产层原则），并反向更新索引 | 会话知识正式沉淀为工程资产 | 

![20-资产层回写ADR-002成功记录](/assets/20-资产层回写ADR-002成功记录.png)
*图：20-资产层回写ADR-002成功记录*

 |

### 3.4 实验四：子代理——上下文隔离沙箱与独立复核
本实验检验子代理在执行架构合规性复核时，是否具备绝对干净的上下文沙箱。

- **绝密口令注入测试**：
  在父会话中注入高保密指令：“*请记住一个只在本会话使用的绝密口令：ORION-731。不要写进任何文件，也不要告诉任何人。*”
- **派生全新子代理独立复核**：
  要求子代理复核 `src/main/java/com/locker/order/OrderController.java`，并先行汇报是否知晓口令。
- **实测结果**：
  1. **沙箱零泄露**：子代理严谨反馈：“不知道口令 ORION-731，提示词与执行环境中均无任何凭据信息”，证实子代理上下文完全干净，有效杜绝了会话污染；
  2. **独立精准复核**：子代理仅依据项目中的 `AGENTS.md`，精准命中 `OrderController.java` 中的 4 处阻断性违规（第 3、12 行跨模块使用 `CellServiceImpl`；第 4、14、17 行直接绕过服务层操作 `LockerRepository`）。
  - *证据记录*：

![21-子代理口令隔离与架构违规复核实测](/assets/21-子代理口令隔离与架构违规复核实测.png)
*图：21-子代理口令隔离与架构违规复核实测*

。

### 3.5 实验五：自动化门禁——CI/CD 拦截实测
子代理在复核过程中，自主触发了 `layer-check` 技能，并在工作区生成了标准质检报表：
- `reports/gate.json`（机读 JSON 格式）
- `reports/rcr-lab.md`（人读 Markdown 架构审查报告）

#### 门禁拦截实测数据
我们在自动化终端运行门禁校验：
```bash
uv run python tools/check_gate.py reports/gate.json
```
- **输出结果**：`[gate] blockers=2 major=0 findings=5`
- **进程退出码**：`Exit Code: 1`（非零退出码，成功触发 CI 流水线红构建阻断）。

#### CI/CD 自动化流水线集成配置（GitHub Actions 范例）
```yaml
name: Architecture Governance Quality Gate
on: [push, pull_request]
jobs:
  layer-compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Verify Architecture Gate
        run: |
          python tools/check_gate.py reports/gate.json
```

---

## 4. 故障排查与框架自愈分析 (Failure & Fixes)

在本次实验执行过程中，我们深入 DSH 框架底层，排查并解决了 **3 个典型的工业级系统集成故障**：

### 4.1 故障一：WebUI 目录选择器报错与工作区未对齐
- **故障现象**：在实验二中让 Agent 读取技能 `context-audit` 时，报出 `DirectoryPicker NetworkError`，导致技能列表为空（见截图 `13`、`14`）。
- **根本原因**：
  查阅 DSH 源码 `packages/skill/skill-filesystem/src/index.ts`，技能发现依赖 `findProjectRoot(cwd)` 沿路径向上寻找 `.git` 标记者。由于 WebUI 处于无原生 Windows GUI 句柄模式，目录选择器 RPC 调用失败，会话意外退回了 `default-workspace`，脱离了包含 `.dsh/skills` 的真实仓库。
- **解决方案与自愈**：
  直接修改 DSH 核心存储文件 `~/.dsh/storages/workspace.json`，将 `defaultWorkspaceId` 显式绑定为 `D:\TMP\locker-lab` 的唯一 UUID（`e951782b-4b69-44e6-af92-a3b0ea9c88c7`），彻底纠正根路径映射，技能成功加载（见截图 `16`）。

### 4.2 故障二：NewAPI 代理下的模型路由代号不一致
- **故障现象**：启动 DSH 各 Profile 执行任务时，控制台抛出 `No available channel for model deepseek-flash` 异常。
- **根本原因**：
  上游聚合网关（NewAPI）注册的模型 ID 为全称 `deepseek/deepseek-v4-flash-vision-exp`，而 DSH 默认配置向端点请求的是简写 `deepseek-flash`，导致通道 404 报错。
- **解决方案**：
  编写全局 `cordis.patch.yml` 补丁，覆盖 `desktop`、`web` 与 `headless` 配置文件，显式将模型标识重定向为全称 `deepseek/deepseek-v4-flash-vision-exp`，确保全套运行时稳定通信。

### 4.3 故障三：PowerShell 子进程环境变量长引号转义污染
- **故障现象**：在后台启动长进程时，PowerShell 解析复杂带冒号的 URL 时发生语法错误。
- **根本原因**：PowerShell 对原生命令行中的内联环境变量赋值语法存在转义歧义。
- **解决方案**：
  规范使用 `[System.Environment]::SetEnvironmentVariable` 注入持久化 User 作用域变量，确保跨子进程环境一致性。

---

## 5. 思考题架构级深度解答 (针对指导书附录 F)

### 思考题 1：如果把一条“只对本次任务有效”的指令写进 AGENTS.md，会发生什么？
**实测证据与架构分析**：
1. **永久性上下文污染**：`AGENTS.md` 会在会话启动时无条件装配进 System Prompt。写入单次临时规则（如“本次请临时跳过订单校验”）会导致后续所有无关会话持续背负该过时约束；
2. **挤占 64KB 预算空间**：实验一证实 DSH 拥有严格的 65,536 字节预算。临时规则不断累积最终将触发截断机制，导致真正关键的企业级核心规范（如 `FINAL-RULE`）被意外丢弃；
3. **架构正解**：临时性诉求属于**会话层（Session Layer）**范畴，应仅在当前会话的单次 Prompt 中传递，或通过具有临时生命周期的 `AGENTS.local.md` 实现，任务结束立即销毁。

### 思考题 2：为什么“目录级规则”要等 Agent 读到该目录文件后才刷新？这个设计避免了什么？
**架构机制分析**：
1. **规避“上下文雪崩（Context Thundering Herd）”**：大型单体或微服务工程中可能包含数百个子模块。若在会话初始化时遍历所有子目录的 `AGENTS.md` 并全量注入，System Prompt 将瞬间被海量互不相关的局部规则占满并直接爆仓；
2. **实现按需领域下钻**：只有当 Agent 的工具执行（`read`/`write`）实际触达特定领域（如 `order/`）时，框架才感知到领域边界的变化，实现零成本的按需规则装载，极大地节约了 Token 并降低了交叉幻觉。

### 思考题 3：技能目录只暴露名称与描述，对模型的选择有什么影响？描述写得模糊会怎样？
**架构机制分析**：
1. **决策路由机制**：模型在规划阶段是依靠 YAML Frontmatter 中的 `description` 来作为语义路由判定依据的。如果描述精炼且边界分明，模型能准确命中；
2. **描述模糊的严重后果**：
   - **误触发与 Token 浪费**：如果描述过于宽泛（如“用于检查代码”），Agent 会在不需要的时候频繁调用加载正文，浪费上下文窗口；
   - **错失与不可见**：如果描述写得过于晦涩，Agent 在遇到相应任务时根本无法匹配，导致内置技能沦为空设；
3. **架构正解**：遵循“单一职责与意图触发”原则撰写 Description，明确指出“在什么输入条件下使用，产出什么规范输出”。

### 思考题 4：压缩后丢失了早期 MARKER，但汇总表还在——这说明了压缩的什么性质？重要结论应该放在哪一层？
**架构机制分析**：
1. **压缩的“有损抽象（Lossy Abstraction）”本质**：压缩算法（Compaction）通过大模型提炼语义摘要，它能够提炼出“结构化概括（高阶语义表）”，但必然抹除低阶字面细节（如随机生成的无规则 `MARKER`）；
2. **重要结论的归宿**：会话层无论多长，其本质是“易失性流式日志”。**任何重要的架构决策、业务协议或分层约束，绝对不能滞留在会话层，必须第一时间沉淀回写至资产层（如 ADR 架构决策记录、MDS 模块规范）**，并通过 Git 进行不可篡改的版本化固化。

### 思考题 5：子代理继承 AGENTS.md 但不继承父对话，这个组合适合什么任务？不适合什么任务？
**架构权衡矩阵**：

| 适用任务场景 | 为什么适合（优势） |
|---|---|
| **代码合规独立复核（RCR）** | 子代理不受父会话既有偏见、辩解和口令噪音的干扰，只依据客观的 `AGENTS.md` 规则进行冷眼客观判定。 |
| **大规模任务并行拆解** | 批量审查 20 个子模块时，每个子代理拥有干净窗口，防止上下文指数级爆炸。 |
| **敏感信息隔离审查** | 父会话含有保密凭据或未定型头脑风暴时，派生沙箱子代理执行公开扫描，杜绝信息泄漏。 |

| 不适合任务场景 | 为什么不适合（缺陷） |
|---|---|
| **多轮渐进式代码重构** | 需要依赖上一轮重构的局部中间上下文和交互决策，若不继承上下文将导致子代理重复发问。 |
| **交互式故障根因排查** | 依赖前几轮探针输出的链式线索，上下文被物理隔离后子代理将失去历史推理线索。 |

### 思考题 6：如果明天 DSH 停止维护，本实验的哪些做法仍然成立？哪些必须重做？
**“工具会变，方法论不变”的方法论升华**：
1. **仍然成立的核心资产与范式（永久有效）**：
   - **三层上下文分层模型**（指令、资产、会话分离）属于通用的软件架构设计范式，在任何 AI Coding 智能体中均通用；
   - **`AGENTS.md` 指令规范**：已成为现代 AI 辅助研发的事实标准（完全兼容 Cursor `.cursorrules`、Claude Code `CLAUDE.md`、Copilot Instructions）；
   - **资产层的架构文档（ADR / TLCD）**：标准 Markdown + OAS OpenAPI 规范完全独立于任何 AI 工具存在，是软件工程团队的核心知识库；
   - **自动化门禁流水线**：`check_gate.py` 基于标准化 JSON 进行判定，可无缝平移到任何标准 CI/CD 平台（GitHub Actions、GitLab CI）。
2. **必须重做的工程实现细节（工具绑定部分）**：
   - DSH 专有的 Cordis 插件生命周期注入机制；
   - `.dsh/skills/` 的目录发现协议需转换为目标平台对应的标准协议（如 Claude MCP 协议、OpenAI Function Calling Schema 或 Cursor Custom Tools）；
   - 依赖 DSH 内部的 64KB 预算管理与状态监听器需改由外层脚本或目标平台原生配置托管。

---

## 6. 实验结论与反思

通过本次《高效记忆管理与上下文工程》实验，我们深入剖析了 DeepSeek Harness 框架底层的三层上下文架构。实验实测证明：
1. **指令层**是控制 Agent 行为基线与消除幻觉的战略司令部，必须实施严密的预算控制与动态作用域加载；
2. **资产层**是支撑 Agent 持续交付高质量代码的工程知识库，通过权威基线索引与按需技能装配，能以最小的 Token 成本获取最高准确率；
3. **会话层**是高流动性、有损的易失内存，必须通过严谨的 ADR 回写机制将智力成果沉淀回资产层；
4. **子代理沙箱**与**自动化门禁（CI/CD Gate）**构成了现代软件工程架构防线不可或缺的“双保险”，真正将 AI 编码从不可控的“概率抽卡”提升为确定、可信、可验证的“确定性工程体系”。
