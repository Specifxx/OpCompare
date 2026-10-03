// Light/dark: dark is the default; the toggle stores "light" or "dark" in
// localStorage and stamps data-theme on <html>. The boot script runs before
// first paint so a light-theme visitor never sees a dark flash.
export const THEME_KEY = "op:theme";
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;
