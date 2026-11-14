# 官方来源与核验依据

核验日期：2026-11-14。以下均为开发者仓库的原始文件或用户指定解析器，已实际读取。日期和哈希只标识当时快照，不表示未来版本不变。未将第三方完整源码打包；只维护任务相关归纳及原创模板。

## 按任务读取

- 配置语法、规则动作、MITM、DNS、策略、cron：官方 sample.conf；先定位相关区段，不机械复制整份示例。
- 正文重写：rewrite.md 和 sample-rewrite-with-script.js；headers/path/status：对应 header 示例。
- 构造响应：sample-echo-response.js；二进制：sample-bytes-rewrite.js。
- 网络任务与参数：sample-task.js。旧示例头部版本可能早于新增字段，以字段旁说明为准。
- 原生远程重写：sample-import-rewrite.snippet；资源解析器环境：官方 resource-parser.js。
- 本机 HTTP 服务：sample-backend.js；一键导入与任务仓库：url-scheme.md、gallery.json。
- 「实测」条目（脚本本体下载不经过自身重写、解析器丢弃 task_local/http_backend、`^http` 去锚、`^(?:https)` 保留）来自单台设备与上表解析器快照，见 distribution.md、configuration.md；换版本时复核。
- 单文件提取：用户指定解析器源码中的 Type_Check、isQuanXRewrite、Rewrite_Filter；参数参考该源码开头注释及具体分支。

## 冲突与版本

使用官方当前 API/配置说明判断 QX 能力，使用用户实际解析器源码判断第三方转换行为，使用设备实际 build 和抓包判断运行环境。官方多个示例有差异时比较上下文、字段注释和版本，不任意混合。解析器可随 master 更新，CDN 缓存也可能不同于 GitHub 当前内容；生产问题优先拿到用户实际版本。未核实的参数不要写成事实。

本 Skill 中“最小作用域、异常放行、幂等、脱敏日志、最小差异、JSON 类型校验”等是工程实践建议，不冒充官方强制规则。运行器的模拟结果不是设备兼容性承诺。

## 已读取快照

| 来源 | SHA-256 |
|---|---|
| [official-README.md](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/README.md) | `6ccee818a62c8ffb5b2790afd864fe3f6afabc1679b74acecec4984272c23fa5` |
| [official-resource-parser.js](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/resource-parser.js) | `6b6dbdcdd77c7327e8a7d56e2ff8fd1177bd8b2eafb7c88b435dd61f2d2a4863` |
| [official-rewrite.md](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/rewrite.md) | `ac0c0684f850ee6d82bf3b065f79b9c8134935afe58682ee606d496528492f45` |
| [official-url-scheme.md](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/url-scheme.md) | `4590d2df7877a3a1517c9f4bf72e9455d2b9ac59691bb4da446f4f34d227dc43` |
| [official-gallery.json](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/gallery.json) | `3ed5f740c103498a2e9a24c2ea04de5ae6ffa17cc14813326a0f5c4d1ee6da81` |
| [official-sample-backend.js](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-backend.js) | `2ddc3a2053011c4a149dab0123c59e844dd87aba90300381af28f72cc6cb9338` |
| [official-sample-bytes-rewrite.js](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-bytes-rewrite.js) | `798909bf62568d6fcbea86020051554416c845cf53c3cc78f4ce86ed621ffe83` |
| [official-sample-echo-response.js](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-echo-response.js) | `ce072b76395d56ab051dc11ad57f0f3171726f9b35d30232bc312a09534cb031` |
| [official-sample-import-rewrite.snippet](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-import-rewrite.snippet) | `2bd238342baaa08def2845b9c978868492ec947450bc0f2df3e67214d60ec3d3` |
| [official-sample-rewrite-request-header.js](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-rewrite-request-header.js) | `990cfd4afcaf0799cf7a5bc3cc7a562964253d9b7107ae904d71a10e1278a4cc` |
| [official-sample-rewrite-response-header.js](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-rewrite-response-header.js) | `e0ae9dd75f2bbeaabda46bd9e9d38e2a1aec1721b42f3d6080a9e6ab6e65c303` |
| [official-sample-rewrite-with-script.js](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-rewrite-with-script.js) | `16361248a913d30632c8f69abe9fe3cbff1920ef3574494c23d9c2be0fd75e7a` |
| [official-sample-task.js](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample-task.js) | `75685f6fefdb4290c783a75c671c477f400325d0d47e7d9a19f3e0a96601bb87` |
| [resource-parser.js](https://fastly.jsdelivr.net/gh/KOP-XIAO/QuantumultX@master/Scripts/resource-parser.js) | `591852421bd935b4642a7af0f9a8c849fddf9ea7f4abd4326ea91d3f36e9acf2` |
| [sample.conf](https://raw.githubusercontent.com/crossutility/Quantumult-X/master/sample.conf) | `60acd8eac964c012e6278791dc9e22b5ae2c950b04c5ae350eed795ea7d1234b` |
