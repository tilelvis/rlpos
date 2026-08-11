// Entry point for the Raicilabs POS desktop wrapper.
//
// This app needs no custom Rust commands: it's a self-contained SPA that
// persists everything to localStorage inside the WebView, exactly like
// the browser/PWA build. Tauri's only job here is to host the bundled
// `dist/` output (see tauri.conf.json -> build.frontendDist) in a native
// window, with no browser chrome and no local web server required.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Raicilabs POS");
}
