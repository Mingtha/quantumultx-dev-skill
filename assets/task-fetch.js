/*
名称：定时检查模板
说明：请求接口，值变化时保存并通知一次；替换 URL、字段和存储键后再使用。
定时任务不会随重写资源导入，需单独加入配置（见 references/distribution.md）。

[task_local]
0 9 * * * https://example.com/scripts/check.js, tag=定时检查, enabled=true
*/
(() => {
  const KEY = "example_check_last"; // 带命名空间的存储键
  const TIMEOUT = 8000;
  let finished = false;
  const finish = () => { if (finished) return; finished = true; clearTimeout(timer); $done(); };
  const timer = setTimeout(() => { console.log("check: 超时"); finish(); }, TIMEOUT);

  $task.fetch({ url: "https://api.example.com/v1/status", method: "GET" }).then(resp => {
    if (finished) return; // 超时后迟到的回调不再写存储或通知
    if (resp.statusCode !== 200) { console.log(`check: HTTP ${resp.statusCode}`); return finish(); }
    let data;
    try { data = JSON.parse(resp.body); } catch (_) { console.log("check: 响应不是 JSON"); return finish(); }
    if (!data || typeof data.value !== "string") { console.log("check: 缺少 value"); return finish(); }
    if ($prefs.valueForKey(KEY) !== data.value) {
      $prefs.setValueForKey(data.value, KEY);
      $notify("定时检查", "值已变化", data.value);
    }
    finish();
  }, reason => { console.log(`check: 请求失败 ${reason && reason.error}`); finish(); });
})();
