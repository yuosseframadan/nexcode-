'use strict';
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const i18n = require('./src/i18n');
const { t } = i18n;
const errors = require('./src/errors');
const run = require('./src/run');
const templates = require('./src/templates');
const gh = require('./src/github');
const langs = require('./src/langs');
const shortcuts = require('./src/shortcuts');
const { Predictor, contextAt } = require('./src/predict');

const WALKTHROUGH = 'nexcode.nexcode-core#nexcode.start';
const TOKEN_KEY = 'nexcode.github.token';

// Recommended extensions per language (Open VSX ids). Offered once per language.
const RECOMMEND = {
  python: { name: 'Python', ids: ['ms-python.python'] },
  java: { name: 'Java', ids: ['redhat.java', 'vscjava.vscode-java-debug'] },
  c: { name: 'C/C++', ids: ['llvm-vs-code-extensions.vscode-clangd'] },
  cpp: { name: 'C/C++', ids: ['llvm-vs-code-extensions.vscode-clangd'] },
  go: { name: 'Go', ids: ['golang.go'] },
  rust: { name: 'Rust', ids: ['rust-lang.rust-analyzer'] },
  php: { name: 'PHP', ids: ['bmewburn.vscode-intelephense-client'] },
  csharp: { name: 'C#', ids: ['muhammad-sammy.csharp'] },
  dart: { name: 'Dart', ids: ['dart-code.dart-code'] },
  ruby: { name: 'Ruby', ids: ['shopify.ruby-lsp'] },
  vue: { name: 'Vue', ids: ['vue.volar'] }
};

const cfg = () => vscode.workspace.getConfiguration('nexcode');
const website = () => cfg().get('website') || 'https://mute-mouse-67d8.yousseframadan2211.workers.dev/';

