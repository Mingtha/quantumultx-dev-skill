# KOP-XIAO 解析器与单文件发布

## 固定环境

用户在 `[general]` 使用：
```ini
resource_parser_url = https://fastly.jsdelivr.net/gh/KOP-XIAO/QuantumultX@master/Scripts/resource-parser.js
```
这只是选择解析器。导入重写资源时仍需启用资源解析（配置行 `opt-parser=true`）。不要覆盖用户已有 `[general]`。

## 默认单文件布局

```js
/*
名称：响应处理
说明：只处理指定接口；域名、URL 待替换。

[rewrite_local]
^https://api\.example\.com/v1/items(?:\?|$) url script-response-body https://example.com/scripts/items.js

[mitm]
hostname = api.example.com
*/
// JS 正文从此处开始。
```

规则指向这个 JS 自己的真实公开原始内容 URL。示例 URL 不能交付为已发布地址。
- `/*`、`*/` 单独成行。块内的区段、规则、`hostname` 行从行首开始，不添加 JSDoc 的 `* `，不写 `//`、`;` 或 `#` 前缀。说明与实际规则分开。
- **块内任何位置都不能出现 `*/`**：cron 的 `*/10`、正则的 `.*/` 会提前结束注释。解析器读的是文本，照样提取出规则；JS 引擎却遇到语法错误，脚本在 QX 里根本不运行。用 `qx-check check` 或 `node --check` 发现；正则改写为 `[^/]*\/` 或 `.*?\/`，cron 列出具体值。
- 同一个 HTTPS JS 链接可作为“重写资源”导入，解析器提取规则；规则触发时 QX 又将该链接作为 JS 执行，块注释被 JS 引擎忽略。
- 远程资源示意：
```ini
[rewrite_remote]
https://example.com/scripts/items.js, tag=响应处理, opt-parser=true, enabled=true
```
- 解析器不从任意 JS 自动推导规则。只有 JS 正文没有有效规则的文件不能直接作为重写资源使用。
- 解析器当前 `Type_Check` 识别 QX 规则，`isQuanXRewrite` 按行抽取，`Rewrite_Filter` 汇总 hostname；不是通用 JavaScript AST 注释解析器。避免在正文、说明、多行模板字符串中夹入额外可识别规则；检查最终提取结果，防止误收录。
- 原生远程 rewrite snippet 可直接放规则和 hostname；主配置才有各区段。顶部注释中的区段是供本解析器识别的组织方式，不能推断 QX 原生资源加载器也会自行提取 JS 注释。
- 原生 QX 格式优先。解析器能转换部分 Surge/Loon 配置，不能保证对应 JS API、参数、超时、二进制语义也兼容；逐条检查输出并迁移 JS。

## 注释能承载什么

| 内容 | 处理原则 |
|---|---|
| 原生 rewrite 规则和 hostname | 默认写入顶部块注释，并验证提取结果 |
| 名称、说明、版本、使用条件 | 给人阅读，不承诺自动变成 UI 元数据 |
| general、dns、policy、证书 | 不依靠导入该 JS 自动安装；作为独立主配置改动 |
| task_local、http_backend | 解析器会丢弃（实测 844/951），只供用户复制；单独给配置行或任务仓库，见 [distribution.md](distribution.md) |
| 混合分流规则（`host, x, reject` 等） | build 844 起解析器保留在重写资源里；用户希望单文件交付时可用，按实际解析器输出核对，旧 build 改用独立分流资源 |

## 两类 URL 参数必须区分

1. **导入资源 URL 的 hash**：`items.js#out=...&outhn=...` 由资源解析器使用，影响生成的规则与 hostname。
2. **规则右侧脚本 URL 的 hash**：`items.js#mode=compact` 由运行脚本读取，影响业务逻辑。

两者不自动传递。不要把资源 URL 的参数写完就假设运行脚本收到，也不要把任意业务参数当成解析器支持的参数。特殊字符按照该参数的语法编码；不要把整个 URL 统一 encode，也不要盲目把 `+` 当空格。

常用解析器参数（需要时再查源码）：`in/out` 筛选规则；`inhn/outhn` 筛选 hostname；`regex/regout` 可能同时影响规则和 hostname；`replace` 文本替换；`dst=rewrite/filter` 指定转换目标；`cdn=1` 改写部分 GitHub 链接。不要默认打开全套选项；`out` 与 `outhn` 是不同操作。

本次读取的解析器提示：混合分流涉及 build 844；jq 转换涉及 build 845；规则行说明 `{# ... #}` 的保留涉及 build 950；本地路径 hash 涉及 build 951。它们是解析器的版本分支，未来任务应按实际版本复核，不能作为所有设备的默认能力。

## 更新与发布

`@master` 与 CDN 都会变化，记录本次获取日期、SHA-256；出问题时对比用户实际缓存版本。修改脚本时让“导入资源 URL”和“内部脚本 URL”指向预期版本，防止只更新顶部注释而运行旧 JS；缓存与版本参数见 [distribution.md](distribution.md)。使用固定提交或版本仅在发布需求合适时提出；不要擅自替换用户指定的解析器地址。
