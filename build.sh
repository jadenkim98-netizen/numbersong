#!/bin/bash
# Numbersong build: compiles src/number-ear-trainer.jsx + voice/ into index.html
set -e
cd "$(dirname "$0")"

# 1) Prepare the component for browser use
python3 - << 'EOF'
src = open("src/number-ear-trainer.jsx").read()
src = src.replace('import React, { useState, useRef, useEffect, useCallback } from "react";\n', '')
src = src.replace('import * as Tone from "tone";\n', '')
src = src.replace('export default function NumberEarTrainer()', 'function NumberEarTrainer()')
prefix = 'const { useState, useRef, useEffect, useCallback } = React;\n\n'
suffix = '\n\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(NumberEarTrainer));\n'
open(".app.jsx", "w").write(prefix + src + suffix)
EOF

# 2) Compile JSX -> plain JS (esbuild fetched automatically the first time)
npx --yes esbuild .app.jsx --jsx=transform --format=iife --outfile=.app.compiled.js --charset=utf8
node --check .app.compiled.js

# 2b) Vendor the runtime libraries locally so the app needs no CDN — it then
#     works fully offline and on networks that block cdnjs (e.g. schools).
#     Downloaded once into vendor/ (committed), then reused on every build.
mkdir -p vendor
vend() { [ -s "vendor/$2" ] || curl -fsSL "$1" -o "vendor/$2"; }
vend https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js react.js
vend https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js react-dom.js
vend https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js tone.js

# 3) Assemble the standalone index.html with embedded voice recordings
python3 - << 'EOF'
import base64, json
js = open(".app.compiled.js").read()
assert "</script" not in js
voices = json.dumps({str(base): {str(i): base64.b64encode(open(f"voice/{base}/{i}.mp3","rb").read()).decode() for i in range(1, 9)} for base in (0, 4, 8)})
icon_data = "data:image/png;base64," + base64.b64encode(open("icon.png","rb").read()).decode()
logo_data = "data:image/png;base64," + base64.b64encode(open("wejam.png","rb").read()).decode()
coda_data = "data:image/png;base64," + base64.b64encode(open("coda.png","rb").read()).decode()
coda_med_data = "data:image/png;base64," + base64.b64encode(open("coda_meditate.png","rb").read()).decode()
coda_vic_data = "data:image/png;base64," + base64.b64encode(open("coda_victory.png","rb").read()).decode()
verda_data = "data:image/png;base64," + base64.b64encode(open("verda_final_south.png","rb").read()).decode()
verda_portrait_data = "data:image/png;base64," + base64.b64encode(open("verda_portrait_final.png","rb").read()).decode()
dojo_data = "data:image/png;base64," + base64.b64encode(open("dojo_final.png","rb").read()).decode()
map_baked_data = "data:image/png;base64," + base64.b64encode(open("map_baked.png","rb").read()).decode()
music_books_data = "data:image/png;base64," + base64.b64encode(open("music_books.png","rb").read()).decode()
def _png(p): return "data:image/png;base64," + base64.b64encode(open(p,"rb").read()).decode()
# Keeper art shown in the encounter modal, keyed by region node id. Region 1 = Verda's
# bust portrait; 2-4 = full-body keeper sprites. Regions 5-8 still fall back to the emoji.
keeper_art = json.dumps({
  "1": verda_portrait_data,
  "2": _png("keepers/portrait_rue.png"),
  "3": _png("keepers/portrait_sylva.png"),
  "4": _png("keepers/portrait_bassil.png"),
})
# Map hero: the shop-swappable Coda skins, each as 4 directional frames (s/n/e/w)
# so the hero faces the way he walks. "default" is the base look; gold/shadow/
# crimson/violet are purchasable in the shop.
_skins = {
  sid: {d: _png(f"skins/coda_{sid}_{d}.png") for d in ("s", "n", "e", "w")}
  for sid in ("default", "gold", "shadow", "crimson", "violet")
}
_skins["default"]["s"] = coda_data  # hand-made open-eyed classic face when idle / facing the viewer
coda_skins_data = json.dumps(_skins)
adventure = open("adventure/assets.js").read().replace("export const", "const").replace("export function", "function")
soundtrack = open("retro/soundtrack.js").read().replace("export const", "const")
assert "</script" not in soundtrack
assert "</script" not in adventure
retro_css = open("retro/retro.css").read().replace("__FONT_B64__", open("retro/pixelfont.b64").read().strip())
assert "</style" not in retro_css
def inline_js(path):
    # Escape the end-tag so an inlined library can't close the <script> early.
    return open(path).read().replace("</script", "<\\/script")
