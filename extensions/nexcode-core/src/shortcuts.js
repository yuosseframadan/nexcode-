'use strict';
// Same shortcuts as VS Code (Windows). Labels in 6 languages: [en, ar, fr, de, ja, zh].
const ROWS = [
  ['Ctrl+Shift+P', ['Command Palette', 'لوحة الأوامر', 'Palette de commandes', 'Befehlspalette', 'コマンドパレット', '命令面板']],
  ['Ctrl+P', ['Quick open file', 'فتح ملف سريعاً', 'Ouvrir un fichier rapidement', 'Datei schnell öffnen', 'ファイルをすばやく開く', '快速打开文件']],
  ['Ctrl+Shift+F10', ['Run current file (NexCode)', 'تشغيل الملف الحالي (NexCode)', 'Exécuter le fichier (NexCode)', 'Datei ausführen (NexCode)', '現在のファイルを実行 (NexCode)', '运行当前文件 (NexCode)']],
  ['Ctrl+Alt+N', ['NexCode menu', 'قائمة NexCode', 'Menu NexCode', 'NexCode-Menü', 'NexCode メニュー', 'NexCode 菜单']],
  ['Ctrl+S', ['Save', 'حفظ', 'Enregistrer', 'Speichern', '保存', '保存']],
  ['Ctrl+Shift+S', ['Save as', 'حفظ باسم', 'Enregistrer sous', 'Speichern unter', '名前を付けて保存', '另存为']],
  ['Ctrl+Z / Ctrl+Y', ['Undo / Redo', 'تراجع / إعادة', 'Annuler / Rétablir', 'Rückgängig / Wiederholen', '元に戻す / やり直し', '撤销 / 重做']],
  ['Ctrl+F', ['Find', 'بحث', 'Rechercher', 'Suchen', '検索', '查找']],
  ['Ctrl+H', ['Replace', 'استبدال', 'Remplacer', 'Ersetzen', '置換', '替换']],
  ['Ctrl+Shift+F', ['Search in all files', 'بحث في كل الملفات', 'Rechercher dans les fichiers', 'In Dateien suchen', 'ファイル全体を検索', '在文件中查找']],
  ['Ctrl+/', ['Toggle line comment', 'تبديل تعليق السطر', 'Commenter la ligne', 'Zeilenkommentar umschalten', '行コメントの切り替え', '切换行注释']],
  ['Alt+↑ / Alt+↓', ['Move line up / down', 'نقل السطر لأعلى / لأسفل', 'Déplacer la ligne', 'Zeile verschieben', '行を上下に移動', '上移/下移一行']],
  ['Shift+Alt+↑ / ↓', ['Copy line up / down', 'نسخ السطر لأعلى / لأسفل', 'Copier la ligne', 'Zeile kopieren', '行を上下にコピー', '向上/向下复制行']],
  ['Ctrl+D', ['Select next occurrence', 'تحديد التكرار التالي', "Sélectionner l'occurrence suivante", 'Nächstes Vorkommen auswählen', '次の出現箇所を選択', '选择下一个匹配项']],
  ['Ctrl+Shift+K', ['Delete line', 'حذف السطر', 'Supprimer la ligne', 'Zeile löschen', '行を削除', '删除行']],
  ['Alt+Click', ['Add another cursor', 'إضافة مؤشر آخر', 'Ajouter un curseur', 'Weiteren Cursor hinzufügen', 'カーソルを追加', '添加光标']],
  ['Ctrl+Space', ['Show suggestions', 'إظهار الاقتراحات', 'Afficher les suggestions', 'Vorschläge anzeigen', '候補を表示', '显示建议']],
  ['Shift+Alt+F', ['Format document', 'تنسيق المستند', 'Formater le document', 'Dokument formatieren', 'ドキュメントを整形', '格式化文档']],
  ['F12', ['Go to definition', 'الانتقال إلى التعريف', 'Aller à la définition', 'Zur Definition gehen', '定義へ移動', '转到定义']],
  ['F2', ['Rename symbol', 'إعادة تسمية الرمز', 'Renommer le symbole', 'Symbol umbenennen', 'シンボルの名前変更', '重命名符号']],
  ['Ctrl+G', ['Go to line', 'الانتقال إلى سطر', 'Aller à la ligne', 'Gehe zu Zeile', '行へ移動', '转到行']],
  ['Ctrl+B', ['Show / hide side bar', 'إظهار / إخفاء الشريط الجانبي', 'Afficher/masquer la barre latérale', 'Seitenleiste ein-/ausblenden', 'サイドバーの表示/非表示', '显示/隐藏侧边栏']],
  ['Ctrl+`', ['Show / hide terminal', 'إظهار / إخفاء الطرفية', 'Afficher/masquer le terminal', 'Terminal ein-/ausblenden', 'ターミナルの表示/非表示', '显示/隐藏终端']],
  ['Ctrl+Shift+E', ['Explorer', 'المستكشف', 'Explorateur', 'Explorer', 'エクスプローラー', '资源管理器']],
  ['Ctrl+Shift+X', ['Extensions', 'الإضافات', 'Extensions', 'Erweiterungen', '拡張機能', '扩展']],
  ['Ctrl+Shift+G', ['Source control (Git)', 'التحكم في المصدر (Git)', 'Contrôle de code source (Git)', 'Quellcodeverwaltung (Git)', 'ソース管理 (Git)', '源代码管理 (Git)']],
  ['F5', ['Start debugging', 'بدء التصحيح', 'Démarrer le débogage', 'Debugging starten', 'デバッグ開始', '开始调试']],
  ['Ctrl+W', ['Close editor', 'إغلاق المحرر', "Fermer l'éditeur", 'Editor schließen', 'エディターを閉じる', '关闭编辑器']],
  ['Ctrl+Tab', ['Switch between tabs', 'التنقل بين التبويبات', "Basculer entre les onglets", 'Zwischen Tabs wechseln', 'タブの切り替え', '切换标签页']],
  ['Ctrl+\\', ['Split editor', 'تقسيم المحرر', "Diviser l'éditeur", 'Editor teilen', 'エディターを分割', '拆分编辑器']],
  ['Ctrl+K Ctrl+S', ['Keyboard shortcuts editor', 'محرر الاختصارات', 'Raccourcis clavier', 'Tastenkürzel-Editor', 'キーボード ショートカット', '键盘快捷方式']]
];
const IDX = { en: 0, ar: 1, fr: 2, de: 3, ja: 4, zh: 5 };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function html(lang, t, rtl, nonce, cspSource) {
  const i = IDX[lang] ?? 0;
  const rows = ROWS.map((r) => {
    const keys = r[0].split(/\s+/).map((k) => (k === '/' ? '<span class="sep">/</span>' : `<kbd>${esc(k)}</kbd>`)).join(' ');
    return `<tr><td>${esc(r[1][i])}</td><td class="k">${keys}</td></tr>`;
  }).join('\n');
  return `<!DOCTYPE html>
<html lang="${esc(lang)}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}';">
<style nonce="${nonce}">
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:24px;max-width:860px;margin:auto}
h1{background:linear-gradient(90deg,#19c2ff,#8b5cf6);-webkit-background-clip:text;color:transparent;font-size:28px}
p{opacity:.8}table{width:100%;border-collapse:collapse;margin-top:16px}
td{padding:9px 10px;border-bottom:1px solid var(--vscode-editorWidget-border,#8884)}
th{text-align:start;padding:8px 10px;opacity:.7;border-bottom:2px solid var(--vscode-editorWidget-border,#8884)}
td.k{text-align:end;white-space:nowrap;direction:ltr}
kbd{background:var(--vscode-keybindingLabel-background,#8882);border:1px solid var(--vscode-keybindingLabel-border,#8886);border-radius:4px;padding:2px 7px;font-family:var(--vscode-editor-font-family);font-size:.9em}
.sep{opacity:.5;margin:0 2px}
</style></head><body>
<h1>⌨️ ${esc(t('scTitle'))}</h1><p>${esc(t('scHint'))}</p>
<table><thead><tr><th>${esc(t('scAction'))}</th><th style="text-align:end">${esc(t('scKeys'))}</th></tr></thead><tbody>
${rows}
</tbody></table></body></html>`;
}

module.exports = { ROWS, html };
