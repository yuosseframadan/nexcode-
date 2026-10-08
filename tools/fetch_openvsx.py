#!/usr/bin/env python3
"""Download extensions from Open VSX into a folder (best effort: a missing one only warns).

usage: fetch_openvsx.py <dest> <vscode-version e.g. 1.135.0> <publisher.name> [...]
Picks the newest release whose engines.vscode is compatible with the given VS Code.
"""
import json, os, re, sys, urllib.request

dest, vs = sys.argv[1], sys.argv[2]
ids = sys.argv[3:]
os.makedirs(dest, exist_ok=True)
VS = tuple(int(x) for x in vs.split(".")[:3])


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "NexCode-build"})
    return urllib.request.urlopen(req, timeout=60)


def compatible(engine):
    m = re.search(r"(\d+)\.(\d+)\.(\d+|x)", engine or "")
    if not m:
        return True
    need = (int(m.group(1)), int(m.group(2)), 0 if m.group(3) == "x" else int(m.group(3)))
    return need <= VS


def pick(ns, name):
    meta = json.load(get(f"https://open-vsx.org/api/{ns}/{name}"))
    if compatible((meta.get("engines") or {}).get("vscode")):
        return meta
    for ver in list((meta.get("allVersions") or {}).keys())[:25]:
        if ver in ("latest", "pre-release"):
            continue
        m = json.load(get(f"https://open-vsx.org/api/{ns}/{name}/{ver}"))
        if compatible((m.get("engines") or {}).get("vscode")):
            return m
    return None


ok = 0
for ext in ids:
    try:
        ns, name = ext.split(".", 1)
        m = pick(ns, name)
        if not m:
            print(f"WARN: no compatible release for {ext}")
            continue
        url = m["files"]["download"]
        out = os.path.join(dest, f"{ns}.{name}.vsix")
        with get(url) as r, open(out, "wb") as f:
            f.write(r.read())
        print(f"OK   {ext} {m.get('version')} ({os.path.getsize(out)//1024} KB)")
        ok += 1
    except Exception as e:  # never break the build for an optional extra
        print(f"WARN: {ext}: {e}")
print(f"{ok}/{len(ids)} extensions downloaded")
