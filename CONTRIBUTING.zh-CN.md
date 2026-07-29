# 参与 Vibe Roaster

感谢你帮助改进 Vibe Roaster。项目会读取本地 AI 编程会话，因此正确性和隐私是每项贡献的一部分。

英文规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开始之前

- 先搜索已有 Issue 和 Pull Request。
- 小型修复和文档改进可以直接提交 PR。
- 架构、新数据源、公开报告结构、评分模型、认证或隐私边界变更应先开 Issue。
- 不要提交真实会话、Prompt、凭证、Token 或可识别的本地路径；请构造最小合成样例。

## 开发环境

要求：

- Node.js 20 或更高版本；CI 当前验证 Node.js 20、22 和 24。
- npm
- 涉及 Cursor fixture 或本地存储时需要 `sqlite3`

安装与验证：

```bash
npm ci
npm test
npm ci --prefix dashboard
npm run build --prefix dashboard
```

修改跨模块行为前，请阅读 `.agents/AGENTS.md`、`.agents/docs/architecture.md`
以及相关 `.agents/spec/` 文件。

## 改动要求

每个 PR 只解决一个明确问题。不要把产品改动与大范围格式化、生成媒体、依赖更新或无关重构混在一起。

数据源 Adapter 改动必须：

- 使用合成 fixture 测试；
- 覆盖目录缺失场景；
- 保持 best-effort，不能让单个数据源导致整体检测崩溃；
- 只提取真实用户输入。

画像和评分改动必须：

- 覆盖空输入和数值边界；
- 验证分类、类型和素材路径；
- 画像模型变化时同步 `src/lib/agent-score.js` 与
  `assests/scripts/score-engine.js`。

前端改动必须：

- 通过生产构建；
- 可见布局变化需提供桌面和移动端截图；
- 保持中英文行为一致。

Server、Worker、OAuth 和发布改动必须说明信任边界、凭证处理、失败行为以及迁移或回滚要求。

## 隐私与安全

- 禁止提交 API Key、OAuth Secret、`.env.local`、`worker/.dev.vars`、
  owner session、本地 inspect 快照或真实私有历史。
- Fixture、文档、截图、Issue 和测试失败输出中都不能包含真实会话内容。
- TokenTracker 只用于活跃度；绝不能把 Prompt 数量标成 Token。
- 安全漏洞请按 [SECURITY.md](SECURITY.md) 私下报告。

## AI 辅助贡献

允许使用 AI，但作者必须对设计、代码、许可证、测试、隐私和 review 回复承担完整责任。

PR 中需要说明：

- 哪些工具实质参与；
- 哪些部分由 AI 生成或大幅改写；
- 人工如何验证结果。

不要为证明使用 AI 而粘贴私人 Prompt 或机密上下文。AI review 仅提供建议，不能代替维护者批准。

## Pull Request

PR 标题使用 Conventional Commit 风格：

```text
feat: add a source adapter
fix(prompt-analysis): preserve user intent around logs
docs: clarify local privacy boundaries
```

允许的类型为 `feat`、`fix`、`docs`、`test`、`refactor`、`perf`、`build`、
`ci`、`chore`、`revert` 和 `security`。

请完整填写 PR 模板、关联 Issue，并说明用户可见影响。鼓励先创建 Draft PR 获取自动反馈。
本地检查通过后再标记为 Ready for review。

维护者通常使用 squash merge，因此清晰的 PR 标题比整理每个中间 commit 更重要。
