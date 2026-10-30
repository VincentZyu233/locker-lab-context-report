# 第 4 章：故障排查与自愈分析


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

