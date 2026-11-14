# 验证与运行器

## 本地工具 `scripts/qx-check.cjs`

需要 Node.js 16.9+。运行器执行本地代码，只用于已审阅、可信的开发文件；Node vm 不是安全隔离。它不联网、不模拟完整 QX，也不自动获取解析器。

```sh
node scripts/qx-check.cjs check   script.js                                   # 语法 + 顶部注释
node scripts/qx-check.cjs rewrite script.js cases.json                        # 运行用例
node scripts/qx-check.cjs parser  resource-parser.js script.js 资源URL [--builds 844,951] [--expect 期望行.txt]
node scripts/qx-check.cjs har     capture.har 'URL正则' > cases.json           # 抓包生成用例骨架
```

按顺序跑，前一步失败就先修：

1. **check**：JS 能否编译、文件是否以顶部块注释开头、注释是否被 `*/` 提前结束（解析器照样提取，QX 里脚本却不运行）、是否还指向 example 域名。`rewrite`、`parser` 会先自动做这一步。
2. **rewrite**：逐个用例注入环境，等待 `$done`（支持异步，默认 3 秒），断言恰好一次。
3. **parser**：默认在 build 844 和 951 下各运行一次用户的解析器。解析器发出 `$notify` 视为失败，它用通知报告被忽略或转换失败的规则；确有需要时加 `--allow-notify`。输出混入 JS 正文视为失败。给 `--expect` 时逐行比对（不计空行与首尾空白），缺少和多出的行都会列出；不给时只打印输出，需人工核对规则数量、动作、脚本 URL 和 hostname。
4. **har**：把抓包里 URL 匹配的条目转成用例骨架，删掉 Cookie、Authorization 和令牌类头，二进制正文跳过并提示。`expect` 一律是 `"TODO"`，运行器会拒绝，必须人工写成真实断言；正文和 URL 仍可能含个人数据，提交前脱敏，不要提交原始 HAR。

## 用例格式

```json
{
  "name": "正常修改且保留其他字段",
  "request":  {"url": "...", "method": "GET", "headers": {}},
  "response": {"statusCode": 200, "headers": {}, "body": "..."},
  "prefs":    {"已有键": "值"},
  "fetch":    [{"response": {"statusCode": 200, "headers": {}, "body": "..."}}, {"error": "offline"}],
  "environment": {"variables": {}},
  "timeout": 3000,
  "expect":   {"json": {}, "notify": 1, "fetch": 1, "prefs": {"键": "新值", "删掉的键": null}}
}
```

- 省略 `response` 即请求阶段、任务或 HTTP Backend（`$response` 不存在）；任务用例省略 `request`。
- `fetch` 按调用顺序依次作为 `$task.fetch` 的结果；用完再调用会被拒绝，提示用例没准备好。
- `expect` 可组合：`unchanged`（`$done({})`）、`json`（解析 body 后深比较）、`done`（整个返回值深比较，任务结束是 `null`）、`status`、`notify`（通知次数）、`fetch`（请求次数）、`prefs`（最终存储，`null` 表示不存在）。
- `$prefs.valueForKey` 对缺失键返回 `undefined`；真机返回值未逐版本核实，脚本应同时处理 `null`/`undefined`。

参考 `assets/response-json.cases.json`（同步响应改写）和 `assets/task-fetch.cases.json`（异步任务、存储、通知、失败分支）。

## 用例最低要求

- 正常命中：目标字段变化，非目标字段/数组顺序保留。
- 非目标 URL、相似路径、不同域名和方法：不改。
- 缺字段、空 body、坏 JSON、JSON null、错误结构、错误响应状态：原样放行。
- 不需要修改：不重新序列化；如设计要求幂等，重复运行不累积副作用。
- 规则正则：真实 URL 命中，邻近但无关 URL 不命中；也用解析器**输出后**的正则测一次（开头的 `^` 可能已被去掉）。
- 异步任务：请求失败、超时、成功晚于超时、解析失败；所有分支只 done 一次，结束后无写存储/通知。
- HTTP Backend：每个 path、坏参数、不支持的方法都有明确响应。
- 导入：对整个 JS 运行实际解析器并用 `--expect` 固定期望输出；确认正文未混入资源结果。
- 导入筛选参数存在时：检查筛选后的主机名和规则仍配套，不引入未定义策略。
- 项目里长期维护的脚本，把这些用例沉淀为测试文件，每次改动后重跑。

## 设备验证清单

明确让用户在 QX 刷新资源、查看生成的规则和 hostname、触发目标请求、核对日志与结果；需要时清理应用相关缓存。脚本更新后确认规则里的脚本 URL 已变化（见 [distribution.md](distribution.md)）。未实际操作设备时写「已通过本地模拟，待真机验证」。涉及证书、实际网络、QX JS 引擎和原生正则差异时，不将 Node 验证称为端到端通过。
