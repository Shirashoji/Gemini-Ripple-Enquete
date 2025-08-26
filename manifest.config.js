import { defineManifest } from "@crxjs/vite-plugin";
import { loadEnv } from "vite";

// 環境変数を明示的にロード
const env = loadEnv(process.env.NODE_ENV, process.cwd(), "VITE_");
const rippleLmsUrl = env.VITE_RIPPLE_LMS_URL;

export default defineManifest({
  manifest_version: 3,
  name: "Gemini Ripple Enquete Reviewer",
  version: "1.0.0",
  description: "Gemini APIを使用して、Rippleのアンケート内容をレビューします。",
  permissions: ["storage"],
  host_permissions: [
    rippleLmsUrl,
    "https://generativelanguage.googleapis.com/",
  ],
  icons: {
    16: "icons/png/icon16.png",
    48: "icons/png/icon48.png",
    128: "icons/png/icon128.png",
  },
  action: {
    default_popup: "src/popup/popup.html",
  },
  background: {
    service_worker: "src/service-worker.js",
    type: "module",
  },
  content_scripts: [
    {
      js: ["src/content.js"],
      matches: [rippleLmsUrl],
    },
  ],
});
