#!/usr/bin/env bash
# Run after the compile step. Puts the language packs and offline extras inside the
# NexCode built-in extension so a fresh install works without internet.
set -e

VS="vscode"
DEST="${VS}/.build/extensions/nexcode-core/bundled"
VS_VERSION="${MS_TAG:-1.135.0}"

[[ -d "${VS}/out-build" ]] || { echo "out-build missing: run build.sh first" >&2; exit 1; }
[[ -d "${VS}/.build/extensions/nexcode-core" ]] || { echo "nexcode-core was not built into .build/extensions" >&2; exit 1; }
mkdir -p "${DEST}" build_tmp

# Windows runners may not have `python3`
if python3 --version >/dev/null 2>&1; then PY=python3; else PY=python; fi

package() { # <folder> <output-name.vsix>: build the VSIX in place, then move it next to the others
  ( cd "$1" && npx --yes @vscode/vsce package --no-dependencies --allow-missing-repository --skip-license -o "$2" )
  mv -f "$1/$2" "${DEST}/$2"
}

echo "== Arabic language pack (NexCode translation) =="
"${PY}" tools/i18n/build_langpack.py --nls-dir "${VS}/out-build" --dict translations --out build_tmp/langpack-ar
package build_tmp/langpack-ar langpack-ar.vsix

echo "== Official Microsoft language packs (MIT, from microsoft/vscode-loc) =="
rm -rf build_tmp/vscode-loc
git clone --depth 1 --filter=blob:none --sparse https://github.com/microsoft/vscode-loc.git build_tmp/vscode-loc
( cd build_tmp/vscode-loc && git sparse-checkout set \
    i18n/vscode-language-pack-fr i18n/vscode-language-pack-de i18n/vscode-language-pack-ja i18n/vscode-language-pack-zh-hans )
for L in fr de ja zh-hans; do
  package "build_tmp/vscode-loc/i18n/vscode-language-pack-${L}" "langpack-${L}.vsix" || echo "WARN: ${L} pack failed"
done

echo "== Offline extras from Open VSX =="
"${PY}" tools/fetch_openvsx.py "${DEST}" "${VS_VERSION}" \
  esbenp.prettier-vscode PKief.material-icon-theme ritwickdey.LiveServer

ls -la "${DEST}"
test -f "${DEST}/langpack-ar.vsix"
