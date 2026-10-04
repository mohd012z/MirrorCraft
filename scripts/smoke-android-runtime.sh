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

adb exec-out screencap -p > MirrorCraft-runtime.png || true
adb shell uiautomator dump /sdcard/mirrorcraft-window.xml >/dev/null 2>&1 || true
adb pull /sdcard/mirrorcraft-window.xml MirrorCraft-window.xml >/dev/null 2>&1 || true
adb logcat -d > MirrorCraft-runtime.log || true

if [ -f MirrorCraft-window.xml ] && grep -Fq 'Loading studio' MirrorCraft-window.xml; then
  echo "Studio is still stuck on the loading fallback" >&2
  exit 1
fi

if [ "$ready" -ne 1 ]; then
  echo "React/CSS Studio readiness handshake was not observed" >&2
  tail -250 MirrorCraft-runtime.log || true
  exit 1
fi

echo "Android runtime smoke: STUDIO_READY"
