'use strict';
// Minimal fake of the `vscode` API: enough to load and activate the extension in plain Node.
const commands = new Map();
const calls = [];
const noop = () => {};
const disposable = { dispose: noop };
class EventEmitter { constructor() { this.event = () => disposable; } fire() {} }
const statusItem = () => ({ show: noop, hide: noop, dispose: noop });
const store = new Map();
const mock = {
  __commands: commands, __calls: calls,
  StatusBarAlignment: { Left: 1, Right: 2 },
  ProgressLocation: { Notification: 15 },
  ViewColumn: { Active: -1 },
  ConfigurationTarget: { Global: 1 },
  MarkdownString: class { constructor(v) { this.value = v; } },
  Hover: class { constructor(c) { this.contents = c; } },
  Range: class { constructor(a, b) { this.start = a; this.end = b; } },
  InlineCompletionItem: class { constructor(t, r) { this.insertText = t; this.range = r; } },
  Uri: { file: (p) => ({ fsPath: p, scheme: 'file' }), parse: (s) => ({ toString: () => s, scheme: 'https' }) },
  EventEmitter,
  env: { language: 'ar', clipboard: { writeText: async () => {} }, openExternal: async (u) => { calls.push(['openExternal', u]); } },
  extensions: { getExtension: () => undefined },
  languages: {
    getDiagnostics: () => [],
    registerHoverProvider: (_s, p) => { mock.__hover = p; return disposable; },
    registerInlineCompletionItemProvider: (_s, p) => { mock.__inline = p; return disposable; }
  },
  commands: {
    registerCommand: (id, fn) => { commands.set(id, fn); return disposable; },
    executeCommand: async (id, ...a) => { calls.push([id, ...a]); if (commands.has(id)) return commands.get(id)(...a); }
  },
  window: {
    createOutputChannel: () => ({ appendLine: noop, dispose: noop }),
    createStatusBarItem: statusItem,
    onDidChangeActiveTextEditor: () => disposable,
    activeTextEditor: undefined,
    showInformationMessage: async (...a) => { calls.push(['info', ...a]); },
    showWarningMessage: async (...a) => { calls.push(['warn', ...a]); },
    showErrorMessage: async (...a) => { calls.push(['error', ...a]); },
    showQuickPick: async () => undefined,
    showInputBox: async () => undefined,
    showOpenDialog: async () => undefined,
    withProgress: async (_o, fn) => fn({}, { onCancellationRequested: noop }),
    createWebviewPanel: (_id, _title) => { const p = { webview: { html: '', cspSource: 'csp:' } }; mock.__panel = p; return p; },
    createTerminal: (o) => { const t = { opts: o, sent: [], show: noop, sendText(x) { t.sent.push(x); } }; mock.__terminal = t; return t; },
    setStatusBarMessage: noop
  },
  workspace: {
    textDocuments: [], workspaceFolders: undefined,
    onDidChangeConfiguration: () => disposable, onDidOpenTextDocument: () => disposable,
    onDidChangeTextDocument: () => disposable, onDidCloseTextDocument: () => disposable,
    getConfiguration: () => ({ get: (k) => ({ website: 'https://example.test/' }[k]), update: async () => {} })
  }
};
module.exports = mock;
