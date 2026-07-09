# Numbersong — quick start

## Give students access (5 minutes)
1. Go to https://app.netlify.com/drop and make a free account
2. Drag this WHOLE FOLDER onto the page (it deploys index.html)
3. Share the URL it gives you. Students on phones: open it, then
   "Add to Home Screen" — it behaves like an app. Progress saves
   on their device automatically.
4. After any change: run ./build.sh, then drag the folder up again.

## Work on it with Claude Code
1. Put this folder somewhere permanent (e.g. ~/Projects/numbersong)
2. In Terminal:  cd ~/Projects/numbersong  then run:  claude
3. Claude Code reads CLAUDE.md and knows the whole project.
   Ask for changes, then run ./build.sh and refresh index.html
   in your browser to hear them.

## Folder contents
- index.html   the app itself (already built, ready to deploy)
- src/         the source code (the only thing you/Claude edit)
- voice/       your tuned voice recordings
- build.sh     rebuilds index.html from src + voice
- CLAUDE.md    project guide for Claude Code
