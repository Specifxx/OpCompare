// Light/dark: LIGHT is the default (owner's call, 2026-10-03). The root layout
// renders <html data-theme="light">; the toggle stores "light" or "dark" in
// localStorage, and the boot script runs before first paint so a visitor who
// chose dark never sees a light flash.
export const THEME_KEY = "op:theme";
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light")}catch(e){}`;
