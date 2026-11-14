# QX JavaScript 运行时

## 选择执行阶段

| 需求 | 原生动作 | 关键输入/输出 |
|---|---|---|
| 修改请求头/路径 | script-request-header | `$request.headers/path`；`$done({headers, path})` |
| 修改请求正文 | script-request-body | `$request.body`；`$done({body})`，核实该阶段可用字段 |
| 修改响应头/状态 | script-response-header | `$response.headers/statusCode`；`$done({headers, status})` |
| 修改响应正文 | script-response-body | `$response.body`；`$done({body})` |
| 直接构造响应 | script-echo-response | `$done({status, headers, body})` |
| 等待请求体后构造响应 | script-analyze-echo-response | 官方配置说明其与 echo 的差别是等待请求体 |

普通重写无改动用 `$done({})`。任务正常结束通常用 `$done()`。合成响应返回完整、有意设计的响应，不套用普通放行模板。

`$response.statusCode` 是读入状态码；输出 `status` 按官方示例是 `"HTTP/1.1 200 OK"`。不要互换两者。header 阶段不要假设有 body；request 阶段不要直接访问不存在的 `$response`。

## 正文处理

- JSON：确认 body 是非空字符串、方法/状态符合目标；`JSON.parse` 后验证对象、数组及嵌套路径，再按证据修改。判断字段存在时不要用 truthy 吞掉 `false`、`0`、空字符串。保持字段类型和非目标字段。
- 遇到 HTML 错误页、JSON null、数组形状不符、缺字段、异常：普通 rewrite 原样放行，日志脱敏。
- 只有实际修改才重新序列化；没修改直接 `{}`，保留原始文本。不要用正则盲改嵌套 JSON。
- 原生正文重写在空 body 时不执行；模拟器的空 body 用例仅检查防御逻辑，不意味着设备会触发。
- response-body 可同时输出 body、headers、status，但只改 headers 应选 response-header。复制需要修改的 headers 后按不区分大小写的名称操作，避免出现重复大小写键；保留不相关头。
- 官方要求正文重写不要自行改长度、类型、编码字段；通常只返回 body，让 QX 处理长度/编码。合成新响应时才按新内容设置合适的 Content-Type。
- 二进制使用 `bodyBytes`（ArrayBuffer），不要对 protobuf、图片或压缩字节直接 JSON.parse。TypedArray 子视图输出应截取 `buffer.slice(byteOffset, byteOffset + byteLength)`，避免泄露多余字节；按官方 sample-bytes-rewrite.js 核对支持版本。

## 控制流与异步

用 IIFE/函数中的 `return $done(...)` 明确退出；不要在脚本顶层写 return。不要在 try/catch/finally 和定时器里无保护地重复完成。

任务或确需联网的脚本用 `$task.fetch` Promise，并处理成功、网络失败、解析失败与超时。只采用官方已证明存在的请求选项，不照搬浏览器 fetch/Node/Surge 参数。按目标 build 核对 `opts`，例如官方当前示例注明 `auto-cookie` 的行为存在版本差异。

需要手动截止时统一使用完成保护：
```js
let finished = false;
function finish(value) {
  if (finished) return;
  finished = true;
  $done(value);
}
```
超时不会自动取消网络请求；迟到回调必须在任何后续副作用前检查 finished，防止继续写存储或通知。不要每次重写都发额外网络请求，确需请求时避免递归命中自身规则。未核实取消 API 时不要捏造 AbortController 支持。

## 参数、存储和平台差异

- 当前官方 sample-task.js 说明 `$environment.variables` 从 v1.5.6 build 918 支持。对旧版/未知版本用受保护读取，必要时手动解析 `$environment.sourcePath` 的 hash；保留等号后的完整值，逐项 decode 并捕获非法编码。
- `$prefs.valueForKey(key)`；`$prefs.setValueForKey(value, key)`（值在前，键在后，字符串）；`removeValueForKey`。使用命名空间键，处理不存在/损坏数据，不调用 `removeAllValues` 清理其他脚本。
- `$notify` 仅用于用户需要的结果或错误，不在每次请求刷通知；`console.log` 不输出机密。
- 不假设 Node 的 require/fs/Buffer、浏览器 DOM/fetch 或第三方全局对象存在。需要依赖时确认 QX 可运行形式和许可。
- 资源解析器是另一种运行环境，官方说明不支持 HTTP 请求与持久存储 API；它接收 `$resource` 并用 `$done({content})` 等返回，不执行网络重写业务。