/** @param {vscode.ExtensionContext} context */
async function activate(context) {
  i18n.setLanguage(vscode.env.language);
  const out = vscode.window.createOutputChannel('NexCode');
  context.subscriptions.push(out);
  const state = { ghUser: undefined };

  // ---------- status bar ----------
  const mainItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);
  mainItem.text = '$(rocket) NexCode';
  mainItem.tooltip = t('statusTooltip');
  mainItem.command = 'nexcode.menu';
  const ghItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 900);
  ghItem.command = 'nexcode.github.menuOrSignIn';
  context.subscriptions.push(mainItem, ghItem);

  function refreshStatus() {
    if (cfg().get('statusBar') === false) { mainItem.hide(); ghItem.hide(); return; }
    mainItem.show();
    if (state.ghUser) { ghItem.text = `$(github) ${state.ghUser.login}`; ghItem.tooltip = t('ghSignedIn', state.ghUser.login); }
    else { ghItem.text = '$(github)'; ghItem.tooltip = t('ghStatusSignIn'); }
    ghItem.show();
  }
  refreshStatus();
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => { if (e.affectsConfiguration('nexcode.statusBar')) refreshStatus(); }));

  // ---------- run ----------
  function updateCanRun() {
    const ed = vscode.window.activeTextEditor;
    vscode.commands.executeCommand('setContext', 'nexcode.canRun', !!ed && run.canRun(ed.document.languageId));
  }
  updateCanRun();
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateCanRun));
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(updateCanRun));

  context.subscriptions.push(vscode.commands.registerCommand('nexcode.run', async () => {
    const ed = vscode.window.activeTextEditor;
    if (!ed) { vscode.window.showInformationMessage(t('runNoFile')); return; }
    const doc = ed.document;
    const lang = doc.languageId;
    if (doc.isUntitled) { const ok = await doc.save(); if (!ok) return; }
    else if (doc.isDirty) await doc.save();
    if (run.BROWSER.has(lang)) { await vscode.env.openExternal(doc.uri); vscode.window.setStatusBarMessage(t('runOpenedBrowser'), 3000); return; }
    if (lang === 'markdown') { await vscode.commands.executeCommand('markdown.showPreviewToSide'); return; }
    const r = run.resolveRunner(lang);
    if (!r) { vscode.window.showWarningMessage(t('runUnsupported', lang)); return; }
    if (r.missing) {
      const btn = r.missing.site ? t('runDownload', r.missing.name) : undefined;
      const pick = await vscode.window.showWarningMessage(t('runMissing', r.missing.name), ...(btn ? [btn] : []));
      if (pick && r.missing.site) vscode.env.openExternal(vscode.Uri.parse(r.missing.site));
      return;
    }
    const file = doc.uri.fsPath;
    const term = vscode.window.createTerminal({ name: 'NexCode ▶', shellPath: 'cmd.exe', cwd: path.dirname(file) });
    term.show(true);
    term.sendText(run.buildCommand(r.runner, r.exe, file));
  }));

  // ---------- new project ----------
  context.subscriptions.push(vscode.commands.registerCommand('nexcode.newProject', async () => {
    const pick = await vscode.window.showQuickPick(
      templates.LIST.map((x) => ({ label: x.label, id: x.id, make: x.make })),
      { title: t('tplTitle'), placeHolder: t('tplPlaceholder'), matchOnDescription: true });
    if (!pick) return;
    const name = await vscode.window.showInputBox({
      title: t('tplTitle'), prompt: t('tplName'), value: 'my-project',
      validateInput: (v) => (/^[\p{L}\p{N}_.-]+$/u.test(v || '') ? undefined : t('tplNameInvalid'))
    });
    if (!name) return;
    const parent = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: t('tplParent'), title: t('tplParent') });
    if (!parent || !parent[0]) return;
    const dir = path.join(parent[0].fsPath, name);
    if (fs.existsSync(dir)) { vscode.window.showErrorMessage(t('tplExists', name)); return; }
    const spec = pick.make(t, name);
    for (const [rel, content] of Object.entries(spec.files)) {
      const full = path.join(dir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    }
    const choice = await vscode.window.showInformationMessage(t('tplDone', name), t('tplOpenHere'), t('tplOpenNew'));
    if (choice) {
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(dir), { forceNewWindow: choice === t('tplOpenNew') });
    }
  }));

  // ---------- explain errors ----------
  function explanationsAt(doc, pos) {
    const seen = new Set();
    const res = [];
    for (const d of vscode.languages.getDiagnostics(doc.uri)) {
      if (!d.range.contains(pos)) continue;
      const e = errors.explain(typeof d.message === 'string' ? d.message : String(d.message), i18n.getLanguage());
      if (e && !seen.has(e)) { seen.add(e); res.push(e); }
    }
    return res;
  }
  context.subscriptions.push(vscode.languages.registerHoverProvider([{ scheme: 'file' }, { scheme: 'untitled' }], {
    provideHover(doc, pos) {
      if (cfg().get('explainErrors') === false) return undefined;
      const ex = explanationsAt(doc, pos);
      if (!ex.length) return undefined;
      const md = new vscode.MarkdownString(`**💡 ${t('explainHeader')}**\n\n${ex.join('\n\n')}`);
      return new vscode.Hover(md);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand('nexcode.explainError', () => {
    const ed = vscode.window.activeTextEditor;
    if (!ed) return;
    const ex = explanationsAt(ed.document, ed.selection.active);
    vscode.window.showInformationMessage(ex.length ? `💡 ${ex.join('\n\n')}` : t('explainNone'), { modal: ex.length > 0 });
  }));

  // ---------- next-word prediction ----------
  const predictor = new Predictor();
  const timers = new Map();
  const learn = (doc) => {
    if (doc.uri.scheme !== 'file' && doc.uri.scheme !== 'untitled') return;
    const k = doc.uri.toString();
    clearTimeout(timers.get(k));
    timers.set(k, setTimeout(() => predictor.learn(k, doc.getText()), 400));
  };
  vscode.workspace.textDocuments.forEach(learn);
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(learn),
    vscode.workspace.onDidChangeTextDocument((e) => learn(e.document)),
    vscode.workspace.onDidCloseTextDocument((d) => predictor.forget(d.uri.toString()))
  );
  context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, {
    provideInlineCompletionItems(doc, pos) {
      if (cfg().get('predict.enabled') === false) return undefined;
      const line = doc.lineAt(pos.line).text.slice(0, pos.character);
      const ctx = contextAt(line);
      if (!ctx) return undefined;
      const next = predictor.suggest(ctx.prev, ctx.prefix);
      if (!next) return undefined;
      return [new vscode.InlineCompletionItem(next.slice(ctx.prefix.length), new vscode.Range(pos, pos))];
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand('nexcode.predict.toggle', async () => {
    const on = cfg().get('predict.enabled') !== false;
    await cfg().update('predict.enabled', !on, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(on ? t('predictOff') : t('predictOn'));
  }));

  // ---------- shortcuts cheat sheet ----------
  context.subscriptions.push(vscode.commands.registerCommand('nexcode.shortcuts', () => {
    const panel = vscode.window.createWebviewPanel('nexcode.shortcuts', t('scTitle'), vscode.ViewColumn.Active, { enableScripts: false });
    const nonce = crypto.randomBytes(12).toString('hex');
    panel.webview.html = shortcuts.html(i18n.getLanguage(), t, i18n.isRtl(), nonce, panel.webview.cspSource);
  }));

  // ---------- languages ----------
  const bundledDir = path.join(context.extensionPath, 'bundled');

  async function installVsix(file) {
    await vscode.commands.executeCommand('workbench.extensions.installExtension', vscode.Uri.file(file));
  }

  async function applyLanguage(lang) {
    if (lang.pack) {
      const file = path.join(bundledDir, `langpack-${lang.pack}.vsix`);
      try {
        if (fs.existsSync(file)) await installVsix(file);
        else await vscode.commands.executeCommand('workbench.extensions.installExtension', `MS-CEINTL.vscode-language-pack-${lang.pack}`);
      } catch (e) {
        vscode.window.showErrorMessage(t('langInstallFail', lang.label, e && e.message ? e.message : e));
        return false;
      }
    }
    try { langs.writeLocale(lang.locale); } catch (e) { out.appendLine(`argv.json: ${e}`); return false; }
    return true;
  }

  async function pickLanguage() {
    const cur = i18n.getLanguage();
    const items = i18n.LANGUAGES.map((l) => ({ label: l.label, description: l.english, lang: l, picked: l.id === cur }));
    const pick = await vscode.window.showQuickPick(items, { title: t('langTitle'), placeHolder: t('langPlaceholder'), ignoreFocusOut: true });
    return pick && pick.lang;
  }

  async function changeLanguageFlow() {
    const lang = await pickLanguage();
    if (!lang) return { changed: false };
    const same = lang.id === i18n.getLanguage();
    const ok = await applyLanguage(lang);
    if (!ok || same) return { changed: false };
    const btn = await vscode.window.showInformationMessage(t('langRestartMsg', lang.label), t('restartNow'), t('later'));
    if (btn === t('restartNow')) {
      try { langs.relaunchSoon(); } catch (e) { out.appendLine(`relaunch: ${e}`); }
      await vscode.commands.executeCommand('workbench.action.quit');
    }
    return { changed: true };
  }
  context.subscriptions.push(vscode.commands.registerCommand('nexcode.changeLanguage', changeLanguageFlow));

  async function installBundledExtras() {
    const files = langs.listBundled(bundledDir).filter((f) => !f.startsWith('langpack-'));
    for (const f of files) {
      try { await installVsix(path.join(bundledDir, f)); } catch (e) { out.appendLine(`bundled ${f}: ${e}`); }
    }
    if (files.some((f) => /material-icon-theme/i.test(f))) {
      try { await vscode.workspace.getConfiguration('workbench').update('iconTheme', 'material-icon-theme', vscode.ConfigurationTarget.Global); } catch { /* ignore */ }
    }
  }

  async function stage2() {
    await context.globalState.update('nexcode.stage2', true);
    try { await vscode.commands.executeCommand('workbench.action.selectTheme'); } catch (e) { out.appendLine(`theme: ${e}`); }
    try { await vscode.commands.executeCommand('workbench.action.openWalkthrough', WALKTHROUGH, false); } catch (e) { out.appendLine(`walkthrough: ${e}`); }
  }

  async function firstRun() {
    if (!context.globalState.get('nexcode.stage1')) {
      await context.globalState.update('nexcode.stage1', true);
      const r = await changeLanguageFlow();
      installBundledExtras();
      if (r.changed) return; // app is restarting (or user chose later): theme question comes next launch
    }
    if (!context.globalState.get('nexcode.stage2')) await stage2();
  }
  context.subscriptions.push(vscode.commands.registerCommand('nexcode.setup', async () => {
    await context.globalState.update('nexcode.stage1', false);
    await context.globalState.update('nexcode.stage2', false);
    await firstRun();
  }));

  // ---------- GitHub ----------
  async function loadUser() {
    const token = await context.secrets.get(TOKEN_KEY);
    if (!token) { state.ghUser = undefined; refreshStatus(); return undefined; }
    try { state.ghUser = await gh.getUser(token); }
    catch (e) { if (e.status === 401) { await context.secrets.delete(TOKEN_KEY); } state.ghUser = undefined; }
    refreshStatus();
    return token;
  }

  async function requireToken() {
    let token = await context.secrets.get(TOKEN_KEY);
    if (!token) {
      const b = await vscode.window.showWarningMessage(t('ghNeedSignIn'), t('ghSignInBtn'));
      if (b) await vscode.commands.executeCommand('nexcode.github.signIn');
      token = await context.secrets.get(TOKEN_KEY);
    }
    return token;
  }

  async function saveToken(token) {
    const user = await gh.getUser(token);
    await context.secrets.store(TOKEN_KEY, token);
    state.ghUser = user;
    refreshStatus();
    vscode.window.showInformationMessage(t('ghSignedIn', user.login));
  }

  context.subscriptions.push(vscode.commands.registerCommand('nexcode.github.signInToken', async () => {
    const help = vscode.Uri.parse('https://github.com/settings/tokens/new?scopes=repo,read:user&description=NexCode');
    vscode.env.openExternal(help);
    const token = await vscode.window.showInputBox({ title: 'GitHub', prompt: t('ghTokenPrompt'), placeHolder: t('ghTokenPlaceholder'), password: true, ignoreFocusOut: true });
    if (!token) return;
    try { await saveToken(token.trim()); } catch { vscode.window.showErrorMessage(t('ghTokenBad')); }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('nexcode.github.signIn', async () => {
    const clientId = (cfg().get('github.clientId') || '').trim();
    if (!clientId) { await vscode.commands.executeCommand('nexcode.github.signInToken'); return; }
    let cancelled = false;
    try {
      const token = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: t('ghWaiting'), cancellable: true }, async (_p, ct) => {
        ct.onCancellationRequested(() => { cancelled = true; });
        return gh.deviceFlow(clientId, async (code, uri) => {
          await vscode.env.clipboard.writeText(code);
          vscode.window.showInformationMessage(t('ghDeviceMsg', code), t('ghOpenPage'));
          vscode.env.openExternal(vscode.Uri.parse(uri));
        }, () => cancelled);
      });
      await saveToken(token);
    } catch (e) {
      if (!cancelled) vscode.window.showErrorMessage(`GitHub: ${e && e.message ? e.message : e}`);
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('nexcode.github.signOut', async () => {
    await context.secrets.delete(TOKEN_KEY);
    state.ghUser = undefined; refreshStatus();
    vscode.window.showInformationMessage(t('ghSignedOut'));
  }));

  context.subscriptions.push(vscode.commands.registerCommand('nexcode.github.menuOrSignIn', async () => {
    if (!state.ghUser) { await vscode.commands.executeCommand('nexcode.github.signIn'); return; }
    const pick = await vscode.window.showQuickPick([
      { label: `$(repo-clone) ${t('menuClone')}`, cmd: 'nexcode.github.clone' },
      { label: `$(cloud-upload) ${t('menuPublish')}`, cmd: 'nexcode.github.publish' },
      { label: `$(sign-out) ${t('menuSignOut')}`, cmd: 'nexcode.github.signOut' }
    ], { title: `GitHub — ${state.ghUser.login}` });
    if (pick) vscode.commands.executeCommand(pick.cmd);
  }));

  async function ensureGit() {
    if (await gh.hasGit()) return true;
    const b = await vscode.window.showErrorMessage(t('ghGitMissing'), t('ghDownloadGit'));
    if (b) vscode.env.openExternal(vscode.Uri.parse('https://git-scm.com/download/win'));
    return false;
  }

  context.subscriptions.push(vscode.commands.registerCommand('nexcode.github.clone', async () => {
    const token = await requireToken();
    if (!token) return;
    if (!(await ensureGit())) return;
    let repos;
    try {
      repos = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: t('ghLoadingRepos') }, () => gh.listRepos(token));
    } catch (e) { vscode.window.showErrorMessage(`GitHub: ${e.message}`); return; }
    if (!repos.length) { vscode.window.showInformationMessage(t('ghNoRepos')); return; }
    const picks = await vscode.window.showQuickPick(
      repos.map((r) => ({ label: r.full_name, description: r.private ? '🔒' : '', detail: r.description || '', repo: r })),
      { canPickMany: true, title: 'GitHub', placeHolder: t('ghPickRepos'), matchOnDetail: true });
    if (!picks || !picks.length) return;
    const parent = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: t('ghChooseFolder'), title: t('ghChooseFolder') });
    if (!parent || !parent[0]) return;
    let last;
    for (const p of picks) {
      try {
        last = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: t('ghCloning', p.repo.name) }, () => gh.cloneRepo(token, p.repo, parent[0].fsPath));
        out.appendLine(`cloned ${p.repo.full_name} -> ${last}`);
      } catch (e) {
        if (e.code === 'EEXISTS') { last = e.dest; continue; }
        vscode.window.showErrorMessage(t('ghCloneFail', e.message));
      }
    }
    if (last) {
      const msg = picks.length === 1 ? t('ghCloneDone', picks[0].repo.name) : t('ghCloneDone', `${picks.length}`);
      const b = await vscode.window.showInformationMessage(msg, t('tplOpenHere'), t('tplOpenNew'));
      if (b) await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(last), { forceNewWindow: b === t('tplOpenNew') });
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('nexcode.github.publish', async () => {
    const folder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
    if (!folder) { vscode.window.showInformationMessage(t('ghNoFolder')); return; }
    const token = await requireToken();
    if (!token) return;
    if (!(await ensureGit())) return;
    const name = await vscode.window.showInputBox({
      prompt: t('ghPublishName'), value: path.basename(folder.uri.fsPath).replace(/[^\w.-]+/g, '-'),
      validateInput: (v) => (/^[\w.-]+$/.test(v || '') ? undefined : t('tplNameInvalid'))
    });
    if (!name) return;
    const vis = await vscode.window.showQuickPick([{ label: `🔒 ${t('ghPublishPrivate')}`, priv: true }, { label: `🌍 ${t('ghPublishPublic')}`, priv: false }], { title: t('ghPublishVisibility') });
    if (!vis) return;
    try {
      const user = state.ghUser || (await gh.getUser(token));
      const repo = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: t('ghPublishing') }, () => gh.publishFolder(token, user, folder.uri.fsPath, name, vis.priv));
      const b = await vscode.window.showInformationMessage(t('ghPublished', repo.html_url), t('ghOpenPage'));
      if (b) vscode.env.openExternal(vscode.Uri.parse(repo.html_url));
    } catch (e) { vscode.window.showErrorMessage(t('ghPublishFail', e.message)); }
  }));

  // ---------- NexCode menu ----------
  context.subscriptions.push(vscode.commands.registerCommand('nexcode.openWebsite', () => vscode.env.openExternal(vscode.Uri.parse(website()))));
  context.subscriptions.push(vscode.commands.registerCommand('nexcode.menu', async () => {
    const items = [
      { label: `$(new-folder) ${t('menuNew')}`, cmd: 'nexcode.newProject' },
      { label: `$(repo-clone) ${t('menuClone')}`, cmd: 'nexcode.github.clone' },
      { label: `$(cloud-upload) ${t('menuPublish')}`, cmd: 'nexcode.github.publish' },
      { label: `$(keyboard) ${t('menuShortcuts')}`, cmd: 'nexcode.shortcuts' },
      { label: `$(globe) ${t('menuLanguage')}`, cmd: 'nexcode.changeLanguage' },
      { label: `$(book) ${t('menuWelcome')}`, cmd: 'workbench.action.openWalkthrough', args: [WALKTHROUGH, false] },
      { label: `$(link-external) ${t('menuWebsite')}`, cmd: 'nexcode.openWebsite' }
    ];
    const pick = await vscode.window.showQuickPick(items, { title: t('menuTitle') });
    if (pick) await vscode.commands.executeCommand(pick.cmd, ...(pick.args || []));
  }));

  // ---------- recommend language extensions ----------
  async function maybeRecommend(doc) {
    if (cfg().get('recommendExtensions') === false || doc.uri.scheme !== 'file') return;
    const rec = RECOMMEND[doc.languageId];
    if (!rec) return;
    const flag = `nexcode.rec.${rec.name}`;
    if (context.globalState.get(flag)) return;
    if (rec.ids.every((id) => vscode.extensions.getExtension(id))) return;
    await context.globalState.update(flag, true);
    const b = await vscode.window.showInformationMessage(t('recMsg', rec.name), t('recInstall'), t('recSkip'));
    if (b !== t('recInstall')) return;
    for (const id of rec.ids) {
      try { await vscode.commands.executeCommand('workbench.extensions.installExtension', id); }
      catch { vscode.window.showWarningMessage(t('recFail', id)); }
    }
  }
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(maybeRecommend));
  if (vscode.window.activeTextEditor) maybeRecommend(vscode.window.activeTextEditor.document);

  // ---------- go ----------
  loadUser();
  setTimeout(() => { firstRun().catch((e) => out.appendLine(`firstRun: ${e}`)); }, 1500);
}

function deactivate() { /* nothing to clean */ }

module.exports = { activate, deactivate };
