# 发布、更新与导入

脚本写对之后，用户手机上能否拿到、能否更新，取决于本文件这几件事。标「实测」的条目来自单台设备观察（QX 1.8.1，iOS，2026-11-14），换版本时重新确认；其余来自官方文档。

## 一次「更新资源」是两次下载

1. **资源本身**：`[rewrite_remote]` 的 URL。内容交给资源解析器，产出规则和 hostname，原文随后丢弃。
2. **脚本本体**：规则右侧的脚本 URL。QX 以 **URL 为键**缓存，规则命中时执行缓存里的版本。

所以：
- 两者内容是同一个文件也要分别下载成功；第 1 次成功不代表第 2 次成功。
- 改了脚本，规则里的脚本 URL 不变，QX 可能继续执行旧缓存。发布时让 URL 随内容变化（如 `items.js?v=<版本或内容哈希>`），顶部注释与资源一起更新；不要只改正文。
- 手写在主配置里的 `[task_local]`、`[http_backend]` 条目不随资源更新，URL 带版本时要让用户同步改配置行。
- 托管在 CDN 后面时确认脚本不被边缘缓存住旧版或跨用户共享（如 `Cache-Control: no-store`）；jsDelivr 等公共 CDN 有自身缓存周期。

## 自建脚本服务与鉴权（实测）

- 更新资源（第 1 次下载）会经过 QX 自身的重写与 MITM：用 `request-header` 规则给自家域名加请求头可行。
- **按规则下载脚本本体（第 2 次）不经过 QX 自身重写**，带不上这类请求头。需要鉴权时把凭据或签名放进脚本 URL 本身（例如服务器只给已鉴权的资源响应签发带令牌的 `?v=`），不要假设请求头注入覆盖所有下载。
- 注入凭据的规则必须锚定开头，见 [configuration.md](configuration.md)「匹配正确性」：解析器会去掉 `^http` 的 `^`。

## 解析器能带进 QX 的只有规则

KOP-XIAO 解析器处理重写资源时输出 rewrite、hostname，以及 build 844 起的混合分流。顶部注释里的 `[task_local]`、`[http_backend]` 会被丢弃（实测 build 844/951，解析器 SHA `5918524…`）。在注释里写它们只是方便用户复制；交付时单独给出配置行，或用下面的任务仓库。

## 一键导入（官方 URL scheme）

```text
quantumult-x:///add-resource?remote-resource=<url-encoded JSON>        # build 670+，保留已有资源
https://quantumult.app/x/open-app/add-resource?remote-resource=<同上>   # Universal Link，需系统已激活
```

JSON 的键是 `server_remote`、`filter_remote`、`rewrite_remote`，值是配置行字符串数组：

```js
const link = "quantumult-x:///add-resource?remote-resource=" + encodeURIComponent(JSON.stringify({
  rewrite_remote: ["https://example.com/scripts/items.js, tag=响应处理, opt-parser=true, enabled=true"],
}));
```

- `update-configuration` 会**替换全部资源**，不要拿它当添加用。
- 整段 JSON 用 `encodeURIComponent`；重复打开链接可能重复添加。
- 电脑上点不了 scheme：给二维码让手机扫。二维码内容就是这条链接；用相机扫自定义 scheme 能否直接打开 QX 未经核实，交付时说明。
- `opt-parser=true` 在官方示例里出现在 `server_remote` 行；用于 `rewrite_remote` 行是社区通用写法，未在官方文档逐字核实。

## 任务仓库（官方，build 672+）

```text
quantumult-x:///ui?module=gallery&type=task&action=add&content=<url-encoded JSON 数组：仓库 JSON 的 URL>
```

仓库 JSON 格式（官方 gallery.json）：

```json
{"name": "仓库名", "description": "说明", "task": [
  {"config": "0 9 * * * https://example.com/scripts/check.js, tag=定时检查, enabled=true",
   "addons": "https://example.com/rewrite.snippet"}
]}
```

`config` 是一条 `[task_local]` 行，`addons` 可附带重写片段。从仓库添加的任务之后是否随仓库更新未经核实；HTTP Backend 没有对应的远程订阅方式，只能手写。

## 交付清单

- 资源 URL、脚本 URL、版本参数三者一致，且返回原始文本（不是登录页、404 或 CDN 旧版）。
- 需要手写的配置行（task、http_backend、general、dns）单独列出，说明不会随资源更新。
- 写明哪些只做了本地验证、哪些需要用户在设备上确认。
