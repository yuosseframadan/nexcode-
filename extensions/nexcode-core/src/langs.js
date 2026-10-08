'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

// Put "locale" first inside argv.json (JSONC; trailing commas are allowed there).
function setLocaleInArgv(text, locale) {
  const entry = `"locale": "${locale}"`;
  if (!text || !text.trim()) return `{\n\t${entry}\n}\n`;
  const re = /(^|[^/])"locale"\s*:\s*"[^"]*"/m;
  if (re.test(text)) return text.replace(/"locale"\s*:\s*"[^"]*"/, entry);
  const i = text.indexOf('{');
  if (i < 0) return `{\n\t${entry}\n}\n`;
  return text.slice(0, i + 1) + `\n\t${entry},` + text.slice(i + 1);
}

function argvPath() { return path.join(os.homedir(), '.nexcode', 'argv.json'); }

function writeLocale(locale) {
  const p = argvPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  let cur = '';
  try { cur = fs.readFileSync(p, 'utf8'); } catch { /* new file */ }
  fs.writeFileSync(p, setLocaleInArgv(cur, locale), 'utf8');
  return p;
}

// Start a fresh NexCode after this one quits (Windows).
function relaunchSoon() {
  const exe = process.execPath;
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('VSCODE_') || k.startsWith('ELECTRON_') || k === 'ELECTRON_RUN_AS_NODE') continue;
    env[k] = v;
  }
  const child = cp.spawn('cmd.exe', ['/c', `ping 127.0.0.1 -n 4 >nul & start "" "${exe}"`],
    { detached: true, stdio: 'ignore', windowsHide: true, env });
  child.unref();
}

function listBundled(dir) {
  try { return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.vsix')); } catch { return []; }
}

module.exports = { setLocaleInArgv, writeLocale, argvPath, relaunchSoon, listBundled };
