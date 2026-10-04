import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function readRequired(path, label) {
  if (!fs.existsSync(path)) {
    throw new Error(`${label}: missing file ${path}`);
  }
  return read(path);
}

function expectContains(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

function expectNotContains(text, needle, label) {
  if (text.includes(needle)) {
    throw new Error(`${label}: forbidden legacy token ${needle}`);
  }
}

const main = read("android/app/src/main/java/com/msa/mirrorcraft/MainActivity.java");
const studioPage = read("src/app/studio/page.tsx");
const gradle = read("android/app/build.gradle");
const gradleProperties = readRequired("android/gradle.properties", "AndroidX project configuration");
const workflow = read(".github/workflows/android-apk.yml");

expectContains(main, "androidx.webkit.WebViewAssetLoader", "MainActivity import");
expectContains(main, "WebViewAssetLoader.DEFAULT_DOMAIN", "official asset host");
expectContains(main, "new WebViewAssetLoader.AssetsPathHandler(this)", "APK asset path handler");
expectContains(main, ".addPathHandler(\"/assets/\"", "asset URL mount");
expectContains(main, "assetLoader.shouldInterceptRequest", "resource interception");
expectContains(main, "/assets/studio/index.html", "Studio launch path");
expectNotContains(main, 'APP_HOST = "app.local"', "legacy synthetic host");

expectContains(main, "reportStudioReady()", "native hydration bridge");
expectContains(main, 'Log.i("MirrorCraftRuntime", "STUDIO_READY")', "native ready evidence");
expectContains(studioPage, "reportStudioReady", "React hydration handshake");

expectContains(gradle, 'implementation "androidx.webkit:webkit:', "AndroidX WebKit dependency");
expectContains(gradleProperties, "android.useAndroidX=true", "AndroidX project flag");
expectContains(workflow, 'MIRRORCRAFT_PAGES_BASE_PATH: "/assets"', "APK Next base path");

console.log("Android WebView runtime contract: PASS");
