# Quantumult X 开发助手

面向 AI 编程助手的 Quantumult X 开发 Skill，涵盖脚本、重写与配置最佳实践，适配 KOP-XIAO 资源解析器，支持单文件顶部注释配置与本地验证。

仓库名：`quantumultx-dev-skill`；Skill 名称：`quantumultx-development`。

## 能做什么

- 根据请求与响应样本开发、修改和排查 QX JavaScript 重写脚本。
- 默认在 JS 顶部块注释中放置原生重写规则和 `hostname`，便于作为重写资源导入。
- 检查 MITM、分流、策略组、DNS、远程资源与定时任务配置。
- 区分资源解析参数与脚本运行参数，避免混用 Surge/Loon API。
- 要求异常放行、精确匹配、最小改动与脱敏日志；修改现有代码时保留原格式。
- 提供 JSON 响应模板、14 个测试用例和解析器本地检查工具。

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

这种方式不会自动安装任意配置：DNS、证书和定时任务等仍须在对应位置单独配置。详情见 [解析器说明](references/parser.md)。

## 文件结构

| 路径 | 用途 |
|---|---|
| [SKILL.md](SKILL.md) | 触发描述、开发流程与核心约束 |
| [references/parser.md](references/parser.md) | 单文件导入与解析参数 |
| [references/runtime.md](references/runtime.md) | QX API、正文处理与异步控制 |
| [references/configuration.md](references/configuration.md) | 配置语法、匹配与排错 |
| [references/validation.md](references/validation.md) | 本地检查与真机验证步骤 |
| [references/sources.md](references/sources.md) | 官方资料、核验日期及快照哈希 |
| [assets/response-json.js](assets/response-json.js) | 单文件响应重写模板 |
| [assets/response-json.cases.json](assets/response-json.cases.json) | 模板测试用例 |
| [scripts/qx-check.cjs](scripts/qx-check.cjs) | 本地同步重写与解析器运行器 |

## 本地检查

需要支持 `Object.hasOwn` 的 Node.js（16.9 或更新版本）。在仓库根目录运行：

```sh
node scripts/qx-check.cjs rewrite assets/response-json.js assets/response-json.cases.json
```

从上面的指定地址获取并审阅解析器源码后，可检查整个 JS 文件是否正确提取规则：

```sh
node scripts/qx-check.cjs parser /path/to/resource-parser.js assets/response-json.js https://example.com/scripts/items.js 951
```

最后一个参数是模拟的 QX build，应按目标设备选择。运行器输出仍需核对规则数量、动作、脚本 URL 和 hostname；非空输出不代表完全正确。

运行器仅用于可信开发文件，Node `vm` 不是安全隔离；它不会模拟完整 QX、网络或异步任务。模板已通过 14 个本地用例，单文件结构已通过指定解析器提取检查，尚未进行 QX 真机验证。

## 参考与维护

主要依据 [Quantumult X 官方仓库](https://github.com/crossutility/Quantumult-X) 的配置、重写和任务示例，以及 [KOP-XIAO 资源解析器](https://github.com/KOP-XIAO/QuantumultX/blob/master/Scripts/resource-parser.js)。这是独立整理的开发 Skill，并非上述项目的官方产品。

资料核验日期为 2026-11-14。上游 master 与 CDN 内容会变化，遇到新 API、版本门槛或转换问题时应重新核实。完整来源和快照哈希见 [sources.md](references/sources.md)。仓库不包含第三方解析器完整源码。
