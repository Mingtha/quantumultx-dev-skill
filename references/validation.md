# 验证与运行器

## 本地工具

需要 Node.js。运行器执行本地代码，只用于已审阅、可信的开发文件；Node vm 不是安全隔离。运行器不联网、不模拟完整 QX，也不自动获取解析器。

```sh
node scripts/qx-check.cjs rewrite assets/response-json.js assets/response-json.cases.json
node scripts/qx-check.cjs parser /path/to/resource-parser.js assets/response-json.js https://example.com/scripts/items.js 951
```

rewrite 模式：按 JSON 用例注入 $request/$response，断言 `$done` 恰好一次、无非预期异常，比较解析后的 JSON 或原样放行；不提供网络/存储模拟。适合同步 JSON 重写。其他执行阶段及异步脚本另建任务专用 mock，不能假装该运行器已经验证。

parser 模式：执行完整解析器源码，注入 `$resource.type="rewrite"` 和指定 build，打印结果/通知并断言产生非空 content。本次解析器在模拟环境中可能多次调用 $done；运行器保留首次结果、报告次数并要求各次 content 一致，不据此猜测设备终止语义。自写重写仍严格要求只完成一次。还必须人工或通过断言检查规则数量、动作、脚本 URL 和 hostname；“非空”不等于正确。实际下载用户的解析器地址并记录 SHA-256，不把未来在线变化的第三方源码捆绑进 Skill。

## 用例最低要求

- 正常命中：目标字段变化，非目标字段/数组顺序保留。
- 非目标 URL、相似路径、不同域名和方法：不改。
- 缺字段、空 body、坏 JSON、JSON null、错误结构、错误响应状态：原样放行。
- 不需要修改：不重新序列化；如设计要求幂等，重复运行不累积副作用。
- 规则正则：真实 URL 命中，邻近但无关 URL 不命中。使用正则样本测试，不仅检查 JS 内部判断。
- 异步任务额外测：请求失败、超时、成功晚于超时、解析失败；所有分支只 done 一次，结束后无写存储/通知。
- 导入：对整个 JS 运行实际解析器，核对期望规则与 hostname；确认正文未混入资源结果。
- 导入筛选参数存在时：检查筛选后的主机名和规则仍配套，不引入未定义策略。

## 设备验证清单

明确让用户在 QX 刷新资源、查看生成的规则和 hostname、触发目标请求、核对日志与结果；需要时清理应用相关缓存。未实际操作设备时写“已通过本地模拟，待真机验证”。涉及证书、实际网络、QX JS 引擎和原生正则差异时，不将 Node 验证称为端到端通过。
