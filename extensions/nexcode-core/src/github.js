'use strict';
const cp = require('child_process');
const path = require('path');
const fs = require('fs');

const API = 'https://api.github.com';
const UA = { 'User-Agent': 'NexCode', Accept: 'application/vnd.github+json' };

function authHeaderArgs(token) {
  const b64 = Buffer.from(`x-access-token:${token}`).toString('base64');
  return ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${b64}`];
}

function git(args, cwd, onLine) {
  return new Promise((resolve, reject) => {
    const p = cp.spawn('git', args, { cwd, windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; if (onLine) onLine(String(d)); });
    p.on('error', (e) => reject(e));
    p.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error((err || out).trim() || `git exit ${code}`))));
  });
}

async function hasGit() { try { await git(['--version']); return true; } catch { return false; } }

async function api(token, route, init = {}) {
  const res = await fetch(API + route, { ...init, headers: { ...UA, Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message + (j.errors ? ' ' + JSON.stringify(j.errors) : ''); } catch { /* ignore */ }
    const e = new Error(`${res.status}: ${msg}`); e.status = res.status; throw e;
  }
  return res.json();
}

const getUser = (token) => api(token, '/user');

async function listRepos(token) {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const chunk = await api(token, `/user/repos?per_page=100&sort=updated&page=${page}&affiliation=owner,collaborator,organization_member`);
    all.push(...chunk);
    if (chunk.length < 100) break;
  }
  return all;
}

// OAuth device flow (no server, no client secret).
async function deviceFlow(clientId, onCode, isCancelled) {
  const form = (o) => new URLSearchParams(o).toString();
  const hdr = { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'NexCode' };
  const r = await fetch('https://github.com/login/device/code', { method: 'POST', headers: hdr, body: form({ client_id: clientId, scope: 'repo read:user' }) });
  const d = await r.json();
  if (!d.device_code) throw new Error(d.error_description || d.error || 'device flow failed');
  await onCode(d.user_code, d.verification_uri);
  let interval = (d.interval || 5) * 1000;
  const deadline = Date.now() + (d.expires_in || 900) * 1000;
  while (Date.now() < deadline) {
    await new Promise((s) => setTimeout(s, interval));
    if (isCancelled && isCancelled()) throw new Error('cancelled');
    const tr = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: hdr,
      body: form({ client_id: clientId, device_code: d.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
    });
    const t = await tr.json();
    if (t.access_token) return t.access_token;
    if (t.error === 'slow_down') interval += 5000;
    else if (t.error && t.error !== 'authorization_pending') throw new Error(t.error_description || t.error);
  }
  throw new Error('expired');
}

async function cloneRepo(token, repo, parent, onLine) {
  const dest = path.join(parent, repo.name);
  if (fs.existsSync(dest)) { const e = new Error('exists'); e.code = 'EEXISTS'; e.dest = dest; throw e; }
  await git([...authHeaderArgs(token), 'clone', '--progress', repo.clone_url, dest], parent, onLine);
  return dest;
}

async function publishFolder(token, user, folder, name, isPrivate) {
  const repo = await api(token, '/user/repos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, private: isPrivate, auto_init: false })
  });
  let inside = true;
  try { await git(['rev-parse', '--is-inside-work-tree'], folder); } catch { inside = false; }
  if (!inside) { await git(['init'], folder); await git(['symbolic-ref', 'HEAD', 'refs/heads/main'], folder); }
  let hasCommit = true;
  try { await git(['rev-parse', 'HEAD'], folder); } catch { hasCommit = false; }
  if (!hasCommit) {
    await git(['add', '-A'], folder);
    try { await git(['commit', '-m', 'Initial commit'], folder); }
    catch {
      await git(['config', 'user.name', user.login], folder);
      await git(['config', 'user.email', `${user.id}+${user.login}@users.noreply.github.com`], folder);
      await git(['commit', '-m', 'Initial commit'], folder);
    }
  }
  try { await git(['remote', 'remove', 'origin'], folder); } catch { /* none */ }
  await git(['remote', 'add', 'origin', repo.clone_url], folder);
  await git([...authHeaderArgs(token), 'push', '-u', 'origin', 'HEAD'], folder);
  return repo;
}

module.exports = { authHeaderArgs, git, hasGit, api, getUser, listRepos, deviceFlow, cloneRepo, publishFolder };
