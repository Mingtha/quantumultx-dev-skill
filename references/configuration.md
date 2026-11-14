# 配置与规则开发

## 先确定交付位置

- 主配置：保留已有区段并在正确位置增改；不要把一个局部需求展开成全量配置覆盖。
- `[rewrite_local]`：原生重写条目。`[rewrite_remote]`：远程资源引用；解析 JS 顶部注释时开启 opt-parser。
- `[filter_local]` / `[filter_remote]`：流量策略选择；不要把 HTTP 路径重写和域名分流混淆。
- `[policy]`：策略组定义。引用策略名必须存在，保留用户命名与路由意图；检查缺失节点/资源引用、循环依赖、空组和最终兜底。
- `[dns]`：按现有配置与官方当前说明修改。先确认系统 DNS、指定 DNS、DoH、IPv6 和分流需求；不要顺便全局禁用 IPv6、修改所有 DNS 或开启未经核实的选项。
- `[task_local]`：定时或事件任务。官方支持 5 或 6 字段 cron（6 字段首项是秒）；先核实目标设备时区和用户期望的时间。`event-network`（网络变化）、`event-interaction`（用户点 UIAction）也可代替 cron，事件任务只在隧道运行时触发。写进 JS 顶部注释时不能出现 `*/`，`*/10` 要写成 `0,10,20,30,40,50`。任务不会随重写资源导入，见 [distribution.md](distribution.md)。
- `[http_backend]`：本机 HTTP 服务，`脚本URL, tag=…, path=^/前缀/`，访问 `http://127.0.0.1:9999/前缀/…`，只在隧道运行时可用；写法见 [runtime.md](runtime.md)。
- `[mitm]`：仅配置必需域名与已有证书设置。添加 hostname 是合并，不是覆盖整个列表。

## 常见原生写法与容易混淆的行为

```ini
[filter_local]
host, api.example.com, direct
host-suffix, example.net, 已有策略名
final, proxy
```

这只是语法示例；不要原样插入或重置用户的 final。精确域名用 host；后缀范围用 host-suffix；不为方便默认改用 host-keyword。远程分流的 force-policy 会覆盖资源内策略，只有明确需要统一策略时才使用。

策略类型按意图选择：static 手动选，available 选首个可用，round-robin 轮换，dest-hash 按目标地址散列，url-latency-benchmark 按延迟选择，ssid 按网络环境选择。不同类型的参数不随意互搬；官方 sample.conf 的参数总述与个别示例可能不同，遇到差异需复核目标版本而不是推断全类型支持。

DNS 核验要点：默认会使用系统 DNS；使用 no-system 时至少配置可用 DNS。官方当前说明：配置常规 doh-server/doq-server 会忽略系统和非加密的普通服务器，按域名绑定的服务器另论；不要把加了 DoH 描述成只是多一个等价 DNS。no-ipv6 影响 AAAA 查询，不等于完全禁用设备 IPv6。dns_exclusion_list 影响占位 IP 映射，不能把它当成普通直连名单。

## 匹配正确性

从真实 URL 生成最窄规则：转义域名点号、明确 scheme、端口、路径末尾和 query 边界。避免 `example.com` 命中 `example.com.evil.test`，避免 `/v1/item` 意外匹配 `/v1/items-old`。查询参数顺序可变时不要靠完整 query 的固定顺序匹配；必要时在 JS 内判断。

**解析器会去掉开头 `^http` 里的 `^`**（KOP-XIAO 为去重而做，build 844/951 实测）：`^https://a\.com/x` 导入后变成 `https://a\.com/x`，从「开头匹配」变成「任意位置匹配」，URL 的 query 里出现这段文字也会命中。后果按规则用途分：

- 脚本改写：可能在别的站点上运行。脚本内再用锚定正则校验 `$request.url`（模板就是这样做的）。
- 注入凭据、改请求头、改写到别处的规则：会把凭据或改写带到任意站点，属于安全问题。规则写成 `^(?:https):\/\/a\.com\/`，解析器只认字面的 `^http`，这样 `^` 会保留（844/951 实测）。

本地原规则和解析器输出都要检查；不要通过字符串完全相等之外的猜测声称语义等价。Node 正则验证不能证明 QX 原生正则引擎完全一致。

选择 reject、reject-200、reject-dict、reject-array 时考虑客户端预期：官方 sample.conf 中 rewrite 的 reject 返回 404（重复请求可能有延迟），reject-200 返回 200 空正文，reject-dict/array 返回 200 的空 JSON 对象/数组，reject-img 返回 1px GIF；这些不是等价结果，也不能与分流 reject 的 DNS 行为混同。不要为了去掉一个字段就阻断整个接口。规则顺序、重叠规则、资源冲突和兜底行为按当前官方说明及设备实际命中验证，不凭其他客户端经验决定。

## MITM 条件

HTTPS 内容重写需要目标流量经过 QX、启用相应重写/MITM、命中 hostname，并有设备上安装且信任的证书。hostname 使用主机名，不带 scheme/path；通配符范围尽量小，不默认 `*`。无需内容解密的单纯分流不应新增 MITM。

不收集、不生成占位替代用户的 p12/passphrase。不要关闭 `skip_validating_cert` 所控制的验证来掩盖证书问题；保留安全默认值。证书固定、协议/连接路径或未经过隧道等问题可能导致看不到 HTTP 内容，不能声称单靠 hostname 一定解决。

## 配置排错顺序

1. 资源 URL 是否返回原始文本，是否 404/登录页面/CDN 缓存旧版；脚本 URL 是否随内容变化（见 [distribution.md](distribution.md)）。
2. 导入位置和 opt-parser 是否正确，解析器是否刷新，最终生成了哪些规则和 hostname。
3. 规则是否启用，URL/方法是否匹配，是否有重叠规则影响结果。
4. HTTPS 是否完成 MITM，活动记录是否能看到目标内容。
5. 脚本 URL 是否可获取，运行阶段、API、字段、正文格式是否符合。
6. 最后排查应用缓存、接口变化、设备 build；不先重置整份配置。
