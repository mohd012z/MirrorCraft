import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
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
const gradle = read("android/app/build.gradle");
const workflow = read(".github/workflows/android-apk.yml");

expectContains(main, "androidx.webkit.WebViewAssetLoader", "MainActivity import");
expectContains(main, "WebViewAssetLoader.DEFAULT_DOMAIN", "official asset host");
expectContains(main, "new WebViewAssetLoader.AssetsPathHandler(this)", "APK asset path handler");
expectContains(main, ".addPathHandler(\"/assets/\"", "asset URL mount");
expectContains(main, "assetLoader.shouldInterceptRequest", "resource interception");
expectContains(main, "/assets/studio/", "Studio launch path");
expectNotContains(main, 'APP_HOST = "app.local"', "legacy synthetic host");

expectContains(gradle, 'implementation "androidx.webkit:webkit:', "AndroidX WebKit dependency");
expectContains(workflow, 'MIRRORCRAFT_PAGES_BASE_PATH: "/assets"', "APK Next base path");

console.log("Android WebView runtime contract: PASS");
