#!/usr/bin/env bash
# shellcheck disable=SC1091,2154
# NexCode: prepare the VS Code (Code - OSS) sources — branding, patches, dependencies.
# Derived from the VSCodium build scripts (MIT). Windows only.

set -e

cp -rp src/stable/* vscode/
cp -f LICENSE vscode/LICENSE.txt

cd vscode || { echo "'vscode' dir not found"; exit 1; }

{ set +x; } 2>/dev/null

# include common functions (needed by everything below)
. ../utils.sh

SITE_URL="${NEXCODE_SITE:-https://mute-mouse-67d8.yousseframadan2211.workers.dev/}"
REPO_URL="https://github.com/${GH_REPO_PATH}"

# {{{ product.json
cp product.json{,.bak}

setpath() {
  local jsonTmp
  { set +x; } 2>/dev/null
  jsonTmp=$( jq --arg 'value' "${3}" "setpath(path(.${2}); \$value)" "${1}.json" )
  echo "${jsonTmp}" > "${1}.json"
  set -x
}

setpath_json() {
  local jsonTmp
  { set +x; } 2>/dev/null
  jsonTmp=$( jq --argjson 'value' "${3}" "setpath(path(.${2}); \$value)" "${1}.json" )
  echo "${jsonTmp}" > "${1}.json"
  set -x
}

setpath "product" "checksumFailMoreInfoUrl" "${SITE_URL}"
setpath "product" "documentationUrl" "${SITE_URL}"
setpath_json "product" "extensionsGallery" '{"serviceUrl": "https://open-vsx.org/vscode/gallery", "itemUrl": "https://open-vsx.org/vscode/item", "latestUrlTemplate": "https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest", "controlUrl": "https://raw.githubusercontent.com/EclipseFdn/publish-extensions/refs/heads/master/extension-control/extensions.json"}'

setpath "product" "introductoryVideosUrl" "${SITE_URL}"
setpath "product" "keyboardShortcutsUrlLinux" "https://go.microsoft.com/fwlink/?linkid=832144"
setpath "product" "keyboardShortcutsUrlMac" "https://go.microsoft.com/fwlink/?linkid=832143"
setpath "product" "keyboardShortcutsUrlWin" "https://go.microsoft.com/fwlink/?linkid=832145"
setpath "product" "licenseUrl" "${REPO_URL}/blob/main/LICENSE"
setpath_json "product" "linkProtectionTrustedDomains" '["https://open-vsx.org", "https://github.com", "https://mute-mouse-67d8.yousseframadan2211.workers.dev"]'
setpath "product" "releaseNotesUrl" "${REPO_URL}/releases"
setpath "product" "reportIssueUrl" "${REPO_URL}/issues/new"
setpath "product" "requestFeatureUrl" "${REPO_URL}/issues"
setpath "product" "tipsAndTricksUrl" "${SITE_URL}"
setpath "product" "twitterUrl" "${SITE_URL}"

if [[ "${DISABLE_UPDATE}" != "yes" ]]; then
  # static JSON files served from the `updates` branch of this repository (no server needed)
  setpath "product" "updateUrl" "https://raw.githubusercontent.com/${GH_REPO_PATH}/refs/heads/updates"
  setpath "product" "downloadUrl" "${REPO_URL}/releases"
fi

setpath "product" "nameShort" "NexCode"
setpath "product" "nameLong" "NexCode"
setpath "product" "applicationName" "nexcode"
setpath "product" "dataFolderName" ".nexcode"
setpath "product" "linuxIconName" "nexcode"
setpath "product" "quality" "stable"
setpath "product" "urlProtocol" "nexcode"
setpath "product" "serverApplicationName" "nexcode-server"
setpath "product" "serverDataFolderName" ".nexcode-server"
setpath "product" "darwinBundleIdentifier" "com.nexcode.app"
setpath "product" "win32AppUserModelId" "Nexcode.NexCode"
setpath "product" "win32DirName" "NexCode"
setpath "product" "win32MutexName" "nexcode"
setpath "product" "win32NameVersion" "NexCode"
setpath "product" "win32RegValueName" "NexCode"
setpath "product" "win32ShellNameShort" "NexCode"
setpath "product" "win32AppId" "{{2C59EBC3-5C2C-42F2-B172-5FFFE5C98383}"
setpath "product" "win32x64AppId" "{{40CAF69A-A573-4A12-89F6-B4EDD22F89A4}"
setpath "product" "win32arm64AppId" "{{6F3229F8-7F02-484E-8BAE-3C1B6C5DDF0A}"
setpath "product" "win32UserAppId" "{{62950EC9-8AEE-4EB1-90CB-E49E2BECA08E}"
setpath "product" "win32x64UserAppId" "{{BCBFADE6-7C5B-4487-90D3-63BBABC23662}"
setpath "product" "win32arm64UserAppId" "{{66BFDD21-40FF-44EA-96AC-68D23A3BE193}"
setpath "product" "tunnelApplicationName" "nexcode-tunnel"
setpath "product" "win32TunnelServiceMutex" "nexcode-tunnelservice"
setpath "product" "win32TunnelMutex" "nexcode-tunnel"
setpath "product" "win32ContextMenu.x64.clsid" "2AA2440A-0B42-4175-8E37-BC3CBFFDE2A8"
setpath "product" "win32ContextMenu.arm64.clsid" "8CEF76C8-4CE6-47FB-A95F-C9586F958857"

setpath_json "product" "tunnelApplicationConfig" '{}'

jsonTmp=$( jq -s '.[0] * .[1]' product.json ../product.json )
echo "${jsonTmp}" > product.json && unset jsonTmp

cat product.json
# }}}

# {{{ apply patches

echo "APP_NAME=\"${APP_NAME}\""
echo "APP_NAME_LC=\"${APP_NAME_LC}\""
echo "ASSETS_REPOSITORY=\"${ASSETS_REPOSITORY}\""
echo "BINARY_NAME=\"${BINARY_NAME}\""
echo "GH_REPO_PATH=\"${GH_REPO_PATH}\""
echo "GLOBAL_DIRNAME=\"${GLOBAL_DIRNAME}\""
echo "ORG_NAME=\"${ORG_NAME}\""
echo "TUNNEL_APP_NAME=\"${TUNNEL_APP_NAME}\""

if [[ "${DISABLE_UPDATE}" == "yes" ]]; then
  apply_patch ../patches/00-update-disable.patch.yet
fi

for file in ../patches/*.json; do
  if [[ -f "${file}" ]]; then
    apply_actions "${file}"
  fi
done

for file in ../patches/*.patch; do
  if [[ -f "${file}" ]]; then
    apply_patch "${file}"
  fi
done

if [[ -d "../patches/${OS_NAME}/" ]]; then
  for file in "../patches/${OS_NAME}/"*.patch; do
    if [[ -f "${file}" ]]; then
      apply_patch "${file}"
    fi
  done
fi

for file in ../patches/user/*.patch; do
  if [[ -f "${file}" ]]; then
    apply_patch "${file}"
  fi
done
# }}}

# {{{ NexCode built-in extension (run button, templates, GitHub, languages...)
rm -rf extensions/nexcode-core
cp -r ../extensions/nexcode-core extensions/nexcode-core
rm -rf extensions/nexcode-core/test
# optional: bake your GitHub OAuth App client id (Device Flow) into the default setting
if [[ -n "${NEXCODE_GITHUB_CLIENT_ID}" ]]; then
  jq --arg v "${NEXCODE_GITHUB_CLIENT_ID}" '.contributes.configuration.properties["nexcode.github.clientId"].default = $v' \
    extensions/nexcode-core/package.json > extensions/nexcode-core/package.json.tmp
  mv extensions/nexcode-core/package.json.tmp extensions/nexcode-core/package.json
fi
# }}}

set -x

# {{{ install dependencies
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

if [[ "${npm_config_arch}" == "arm" ]]; then
  export npm_config_arm_version=7
fi

node build/npm/preinstall.ts

mv .npmrc .npmrc.bak
cp ../npmrc .npmrc

for i in {1..5}; do # try 5 times
  npm ci && break

  if [[ $i == 5 ]]; then
    echo "Npm install failed too many times" >&2
    exit 1
  fi
  echo "Npm install failed $i, trying again..."

  sleep $(( 15 * (i + 1)))
done

mv .npmrc.bak .npmrc
# }}}

# package.json
cp package.json{,.bak}

setpath "package" "version" "${RELEASE_VERSION%-insider}"

replace 's|Microsoft Corporation|NexCode|' package.json
replace "s|--max-old-space-size=8192|--max-old-space-size=${MAX_OLD_SPACE_SIZE}|" package.json

cp resources/server/manifest.json{,.bak}
setpath "resources/server/manifest" "name" "NexCode"
setpath "resources/server/manifest" "short_name" "NexCode"

# announcements
replace "s|\\[\\/\\* BUILTIN_ANNOUNCEMENTS \\*\\/\\]|$( tr -d '\n' < ../announcements-builtin.json )|" src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.ts

../undo_telemetry.sh

replace 's|Microsoft Corporation|NexCode|' build/lib/electron.ts
replace 's|([0-9]) Microsoft|\1 NexCode|' build/lib/electron.ts

# code.iss (Windows installer)
sed -i "s|https://code.visualstudio.com|${SITE_URL}|" build/win32/code.iss
sed -i 's|Microsoft Corporation|NexCode|' build/win32/code.iss

cd ..
