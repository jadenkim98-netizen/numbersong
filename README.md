# Numbersong — quick start

## Give students access
The app is live on GitHub Pages at
https://jadenkim98-netizen.github.io/numbersong/ — served from the committed
`docs/` folder on the `main` branch. Share that URL. Students on phones: open
it, then "Add to Home Screen" — it behaves like an app. Progress saves on
their device automatically.

To publish a change: run `./build.sh` (rebuilds `index.html` and copies it into
`docs/`), then commit and push to `main`. GitHub Pages redeploys on its own —
no manual upload step.

## Work on it with Claude Code
1. Put this folder somewhere permanent (e.g. ~/Projects/numbersong)
2. In Terminal:  cd ~/Projects/numbersong  then run:  claude
3. Claude Code reads CLAUDE.md and knows the whole project.
   Ask for changes, then run ./build.sh and refresh index.html
   in your browser to hear them.

## Folder contents
- index.html   the app itself (already built; local preview — gitignored)
- docs/        the committed build GitHub Pages serves (the live site)
- src/         the source code (the only thing you/Claude edit)
- voice/       your tuned voice recordings
- build.sh     rebuilds index.html from src + voice, copies into docs/ and dist/
- CLAUDE.md    project guide for Claude Code
