/*
名称：JSON 响应处理模板
说明：示例将 result 为 1 的响应改为 0；替换域名、路径、发布地址及业务逻辑后再使用。

[rewrite_local]
^https://api\.example\.com/v1/items(?:\?|$) url script-response-body https://example.com/scripts/items.js

[mitm]
hostname = api.example.com
*/
(() => {
  try {
    if (typeof $response === "undefined" || $request.method !== "GET" || !/^https:\/\/api\.example\.com\/v1\/items(?:\?|$)/.test($request.url)) return $done({});
    if ($response.statusCode !== 200 || typeof $response.body !== "string" || !$response.body) return $done({});
    const data = JSON.parse($response.body);
    if (!data || typeof data !== "object" || Array.isArray(data) || data.result !== 1) return $done({});
    data.result = 0;
    return $done({body: JSON.stringify(data)});
  } catch (_) { return $done({}); }
})();
