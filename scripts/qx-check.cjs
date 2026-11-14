#!/usr/bin/env node
"use strict";
const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");
const [mode, file, input, link, build = "951"] = process.argv.slice(2);
if (!["rewrite", "parser"].includes(mode) || !file || !input) {
  console.error("用法: node qx-check.cjs rewrite script.js cases.json | parser parser.js resource.js URL [build]");
  process.exit(2);
}
const code = fs.readFileSync(file, "utf8");
function run(globals, strict = true) {
  const calls = [], logs = [], notes = [];
  const context = {...globals, console: {log: (...v) => logs.push(v.map(String).join(" "))}, $notify: (...v) => notes.push(v), $done: v => calls.push(v === undefined ? null : JSON.parse(JSON.stringify(v)))};
  new vm.Script(code, {filename: file}).runInNewContext(context, {timeout: 3000});
  if (strict) assert.equal(calls.length, 1, "同步执行应恰好调用一次 $done；异步脚本需专用运行器");
  else {
    assert.ok(calls.length, "解析器未完成");
    for (const call of calls) assert.equal(call?.content, calls[0]?.content, "解析器多次返回的 content 不一致");
  }
  return {result: calls[0], doneCalls: calls.length, logs, notes};
}
if (mode === "rewrite") {
  const cases = JSON.parse(fs.readFileSync(input, "utf8"));
  assert.ok(Array.isArray(cases) && cases.length, "至少提供一个用例");
  for (const c of cases) {
    assert.ok(c.name && c.request && c.expect, "用例必须包含 name/request/expect");
    const globals = {$request: c.request, $environment: {version: "Quantumult X v1.5.6 build951", variables: {}}};
    if (Object.hasOwn(c, "response")) globals.$response = c.response;
    const {result} = run(globals);
    if (c.expect.unchanged === true) assert.deepEqual(result, {}, c.name);
    else if (Object.hasOwn(c.expect, "json")) {
      assert.equal(typeof result?.body, "string", c.name);
      assert.deepEqual(JSON.parse(result.body), c.expect.json, c.name);
    } else if (Object.hasOwn(c.expect, "done")) assert.deepEqual(result, c.expect.done, c.name);
    else throw new Error("未知断言: " + c.name);
    console.log("PASS " + c.name);
  }
} else {
  assert.ok(link && /^https?:\/\//.test(link), "提供待导入的资源 URL");
  assert.match(build, /^\d+$/, "build 必须是整数");
  const out = run({$resource: {link, content: fs.readFileSync(input, "utf8"), type: "rewrite", tag: "local-check", info: "", user_agent: ""}, $environment: {version: "Quantumult X build" + build}}, false);
  assert.equal(typeof out.result?.content, "string", "解析器未返回 content");
  assert.ok(out.result.content.trim(), "解析器输出为空");
  console.log(JSON.stringify(out, null, 2));
}
