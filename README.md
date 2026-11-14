# Quantumult X 开发助手

面向 AI 编程助手的 Quantumult X 开发 Skill，涵盖脚本、重写与配置最佳实践，适配 KOP-XIAO 资源解析器，支持单文件顶部注释配置与本地验证。

仓库名：`quantumultx-dev-skill`；Skill 名称：`quantumultx-development`。

## 能做什么

- 根据请求与响应样本开发、修改和排查 QX JavaScript 重写脚本。
- 默认在 JS 顶部块注释中放置原生重写规则和 `hostname`，便于作为重写资源导入。
- 检查 MITM、分流、策略组、DNS、远程资源、定时任务与 HTTP Backend 配置。
- 交代脚本发布与更新：两次下载与缓存、版本参数、托管位置、一键导入链接与任务仓库；不用资源解析器时交付原生 snippet。
- 区分资源解析参数与脚本运行参数，避免混用 Surge/Loon API。
- 要求异常放行、精确匹配、最小改动与脱敏日志；修改现有代码时保留原格式。
- 提供响应改写与异步任务两个模板（共 21 个用例），以及语法/注释检查、用例运行、多 build 解析器比对、抓包转用例的本地工具。

## 安装与使用

将本仓库克隆或下载到所用 AI 编程助手支持的技能目录，目录名建议为 `quantumultx-development`。确保该目录下直接存在 `SKILL.md`，并保留 `references/`、`assets/` 和 `scripts/`。不同助手的目录与加载方式以其说明为准。

例如，先下载到当前目录：

```sh
git clone https://github.com/Mingtha/quantumultx-dev-skill.git quantumultx-development
```

支持 Skill 的助手可按名称调用；其他助手可以读取 `SKILL.md` 并按需加载相对路径引用。

示例请求：

> 使用 quantumultx-development，根据以下脱敏抓包编写 QX 响应重写脚本，将规则和 hostname 放到 JS 顶部注释，沿用 KOP-XIAO 解析器。

> 检查我的 Quantumult X 配置，只修复相关问题，保留其他配置和原有代码格式。

## 默认资源解析器

```ini
[general]
resource_parser_url = https://fastly.jsdelivr.net/gh/KOP-XIAO/QuantumultX@master/Scripts/resource-parser.js
```

导入包含顶部规则的 JS 时，将其添加到重写资源并开启资源解析（`opt-parser=true`）。顶部注释中的规则必须指向实际发布的脚本 URL。模板里的 example.com 仅为示例。

这种方式不会自动安装任意配置：解析器会丢弃顶部注释里的 `[task_local]`、`[http_backend]`，DNS、证书等也须在对应位置单独配置。详情见 [解析器说明](references/parser.md) 与 [发布说明](references/distribution.md)。

## 文件结构

| 路径 | 用途 |
|---|---|
| [SKILL.md](SKILL.md) | 触发描述、开发流程与核心约束 |
| [references/parser.md](references/parser.md) | 单文件导入与解析参数 |
| [references/runtime.md](references/runtime.md) | QX API、正文处理与异步控制 |
| [references/configuration.md](references/configuration.md) | 配置语法、匹配与排错 |
| [references/distribution.md](references/distribution.md) | 发布、缓存与版本、一键导入、任务仓库 |
| [references/validation.md](references/validation.md) | 本地检查、用例格式与真机验证步骤 |
| [references/sources.md](references/sources.md) | 官方资料、核验日期及快照哈希 |
| [assets/response-json.js](assets/response-json.js) | 单文件响应重写模板 |
| [assets/response-json.cases.json](assets/response-json.cases.json) | 响应模板用例 |
| [assets/task-fetch.js](assets/task-fetch.js) | 异步任务模板（$task.fetch、$prefs、$notify、超时） |
| [assets/task-fetch.cases.json](assets/task-fetch.cases.json) | 任务模板用例 |
| [scripts/qx-check.cjs](scripts/qx-check.cjs) | 本地检查工具：check / rewrite / parser / har |
| [evals/](evals/) | 改 skill 后回归用的真实请求与评分要点 |

## 本地检查

需要支持 `Object.hasOwn` 的 Node.js（16.9 或更新版本）。在仓库根目录运行：

```sh
node scripts/qx-check.cjs check   assets/response-json.js
node scripts/qx-check.cjs rewrite assets/response-json.js assets/response-json.cases.json
node scripts/qx-check.cjs rewrite assets/task-fetch.js assets/task-fetch.cases.json
```

从上面的指定地址获取并审阅解析器源码后，检查整个 JS 文件在 build 844 与 951 下的提取结果：

```sh
node scripts/qx-check.cjs parser /path/to/resource-parser.js assets/response-json.js https://example.com/scripts/items.js --expect expected.txt
```

解析器发出通知视为失败（它用通知报告被忽略的规则）；给 `--expect` 时逐行比对。有抓包时 `har` 模式可生成用例骨架，断言需人工填写，正文需人工脱敏。完整说明见 [validation.md](references/validation.md)。

运行器仅用于可信开发文件，Node `vm` 不是安全隔离；它不会模拟完整 QX 或网络。模板已通过本地用例，单文件结构已通过指定解析器提取检查，尚未进行 QX 真机验证。

## 参考与维护

主要依据 [Quantumult X 官方仓库](https://github.com/crossutility/Quantumult-X) 的配置、重写和任务示例，以及 [KOP-XIAO 资源解析器](https://github.com/KOP-XIAO/QuantumultX/blob/master/Scripts/resource-parser.js)。这是独立整理的开发 Skill，并非上述项目的官方产品。

资料核验日期为 2026-11-14。上游 master 与 CDN 内容会变化，遇到新 API、版本门槛或转换问题时应重新核实。完整来源和快照哈希见 [sources.md](references/sources.md)。仓库不包含第三方解析器完整源码。
