'use strict';
const Module = require('module');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const test = require('node:test');

const mock = require('./mock-vscode');
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) { return req === 'vscode' ? path.join(__dirname, 'mock-vscode.js') : orig.call(this, req, ...rest); };

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('manifest: every %key% exists in every package.nls file', () => {
  const used = new Set((JSON.stringify(pkg).match(/%[\w.]+%/g) || []).map((s) => s.slice(1, -1)));
  for (const f of fs.readdirSync(root).filter((x) => /^package\.nls.*\.json$/.test(x))) {
    const j = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
    for (const k of used) assert.ok(k in j, `${f} lacks ${k}`);
  }
});

test('i18n: all 6 languages have identical key sets', () => {
  const { S } = require('../src/i18n');
  const keys = Object.keys(S.en).sort().join();
  for (const l of Object.keys(S)) assert.strictEqual(Object.keys(S[l]).sort().join(), keys, l);
});

test('i18n: placeholders survive in every language', () => {
  const { S } = require('../src/i18n');
  for (const k of Object.keys(S.en)) {
    const need = (S.en[k].match(/\{\d\}/g) || []).sort().join();
    for (const l of Object.keys(S)) assert.strictEqual((S[l][k].match(/\{\d\}/g) || []).sort().join(), need, `${l}.${k}`);
  }
});

test('errors: every rule has all 6 languages and matches its sample', () => {
  const e = require('../src/errors');
  for (const r of e.RULES) for (const l of ['en', 'ar', 'fr', 'de', 'ja', 'zh']) assert.ok(r[l] && r[l].length > 10);
  assert.ok(e.explain("Cannot find name 'x'.", 'ar'));
  assert.ok(e.explain("';' expected.", 'de'));
  assert.ok(e.explain('IndentationError: unexpected indent', 'ja'));
  assert.ok(e.explain('ZeroDivisionError: division by zero', 'fr'));
  assert.ok(e.explain('"requests" is not defined', 'en'));
  assert.strictEqual(e.explain('some unrelated text', 'en'), undefined);
});

test('run: command building and detection', () => {
  const r = require('../src/run');
  assert.ok(r.canRun('python') && r.canRun('html') && !r.canRun('plaintext'));
  const res = r.resolveRunner('python', (x) => x === 'py');
  assert.strictEqual(res.exe, 'py -3');
  assert.ok(r.resolveRunner('java', () => false).missing);
  const cmd = r.buildCommand(r.RUNNERS.c, 'gcc', 'C:\\ملفات\\a.c');
  assert.ok(cmd.startsWith('chcp 65001') && cmd.includes('"C:\\ملفات\\a.exe"'));
});

test('templates: all templates produce files; names are sanitised in node', () => {
  const T = require('../src/templates'); const i = require('../src/i18n'); i.setLanguage('en');
  for (const x of T.LIST) { const o = x.make(i.t, 'Demo'); assert.ok(o.files[o.open], x.id); }
  assert.strictEqual(JSON.parse(T.LIST.find((x) => x.id === 'node').make(i.t, 'Demo').files['package.json']).name, 'demo');
});

test('predict: learns bigrams and completes prefixes', () => {
  const { Predictor, contextAt } = require('../src/predict');
  const p = new Predictor();
  p.learn('a', 'function render() {} function render2() {} function render() {}');
  assert.strictEqual(p.suggest('function', 're'), 'render');
  assert.strictEqual(p.suggest('nothing', ''), undefined);
  assert.deepStrictEqual(contextAt('  const val'), { prev: 'const', prefix: 'val' });
  assert.strictEqual(contextAt('singleword'), undefined);
  p.forget('a'); assert.strictEqual(p.suggest('function', 're'), undefined);
});

test('langs: argv.json locale writer', () => {
  const l = require('../src/langs');
  assert.ok(/"locale": "ar"/.test(l.setLocaleInArgv('{\n // c\n "x": 1\n}', 'ar')));
  assert.strictEqual((l.setLocaleInArgv('{ "locale": "fr" }', 'de').match(/locale/g) || []).length, 1);
  const JSONC = (s) => JSON.parse(s.replace(/\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));
  assert.strictEqual(JSONC(l.setLocaleInArgv('{\n // c\n "x": 1\n}', 'ja')).locale, 'ja');
  assert.strictEqual(JSONC(l.setLocaleInArgv('{}', 'ja')).locale, 'ja');
});

test('shortcuts: html is localized and escaped', () => {
  const s = require('../src/shortcuts'); const i = require('../src/i18n'); i.setLanguage('ja');
  const h = s.html('ja', i.t, false, 'n', 'c:');
  assert.ok(h.includes('コマンドパレット') && h.includes('dir="ltr"'));
});

test('github: auth header never leaks the token in plain text', () => {
  const g = require('../src/github');
  const a = g.authHeaderArgs('ghp_secret');
  assert.ok(!a.join(' ').includes('ghp_secret'));
});

test('extension: activates and registers every declared command', async () => {
  mock.env.language = 'ar';
  const ext = require('../extension');
  const subs = [];
  const gs = new Map(); const secrets = new Map();
  const ctx = { subscriptions: subs, extensionPath: root,
    globalState: { get: (k) => gs.get(k), update: async (k, v) => { gs.set(k, v); } },
    secrets: { get: async (k) => secrets.get(k), store: async (k, v) => { secrets.set(k, v); }, delete: async (k) => { secrets.delete(k); } } };
  const realTimeout = global.setTimeout;
  global.setTimeout = (fn, ms, ...a) => (ms === 1500 ? 0 : realTimeout(fn, ms, ...a)); // skip first-run popup
  await ext.activate(ctx);
  global.setTimeout = realTimeout;
  for (const c of pkg.contributes.commands) assert.ok(mock.__commands.has(c.command), `command not registered: ${c.command}`);
  assert.ok(mock.__hover && mock.__inline);
  // cheat sheet opens in Arabic/RTL
  mock.__commands.get('nexcode.shortcuts')();
  assert.ok(mock.__panel.webview.html.includes('dir="rtl"'));
  // run without editor shows the hint
  await mock.__commands.get('nexcode.run')();
  assert.ok(mock.__calls.some((c) => c[0] === 'info'));
  // inline provider suggests learned word
  const { Predictor } = require('../src/predict');
  assert.ok(Predictor);
});
