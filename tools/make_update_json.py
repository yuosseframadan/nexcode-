#!/usr/bin/env python3
"""Write the static auto-update JSON files NexCode checks (served from the `updates` branch).

usage: make_update_json.py <out-dir> <assets-dir> <release-version> <build-sourceversion> <owner/repo> [arch]
Creates <out-dir>/stable/win32/<arch>/{user,system}/latest.json
"""
import hashlib, json, os, sys, time

out, assets, version, srcver, repo = sys.argv[1:6]
arch = sys.argv[6] if len(sys.argv) > 6 else "x64"


def product_version(v):
    p = v.split("-")[0].split(".")
    return f"{p[0]}.{p[1]}.{p[2]}.0"


def digest(path, algo):
    h = hashlib.new(algo)
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


for target, name in (("system", f"NexCodeSetup-{arch}-{version}.exe"), ("user", f"NexCodeUserSetup-{arch}-{version}.exe")):
    path = os.path.join(assets, name)
    if not os.path.isfile(path):
        print(f"skip {target}: {name} not found")
        continue
    data = {
        "url": f"https://github.com/{repo}/releases/download/{version}/{name}",
        "name": version,
        "version": srcver,
        "productVersion": product_version(version),
        "hash": digest(path, "sha1"),
        "timestamp": int(time.time() * 1000),
        "sha256hash": digest(path, "sha256"),
    }
    d = os.path.join(out, "stable", "win32", arch, target)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "latest.json"), "w") as f:
        json.dump(data, f, indent=2)
    print(f"wrote {d}/latest.json")
