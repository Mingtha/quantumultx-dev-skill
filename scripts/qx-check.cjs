#!/usr/bin/env node
"use strict";
// Quantumult X 本地检查工具。只运行已审阅、可信的开发文件：Node vm 不是安全隔离，也不模拟完整 QX。
const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");

const USAGE = `用法:
  node qx-check.cjs check   script.js
  node qx-check.cjs rewrite script.js cases.json
  node qx-check.cjs parser  resource-parser.js script.js 资源URL [--builds 844,951] [--expect 期望行.txt] [--allow-notify]
  node qx-check.cjs har     capture.har URL正则 > cases.json`;
const SECTION = /^\[(rewrite_local|filter_local|mitm|task_local|http_backend|rewrite_remote|filter_remote)\]\s*$/;
const fail = msg => { console.error("FAIL " + msg); process.exitCode = 1; };

// check：语法 + 顶部注释。顶部注释里出现 */（cron 的 */10、正则的 .*/）会提前结束注释：解析器照样提取规则，JS 却是语法错误。
function check(file) {
  const code = fs.readFileSync(file, "utf8");
  const problems = [];
  try { new vm.Script(code, { filename: file }); }
  catch (e) { problems.push(`语法错误：${e.message}（若在顶部注释附近，检查规则或 cron 里是否有 */）`); }
  const start = code.indexOf("/*"), end = code.indexOf("*/", start + 2);
  if (start === -1 || end === -1 || code.slice(0, start).trim()) problems.push("文件开头不是块注释：解析器取不到顶部规则");
  else {
    const after = code.slice(end + 2).split("\n").slice(0, 40);
    const leaked = after.find(l => SECTION.test(l.trim()) || /^hostname\s*=/.test(l.trim()) || /^\^?https?:\S+\s+url\s/.test(l.trim()));
    if (leaked) problems.push(`顶部注释被提前结束，之后还有规则行：「${leaked.trim().slice(0, 60)}」`);
    const header = code.slice(start, end);
    if (/https?:\/\/(?:[\w-]+\.)*example\.(?:com|net|org)\//.test(header)) console.log("WARN 顶部规则仍指向 example 域名，发布前替换为真实地址");
  }
  problems.forEach(p => fail(`${file}: ${p}`));
  if (!problems.length) console.log(`PASS ${file}: 语法与顶部注释`);
  return !problems.length;
}

// rewrite：按用例注入 $request/$response/$prefs/$task.fetch，等待 $done，断言恰好一次。
function makeContext(c, calls) {
  const prefs = { ...(c.prefs ?? {}) }, notes = [], logs = [], fetches = [];
  const queue = [...(c.fetch ?? [])];
  const context = {
    console: { log: (...v) => logs.push(v.map(String).join(" ")) },
    $notify: (...v) => notes.push(v),
    $done: v => calls.push(v === undefined ? null : JSON.parse(JSON.stringify(v))),
    $environment: { version: "Quantumult X v1.5.6 build951", variables: {}, ...(c.environment ?? {}) },
    // shortcut: 缺失键返回 undefined；真机返回值未逐版本核实，脚本应同时处理 null/undefined
    $prefs: {
      valueForKey: k => prefs[k],
      setValueForKey: (v, k) => { prefs[k] = String(v); return true; },
      removeValueForKey: k => { delete prefs[k]; return true; },
    },
    $task: {
      fetch: opts => {
        fetches.push(opts);
        const next = queue.shift();
        if (!next) return Promise.reject({ error: "qx-check: 用例没有为这次 $task.fetch 准备响应" });
        return next.error ? Promise.reject({ error: next.error }) : Promise.resolve(next.response);
      },
    },
    setTimeout, clearTimeout, Promise,
  };
  if (c.request) context.$request = c.request;
  if (Object.hasOwn(c, "response")) context.$response = c.response;
  return { context, prefs, notes, logs, fetches };
}

async function runCase(code, file, c) {
  const calls = [];
  const env = makeContext(c, calls);
  new vm.Script(code, { filename: file }).runInNewContext(env.context, { timeout: 3000 });
  const deadline = Date.now() + (c.timeout ?? 3000);
  while (!calls.length && Date.now() < deadline) await new Promise(r => setTimeout(r, 10));
  await new Promise(r => setTimeout(r, 50)); // 留出时间暴露重复的 $done
  assert.equal(calls.length, 1, `应恰好调用一次 $done，实际 ${calls.length} 次`);
  return { result: calls[0], ...env };
}

function assertExpect(c, out) {
  const e = c.expect, r = out.result;
  if (e === "TODO" || !e || typeof e !== "object") throw new Error("用例的 expect 还没填写（har 模式生成的骨架需要人工写断言）");
  let checked = false;
  if (e.unchanged === true) { assert.deepEqual(r, {}, "应原样放行 $done({})"); checked = true; }
  if (Object.hasOwn(e, "json")) {
    assert.equal(typeof r?.body, "string", "应返回字符串 body");
    assert.deepEqual(JSON.parse(r.body), e.json); checked = true;
  }
  if (Object.hasOwn(e, "done")) { assert.deepEqual(r, e.done); checked = true; }
  if (Object.hasOwn(e, "status")) { assert.equal(r?.status, e.status); checked = true; }
  if (Object.hasOwn(e, "notify")) { assert.equal(out.notes.length, e.notify, `通知次数应为 ${e.notify}`); checked = true; }
  if (Object.hasOwn(e, "fetch")) { assert.equal(out.fetches.length, e.fetch, `$task.fetch 次数应为 ${e.fetch}`); checked = true; }
  if (Object.hasOwn(e, "prefs")) {
    for (const [k, v] of Object.entries(e.prefs)) assert.equal(out.prefs[k], v === null ? undefined : v, `$prefs[${k}]`);
    checked = true;
  }
  if (!checked) throw new Error("expect 里没有可识别的断言：unchanged/json/done/status/notify/fetch/prefs");
}

async function rewrite(file, casesFile) {
  if (!check(file)) return;
  const code = fs.readFileSync(file, "utf8");
  const cases = JSON.parse(fs.readFileSync(casesFile, "utf8"));
  assert.ok(Array.isArray(cases) && cases.length, "至少提供一个用例");
  for (const c of cases) {
    try {
      assert.ok(c.name, "用例缺 name");
      assertExpect(c, await runCase(code, file, c));
      console.log("PASS " + c.name);
    } catch (e) { fail(`${c.name ?? "(无名用例)"}: ${e.message}`); }
  }
}

// parser：在多个 build 下运行用户的解析器；解析器用 $notify 报告被忽略或出错的规则，默认视为失败。
function parser(parserFile, file, link, opts) {
  assert.ok(link && /^https?:\/\//.test(link), "提供待导入的资源 URL");
  if (!check(file)) return;
  const parserCode = fs.readFileSync(parserFile, "utf8"), content = fs.readFileSync(file, "utf8");
  const expected = opts.expect && fs.readFileSync(opts.expect, "utf8").split("\n").map(s => s.trim()).filter(Boolean);
  const outputs = new Map();
  for (const build of opts.builds) {
    const calls = [], notes = [];
    new vm.Script(parserCode, { filename: parserFile }).runInNewContext({
      $resource: { link, content, type: "rewrite", tag: "qx-check", info: "", user_agent: "" },
      $environment: { version: `Quantumult X v1.5.6 build ${build}` },
      $done: v => calls.push(v), $notify: (...v) => notes.push(v.map(String).join(" | ")), console: { log() {} },
    }, { timeout: 5000 });
    const text = calls.find(c => typeof c?.content === "string")?.content;
    if (calls.some(c => typeof c?.content === "string" && c.content !== text)) fail(`build ${build}: 解析器多次返回的 content 不一致`);
    if (!text?.trim()) { fail(`build ${build}: 解析器没有输出规则`); continue; }
    if (notes.length && !opts.allowNotify) fail(`build ${build}: 解析器发出通知（通常是规则被忽略或转换失败）：\n  ${notes.join("\n  ")}`);
    const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
    if (lines.some(l => /\$done\s*\(|^\s*(const|let|var|function)\s/.test(l))) fail(`build ${build}: 输出里混入了 JS 正文`);
    if (expected) {
      const missing = expected.filter(l => !lines.includes(l)), extra = lines.filter(l => !expected.includes(l));
      if (missing.length || extra.length) fail(`build ${build}: 与期望不一致\n  缺少：${missing.join("\n        ") || "无"}\n  多出：${extra.join("\n        ") || "无"}`);
    }
    outputs.set(build, text);
  }
  const unique = new Set(outputs.values());
  for (const [build, text] of outputs) {
    if (unique.size === 1 && build !== opts.builds[0]) continue;
    console.log(`--- build ${unique.size === 1 ? opts.builds.join("/") : build} 输出 ---\n${text}`);
  }
  if (!process.exitCode) console.log(`PASS 解析器输出${expected ? "与期望一致" : "（未提供 --expect，请人工核对规则、动作、脚本 URL 和 hostname）"}`);
}

// har：把抓包里匹配的条目转成用例骨架。删掉常见凭据头；正文仍可能含个人数据，提交前人工脱敏。
function har(harFile, pattern) {
  const re = new RegExp(pattern), drop = /^(cookie|set-cookie|authorization|proxy-authorization|x-[\w-]*(token|auth|sign)[\w-]*)$/i;
  const headers = list => Object.fromEntries((list ?? []).filter(x => !drop.test(x.name) && !x.name.startsWith(":")).map(x => [x.name, x.value]));
  const text = c => {
    if (!c?.text) return "";
    if (c.encoding !== "base64") return c.text;
    const buf = Buffer.from(c.text, "base64"), s = buf.toString("utf8");
    return Buffer.from(s, "utf8").equals(buf) ? s : null;
  };
  const entries = JSON.parse(fs.readFileSync(harFile, "utf8")).log.entries;
  const cases = [];
  entries.forEach((e, i) => {
    if (!re.test(e.request.url)) return;
    const body = text(e.response.content);
    if (body === null) return console.error(`跳过 entry ${i + 1}：二进制正文，需用 bodyBytes 另写用例`);
    cases.push({
      name: `entry ${i + 1} ${e.request.method} ${e.request.url.slice(0, 80)}`,
      request: { url: e.request.url, method: e.request.method, headers: headers(e.request.headers), ...(e.request.postData?.text ? { body: e.request.postData.text } : {}) },
      response: { statusCode: e.response.status, headers: headers(e.response.headers), body },
      expect: "TODO",
    });
  });
  console.error(`匹配 ${cases.length} 条；已删除 Cookie/Authorization/令牌类头。正文与 URL 可能仍含个人数据，提交前人工脱敏，并把每条 expect 改成真实断言。`);
  process.stdout.write(JSON.stringify(cases, null, 2) + "\n");
}

const [mode, ...args] = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i === -1 ? def : args.splice(i, 2)[1]; };
const opts = {
  builds: flag("--builds", "844,951").split(",").map(s => s.trim()).filter(Boolean),
  expect: flag("--expect", null),
  allowNotify: args.includes("--allow-notify") ? (args.splice(args.indexOf("--allow-notify"), 1), true) : false,
};
const run = { check: [1, () => check(args[0])], rewrite: [2, () => rewrite(args[0], args[1])],
  parser: [3, () => parser(args[0], args[1], args[2], opts)], har: [2, () => har(args[0], args[1])] }[mode];
if (!run || args.length < run[0]) { console.error(USAGE); process.exitCode = 2; }
else Promise.resolve().then(run[1]).catch(e => fail(e.message));
