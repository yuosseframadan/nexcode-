#!/usr/bin/env python3
"""Dev tool: list translatable UI strings found in a VS Code source checkout.

usage: python extract_candidates.py <path-to-vscode> > candidates.tsv
Output: module \t key \t english
(Used only to help extend translations/ar.json; the build itself reads the
authoritative out-build/nls.keys.json + nls.messages.json.)
"""
import os, re, sys

root = sys.argv[1]
src = os.path.join(root, "src")
pat = re.compile(
    r"""localize2?\(\s*(?:'([^']+)'|"([^"]+)"|\{\s*key:\s*'([^']+)'[^}]*?\})\s*,\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)""",
    re.S)
for dp, dn, fn in os.walk(src):
    if "/test" in dp.replace("\\", "/"):
        continue
    for f in fn:
        if not f.endswith(".ts") or f.endswith(".d.ts") or f.endswith(".test.ts"):
            continue
        p = os.path.join(dp, f)
        mod = os.path.relpath(p, src)[:-3].replace(os.sep, "/")
        try:
            t = open(p, encoding="utf-8").read()
        except Exception:
            continue
        for m in pat.finditer(t):
            key = m.group(1) or m.group(2) or m.group(3)
            eng = m.group(4) or m.group(5) or m.group(6) or ""
            eng = eng.replace("\\'", "'").replace('\\"', '"').replace("\\n", " ")
            print(f"{mod}\t{key}\t{eng}")
