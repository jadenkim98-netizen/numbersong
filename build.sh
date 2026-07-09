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

# 3) Assemble the standalone index.html with embedded voice recordings
python3 - << 'EOF'
import base64, json
js = open(".app.compiled.js").read()
assert "</script" not in js
voices = json.dumps({str(base): {str(i): base64.b64encode(open(f"voice/{base}/{i}.mp3","rb").read()).decode() for i in range(1, 9)} for base in (0, 4, 8)})
icon_data = "data:image/png;base64," + base64.b64encode(open("icon.png","rb").read()).decode()
logo_data = "data:image/png;base64," + base64.b64encode(open("wejam.png","rb").read()).decode()
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
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Numbersong — Ear Training</title>
<meta name="theme-color" content="#383D3B">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Numbersong">
<link rel="apple-touch-icon" href="{icon_data}">
<link rel="icon" type="image/png" href="{icon_data}">
<link rel="manifest" href="manifest.json">
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
<style>
  body {{ margin: 0; background: #383D3B; }}
  #root:empty::after {{
    content: "Loading… (this needs an internet connection the first time)";
    display: block; padding: 40px 20px; font-family: system-ui, sans-serif; color: #A9B3AC;
  }}
  #errbox {{
    display: none; position: fixed; inset: auto 12px 12px 12px; z-index: 999;
    background: #E07856; color: #3A241B; padding: 12px 16px; border-radius: 10px;
    font: 13px/1.5 ui-monospace, monospace; white-space: pre-wrap;
  }}
</style>
</head>
<body>
<div id="root"></div>
<div id="errbox"></div>
<script>
  window.onerror = function (msg, srcUrl, line) {{
    var b = document.getElementById("errbox");
    b.style.display = "block";
    b.textContent = "Something went wrong:\\n" + msg + " (line " + line + ")";
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
</script>
<script>
{js}
</script>
</body>
</html>
'''
open("index.html", "w").write(html)
print("index.html built — open it in a browser or deploy it")
EOF
rm -f .app.jsx .app.compiled.js

# 4) Assemble a clean publish folder (this is what Netlify serves)
mkdir -p dist
cp index.html manifest.json icon.png dist/
