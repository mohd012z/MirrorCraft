#!/usr/bin/env bash
set -euo pipefail

APK="MirrorCraft-debug.apk"
PACKAGE="com.msa.mirrorcraft"
ACTIVITY="$PACKAGE/.MainActivity"

if [ ! -f "$APK" ]; then
  echo "Missing $APK" >&2
  exit 1
fi

adb install -r "$APK"
adb logcat -c
adb shell am force-stop "$PACKAGE"
adb shell am start -W -n "$ACTIVITY"

ready=0
for attempt in $(seq 1 45); do
  if adb logcat -d -s MirrorCraftRuntime:I '*:S' | grep -Fq 'STUDIO_READY'; then
    ready=1
    break
  fi
  sleep 2
done

if [ "$ready" -ne 1 ]; then
  adb logcat -d > MirrorCraft-runtime.log || true
  echo "React/CSS Studio readiness handshake was not observed" >&2
  tail -250 MirrorCraft-runtime.log || true
  exit 1
fi

# The native handshake can happen while Android's compositor/accessibility tree
# is catching up. Require actual Studio controls to be present and the fallback
# to be gone before accepting a screenshot as runtime evidence.
ui_ready=0
for attempt in $(seq 1 30); do
  adb shell uiautomator dump /sdcard/mirrorcraft-window.xml >/dev/null 2>&1 || true
  adb pull /sdcard/mirrorcraft-window.xml MirrorCraft-window.xml >/dev/null 2>&1 || true

  if [ -f MirrorCraft-window.xml ] \
    && ! grep -Fq 'Loading studio' MirrorCraft-window.xml \
    && grep -Fq 'Project home' MirrorCraft-window.xml \
    && grep -Fq 'Preview' MirrorCraft-window.xml; then
    ui_ready=1
    break
  fi
  sleep 1
done

adb logcat -d > MirrorCraft-runtime.log || true

if [ "$ui_ready" -ne 1 ]; then
  echo "Studio controls never became visible after hydration" >&2
  if [ -f MirrorCraft-window.xml ]; then
    grep -o 'text="[^"]*"' MirrorCraft-window.xml | head -80 || true
  fi
  exit 1
fi

# Give the compositor one extra frame window after accessibility confirms the
# real Studio controls, then capture what a user actually sees.
sleep 1
adb exec-out screencap -p > MirrorCraft-runtime.png

# Final post-capture guard: the accepted UI evidence must still be the Studio,
# not the Suspense loading shell.
adb shell uiautomator dump /sdcard/mirrorcraft-window.xml >/dev/null 2>&1 || true
adb pull /sdcard/mirrorcraft-window.xml MirrorCraft-window.xml >/dev/null 2>&1 || true
if grep -Fq 'Loading studio' MirrorCraft-window.xml; then
  echo "Studio regressed to the loading fallback" >&2
  exit 1
fi
if ! grep -Fq 'Project home' MirrorCraft-window.xml || ! grep -Fq 'Preview' MirrorCraft-window.xml; then
  echo "Studio controls disappeared before final evidence capture" >&2
  exit 1
fi

echo "Android runtime smoke: STUDIO_READY + REAL_UI_VISIBLE"