react_js     = inline_js("vendor/react.js")
react_dom_js = inline_js("vendor/react-dom.js")
tone_js      = inline_js("vendor/tone.js")
# PWA manifest for Android/Chrome install (folder deploys); iOS uses the meta tags below.
json.dump({
  "name": "Numbersong", "short_name": "Numbersong", "start_url": "./", "scope": "./",
  "display": "standalone", "orientation": "portrait",
  "background_color": "#383D3B", "theme_color": "#383D3B",
  "icons": [{"src": "icon.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}],
}, open("manifest.json", "w"))
html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Numbersong — Ear Training</title>
<meta name="theme-color" content="#383D3B">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Numbersong">
<link rel="apple-touch-icon" href="{icon_data}">
<link rel="icon" type="image/png" href="{icon_data}">
<link rel="manifest" href="manifest.json">
<script>
  // Apply theme + retro skin class BEFORE first paint so the app never flashes an
  // unstyled/non-retro frame that then reflows. The React effects reconcile these
  // same attributes later (idempotent) when the player changes them at runtime.
  (function () {{
    try {{
      var d = document.documentElement;
      d.setAttribute("data-theme", localStorage.getItem("numbersong-theme") || "dark");
      if (localStorage.getItem("numbersong-boring") !== "1") d.classList.add("retro");
    }} catch (e) {{}}
  }})();
</script>
<script>{react_js}</script>
<script>{react_dom_js}</script>
<script>{tone_js}</script>
<style>
  html, body {{ margin: 0; background: #383D3B; overscroll-behavior: none; }}
  /* Critical pre-mount layout: clamp the app column to the SAME 560px the mounted
     .app uses, so the first painted frame already matches — no width reflow. */
  #root {{ max-width: 560px; margin: 0 auto; }}
  #root:empty {{ min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
  #root:empty::after {{
    content: ""; width: 26px; height: 26px; border-radius: 50%;
    border: 3px solid rgba(237,242,238,.22); border-top-color: #57C6C4;
    animation: ns-boot-spin .8s linear infinite;
  }}
  @keyframes ns-boot-spin {{ to {{ transform: rotate(360deg); }} }}
  #errbox {{
    display: none; position: fixed; inset: auto 12px 12px 12px; z-index: 999;
    background: #E07856; color: #3A241B; padding: 12px 16px; border-radius: 10px;
    font: 13px/1.5 ui-monospace, monospace; white-space: pre-wrap;
  }}
</style>
<style id="retro-skin">
{retro_css}
</style>
</head>
<body>
<div id="root"></div>
<div id="errbox"></div>
<script>
  window.onerror = function (msg, srcUrl, line, col, err) {{
    var b = document.getElementById("errbox");
    b.style.display = "block";
    b.textContent = "Something went wrong:\\n" + msg + "\\n" + (srcUrl || "") + ":" + line + ":" + col +
      (err && err.stack ? "\\n\\n" + err.stack : "");
  }};
  window.addEventListener("unhandledrejection", function (ev) {{
    var b = document.getElementById("errbox");
    b.style.display = "block";
    b.textContent = "Something went wrong (async):\\n" + (ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason));
  }});
  window.addEventListener("load", function () {{
    if (!window.React || !window.ReactDOM || !window.Tone) {{
      var b = document.getElementById("errbox");
      b.style.display = "block";
      b.textContent = "Couldn't load the app libraries. Check your internet connection and refresh.";
    }}
  }});
</script>
<script>
window.SUNG_NUMBERS = {voices};
window.WEJAM_LOGO = "{logo_data}";
window.CODA_SPRITE = "{coda_data}";
window.CODA_SKINS = {coda_skins_data};
window.CODA_MEDITATE = "{coda_med_data}";
window.CODA_VICTORY = "{coda_vic_data}";
window.VERDA_SPRITE = "{verda_data}";
window.VERDA_PORTRAIT = "{verda_portrait_data}";
window.DOJO_SPRITE = "{dojo_data}";
window.MAP_BAKED = "{map_baked_data}";
window.MUSIC_BOOKS = "{music_books_data}";
window.KEEPER_ART = {keeper_art};
</script>
<script>
{adventure}
window.HARMONIA = HARMONIA;
window.HARMONIA_decodeMask = decodeMask;
{soundtrack}
window.SOUNDTRACK = SOUNDTRACK;
</script>
<script>
{js}
</script>
<script>
  // Register the service worker so the app is cached for full offline use.
  if ("serviceWorker" in navigator) {{
    window.addEventListener("load", function () {{
      navigator.serviceWorker.register("./sw.js").catch(function () {{}});
    }});
  }}
</script>
</body>
</html>
'''
open("index.html", "w").write(html)
print("index.html built — open it in a browser or deploy it")
EOF
rm -f .app.jsx .app.compiled.js

# 4) Emit the service worker with a unique version so each deploy refreshes
#    clients (the timestamped cache name invalidates the old shell on next launch).
SW_VERSION="$(date +%Y%m%d%H%M%S)"
sed "s/__SW_VERSION__/$SW_VERSION/" src/sw.js > sw.js

# 5) Assemble the publish folders.
#    dist/ = static-host drag-drop;  docs/ = GitHub Pages (deploy from branch).
mkdir -p dist docs
cp index.html manifest.json icon.png sw.js dist/
cp index.html manifest.json icon.png sw.js docs/
touch docs/.nojekyll   # tell GitHub Pages not to run Jekyll on our files
