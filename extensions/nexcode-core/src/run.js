'use strict';
const cp = require('child_process');
const path = require('path');

// languageId -> how to run. {f} file, {d} dir, {o} output exe, {n} base name.
const RUNNERS = {
  python:     { exe: ['python', 'py'], cmd: (x) => `${x.exe} "{f}"`, site: 'https://www.python.org/downloads/', name: 'Python' },
  javascript: { exe: ['node'], cmd: () => 'node "{f}"', site: 'https://nodejs.org/', name: 'Node.js' },
  typescript: { exe: ['node'], cmd: () => 'npx --yes tsx "{f}"', site: 'https://nodejs.org/', name: 'Node.js' },
  c:          { exe: ['gcc'], cmd: () => 'gcc "{f}" -o "{o}" && "{o}"', site: 'https://winlibs.com/', name: 'GCC (MinGW)' },
  cpp:        { exe: ['g++'], cmd: () => 'g++ -std=c++17 "{f}" -o "{o}" && "{o}"', site: 'https://winlibs.com/', name: 'G++ (MinGW)' },
  java:       { exe: ['java'], cmd: () => 'java "{f}"', site: 'https://adoptium.net/', name: 'Java JDK' },
  go:         { exe: ['go'], cmd: () => 'go run "{f}"', site: 'https://go.dev/dl/', name: 'Go' },
  rust:       { exe: ['rustc'], cmd: () => 'rustc "{f}" -o "{o}" && "{o}"', site: 'https://rustup.rs/', name: 'Rust' },
  php:        { exe: ['php'], cmd: () => 'php "{f}"', site: 'https://windows.php.net/download/', name: 'PHP' },
  ruby:       { exe: ['ruby'], cmd: () => 'ruby "{f}"', site: 'https://rubyinstaller.org/', name: 'Ruby' },
  lua:        { exe: ['lua'], cmd: () => 'lua "{f}"', site: 'https://luabinaries.sourceforge.net/', name: 'Lua' },
  dart:       { exe: ['dart'], cmd: () => 'dart run "{f}"', site: 'https://dart.dev/get-dart', name: 'Dart' },
  powershell: { exe: ['powershell'], cmd: () => 'powershell -NoProfile -ExecutionPolicy Bypass -File "{f}"', site: null, name: 'PowerShell' },
  bat:        { exe: ['cmd'], cmd: () => 'call "{f}"', site: null, name: 'cmd' },
  batch:      { exe: ['cmd'], cmd: () => 'call "{f}"', site: null, name: 'cmd' }
};
const BROWSER = new Set(['html', 'htm', 'svg']);
const SPECIAL = new Set(['markdown']);

function has(exe) {
  try {
    cp.execSync(`where ${exe}`, { stdio: 'ignore', windowsHide: true });
    return true;
  } catch { return false; }
}

function canRun(languageId) {
  return !!RUNNERS[languageId] || BROWSER.has(languageId) || SPECIAL.has(languageId);
}

function resolveRunner(languageId, probe = has) {
  const r = RUNNERS[languageId];
  if (!r) return undefined;
  const found = r.exe.find((e) => probe(e));
  if (!found) return { missing: r };
  return { runner: r, exe: found === 'py' ? 'py -3' : found };
}

function buildCommand(runner, exe, file) {
  const dir = path.dirname(file);
  const base = path.basename(file, path.extname(file));
  const out = path.join(dir, base + '.exe');
  const body = runner.cmd({ exe }).split('{f}').join(file).split('{o}').join(out);
  // chcp 65001 + UTF-8 env so Arabic / CJK output prints correctly in cmd.
  return `chcp 65001 >nul && set PYTHONIOENCODING=utf-8 && ${body}`;
}

module.exports = { RUNNERS, BROWSER, canRun, has, resolveRunner, buildCommand };
