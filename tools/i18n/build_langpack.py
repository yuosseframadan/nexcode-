#!/usr/bin/env python3
"""Build the NexCode Arabic language pack (a normal VS Code language pack extension).

Reads the *authoritative* string tables produced by the VS Code build
(out-build/nls.keys.json + nls.messages.json), looks every English message up in
translations/ar*.json and writes translations/main.i18n.json. Messages without an
Arabic entry are simply left out: VS Code falls back to English for them.

usage: build_langpack.py --nls-dir vscode/out-build --dict translations --out build/langpack-ar
"""
import argparse, glob, json, os, re, sys

ap = argparse.ArgumentParser()
ap.add_argument("--nls-dir", required=True)
ap.add_argument("--dict", default="translations")
ap.add_argument("--out", required=True)
ap.add_argument("--lang", default="ar")
ap.add_argument("--version", default="1.0.0")
a = ap.parse_args()

keys = json.load(open(os.path.join(a.nls_dir, "nls.keys.json"), encoding="utf-8"))
msgs = json.load(open(os.path.join(a.nls_dir, "nls.messages.json"), encoding="utf-8"))

dic = {}
for f in sorted(glob.glob(os.path.join(a.dict, f"{a.lang}*.json"))):
    d = json.load(open(f, encoding="utf-8"))
    d.pop("_comment", None)
    dic.update(d)

MNEMONIC = re.compile(r"&&(.)")
contents, idx, hit, total = {}, 0, 0, 0
for module_id, mod_keys in keys:
    for key in mod_keys:
        eng = msgs[idx]
        idx += 1
        total += 1
        if not isinstance(eng, str):
            continue
        m = MNEMONIC.search(eng)
        clean = MNEMONIC.sub(r"\1", eng)
        tr = dic.get(clean)
        if tr is None:
            continue
        if m:  # non-Latin UI keeps an ASCII access key: "ملف (&&F)"
            tr = f"{tr} (&&{m.group(1).upper()})"
        k = key if isinstance(key, str) else key.get("key")
        contents.setdefault(module_id, {})[k] = tr
        hit += 1

if idx != len(msgs):
    print(f"WARNING: keys/messages length mismatch ({idx} vs {len(msgs)})", file=sys.stderr)

os.makedirs(os.path.join(a.out, "translations"), exist_ok=True)
with open(os.path.join(a.out, "translations", "main.i18n.json"), "w", encoding="utf-8") as f:
    json.dump({"": ["NexCode Arabic translation (MIT)"], "version": "1.0.0", "contents": contents}, f, ensure_ascii=False)

pkg = {
    "name": f"nexcode-language-pack-{a.lang}",
    "displayName": "Arabic Language Pack for NexCode",
    "description": "حزمة اللغة العربية لواجهة NexCode",
    "version": a.version,
    "publisher": "nexcode",
    "license": "MIT",
    "engines": {"vscode": "^1.80.0"},
    "categories": ["Language Packs"],
    "contributes": {"localizations": [{
        "languageId": a.lang, "languageName": "Arabic", "localizedLanguageName": "العربية",
        "translations": [{"id": "vscode", "path": "./translations/main.i18n.json"}]}]},
}
json.dump(pkg, open(os.path.join(a.out, "package.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(os.path.join(a.out, "README.md"), "w", encoding="utf-8").write("# NexCode Arabic language pack\n\nعربي لواجهة NexCode.\n")
open(os.path.join(a.out, "LICENSE"), "w").write("MIT\n")
print(f"Arabic pack: {hit} of {total} UI strings translated ({100*hit/max(total,1):.1f}%), "
      f"{len(contents)} modules -> {a.out}")
