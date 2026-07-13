# Bassil (Undertone Caves) — ready-to-integrate content (Fable draft)

Creative content for the Stage-4 minor-chord tutorial. Pairs with `BASSIL_TUTORIAL_PLAN.md`
(design/spec) and mirrors how Rue's content was integrated. **Integrate after Sylva/Stage-3
lands** (reuses her chord-drill chassis with home=6, pool=`FOUR_MINOR`). Angle brackets below
are real JSX.

## 1 — `bassilBeats` (8 beats)  [format matches `rueBeats`]

```jsx
const bassilBeats = [
  { title: "Undertone Caves", cue: null,
    hear: { label: "▶ Hear the 6 chord", act: () => {/* walk+ring vi (6·1·3), low, long ring */} },
    lines: <>Careful on the steps, traveler — the dark comes quick down here. You've found the <b className="hl-g">Undertone Caves</b>, and I'm <b className="hl-t">Bassil</b>. Leave your eyes at the door; your <b className="hl-t">ears</b> never needed light. Down here the chords go <b className="hl-g">dark</b> — the same four friends from up in the sun, gathered close around <b className="hl-t">6</b>. Listen deep.</>,
    stage: null /* cave scene behind an empty/ambient stage — mirror of Sylva beat 1 */ },

  { title: "Nothing new in the dark", cue: null,
    lines: <>Nothing new grows in the dark. <b className="hl-g">Chords are numbers, stacked</b> — Sylva showed you that in her glass. And <b className="hl-t">home is 6</b> — Old Rue taught you that in the fen. Set the two together, and there's the cave's first chord: <b className="hl-g">6, 1, 3</b>, ringing at once. That's <b className="hl-t">home itself</b>, standing in the dark.</>,
    stage: null /* GuideStack of 6 chord (6·1·3 circled), 6 home-teal; tap number→voice, name→chord */ },

  { title: "One ladder, every chord", cue: null,
    lines: <>Same ladder Verda gave you — <b className="hl-t">seven rungs</b>, not one more. Every chord down here lands on it, just as they do up in the light; a chord is only <b className="hl-g">which rungs ring</b>. Learn the ladder once, and the dark holds no new chords for you — only your seven, gathered a different way.</>,
    stage: null /* 7-rung stack; ▶ buttons light the four minor chords in turn: 6·1·3→2·4·6→3·5·7→4·6·1 */ },

  { title: "Home rings in the dark", cue: null,
    lines: <>Some folk name a chord's voices <em>root, third, fifth</em> — counted from the chord, never from the key — and so they walk right past <b className="hl-t">home</b> when it hides. Feel the <b className="hl-g">2 chord</b>: <b className="hl-g">2, 4, and 6</b>. Count the old way and that last voice is only "the <b>fifth</b>" — a stranger in the dark. But the ladder names it true: it's <b className="hl-t">6</b>. <b className="hl-t">Home</b>, ringing deep inside the 2 — and counting from the root, you'd never have felt it there.</>,
    stage: null /* 2-chord stack (2·4·6 circled), 6 glowing teal; label flips "5th"(struck)→"6 · home". Identity language only */ },

  { title: "Feel the floor", cue: null,
    lines: <>Down here you don't look — you <b className="hl-t">feel</b>. Never meet a chord head-on. <b className="hl-g">Walk it</b> first, foot by foot from the floor up… then stand still and let it <b className="hl-g">ring</b>, all at once. Nothing changed between the two; you only stopped walking. The dark does the rest.</>,
    stage: null /* 6-chord stack, paired ▶ Walk it (arp low→high) / ▶ Ring it (block). Must press both */ },

  { title: "Kin, even in the dark", cue: null,
    lines: <>Now the ladder's deepest gift: even blind, you can feel a chord's <b className="hl-t">family</b>. Set <b className="hl-t">home</b> — the 6 — beside the <b className="hl-g">4</b>. Two of their three rungs land on the very same numbers: <b className="hl-g">6 and 1</b>. Shared blood. Move a single voice of home, and the 4 is standing there instead. Chords aren't strangers, traveler — they're <b className="hl-t">kin</b>, and the dark can't hide how close.</>,
    stage: null /* 6-stack & 4-stack side by side, glowing strand linking shared 6 and 1, pulsing */ },

  { title: "The four deep chords", cue: null,
    lines: <>Four chords do the singing down here: <b className="hl-g">6, 2, 3, 4</b>. The <b className="hl-t">6</b> rests — <b className="hl-t">home</b>, low and easy. <b className="hl-g">2</b> steps out into the deep and waits. <b className="hl-g">3</b> leans hardest for home — the held breath before you walk back in. And <b className="hl-g">4</b> — the one that carries a little <b className="hl-t">light</b> down with it. Sylva's kind of chord, wandered below; home lives right inside it.</>,
    stage: null /* four stacks (6·1·3/2·4·6/3·5·7/4·6·1) + ▶ 6→2→6 and ▶ 3→6; home glows teal on arrival */ },

  { title: "Read the dark", cue: null,
    lines: <>Enough of my talk — the dark is for listening. I'll <b className="hl-g">walk</b> a chord, then let it <b className="hl-g">ring</b>, and you'll answer on the <b className="hl-g">stack</b>: tap the numbers you feel. Wrong stones cost you nothing; the cave forgives — it only asks you to listen deeper. Three tries with me, and we start at <b className="hl-t">home</b>.</>,
    stage: null /* demo — Bassil plays 6 chord (walk+ring); stack circles 6·1·3 by itself */ },
];
```

## 2 — 3 coached-drill lines
Titles: `"Listen…"` / `"You felt it!"`; answer phase = `"Which number?"` (Drill 1) but **`"Which numbers?"`** (Drills 2–3, multi-pick) — a small chassis tweak worth making.

```jsx
const bassilDrill = [
  // Drill 1 — The Ground Voice (walk→ring · tap ONE: root = first/lowest HEARD, not stack-bottom)
  { listen: <>Softly, now. I'll <b className="hl-g">walk</b> it from the floor up, then let it <b className="hl-g">ring</b>. Fix on the <b className="hl-t">first voice</b> — the lowest one, the stone the rest are stacked on.</>,
    prompt: <>Which number sang <b className="hl-t">first and lowest</b>? That's the <b className="hl-g">root</b> — tap it.</>,
    reveal: <>Not that stone — no shame; the cave only asks you to listen again. The first, lowest voice is glowing. Let your ear sink <b className="hl-t">down</b> to it.</>,
    win:    <>You found the floor — and the floor is the chord's <b className="hl-g">name</b>, measured from <b className="hl-t">home</b>.</> },
  // Drill 2 — Two Stones Up (root pre-circled "given" · tap the OTHER TWO)
  { listen: <>This time I give you the floor — see it, already circled. <b className="hl-g">Walk</b> with me, then stand in the ring and feel for the <b className="hl-t">two voices above it</b>.</>,
    prompt: <>Two rungs are still dark. Which two numbers are ringing? Tap them <b className="hl-g">both</b>.</>,
    reveal: <>Close — one voice slipped into the dark. Here it is alone… now inside the chord. Hear it? It was there all along.</>,
    win:    <>Both, clean. You're not guessing anymore — you're <b className="hl-g">standing inside the chord</b>, turning your ear.</> },
  // Drill 3 — Deep and Clear (BLOCK first · ▶ Walk it help, no penalty · tap all THREE)
  { listen: <>Last one — I'll ring it <b className="hl-t">all at once</b>, the way songs give it. If the dark blurs, don't fight it: tap <b className="hl-g">Walk it</b> and I'll take you down, stone by stone.</>,
    prompt: <>Three voices, each on its own floor. Tap <b className="hl-g">all three numbers</b>.</>,
    reveal: <>Almost — one stone's still in shadow. Listen while I walk it; the missing voice is glowing. Breathe, and feel again.</>,
    win:    <><b className="hl-g">Deep ears.</b> The caves will sing about this.</> }, // canon win, verbatim
];
```

## 3 — send-off
Stage title: **The caves are yours** · Button: **Into the deep ▸**
```jsx
<>The <b className="hl-g">Undertone Caves</b> are yours to wander, traveler. <b className="hl-g">Walk</b> a chord when the dark blurs; let it <b className="hl-g">ring</b> when you're steady. Nothing down here was ever new — only your seven numbers, gathered close around <b className="hl-t">6</b>. And when you can feel every voice standing on its floor, the <b className="hl-t">Right Wing of Excalibar</b> waits below — cool and heavy, the blade's other half. No edge is balanced by its bright side alone.</>
```

## 4 — name-tab
```
Bassil the Deep
```

## 5 — `.tut-cave` scene
Markup (tut-scene branch for `tutChapter === "chordsMinor"`):
```jsx
<div className="tut-scene" aria-hidden="true">
  <div className="ceiling" />
  <div className="stalactite s1" /><div className="stalactite s2" /><div className="stalactite s3" />
  <div className="wall far" /><div className="wall" />
  <div className="pool" />
  <div className="drip d1" /><div className="drip d2" />
  <div className="floor" />
  <div className="stalagmite g1" /><div className="stalagmite g2" />
  <div className="crystal x1" /><div className="crystal x2" /><div className="crystal x3" />
  <div className="lantern" />
</div>
```

CSS — paste into `retro/retro.css` after the `.tut-fen` block:
```css
/* =====================  TUTORIAL (Bassil) — Undertone Caves scene  ========== */
.app.tutorial.tut-cave{
  background:linear-gradient(#10151C 0%,#161D24 18%,#1B2426 34%,#182120 48%,#121A19 66%,#0A0F0E 100%);
}
.tut-cave .ceiling{ position:absolute; top:0; left:0; right:0; height:12%;
  background:
    repeating-linear-gradient(90deg, rgba(86,93,89,.16) 0 2px, transparent 2px 12px),
    linear-gradient(#232B2E,#161E20); }
.tut-cave .ceiling::after{ content:""; position:absolute; left:0; right:0; bottom:-5px; height:5px;
  background:repeating-linear-gradient(90deg,#161E20 0 13px,transparent 13px 24px); }
.tut-cave .stalactite{ position:absolute; top:12%; width:14px; height:34px; background:#232B2E;
  clip-path:polygon(0 0,100% 0,100% 30%,79% 30%,79% 60%,57% 60%,57% 100%,43% 100%,43% 60%,21% 60%,21% 30%,0 30%); }
.tut-cave .stalactite.s1{ left:16%; }
.tut-cave .stalactite.s2{ left:46%; height:24px; width:11px; opacity:.8; }
.tut-cave .stalactite.s3{ right:14%; height:42px; }
.tut-cave .wall{ position:absolute; left:-10%; right:-12%; bottom:46%; height:14%;
  background:#1E2828; border-radius:46% 54% 0 0; opacity:.85; }
.tut-cave .wall.far{ bottom:52%; height:10%; left:16%; right:-25%; background:#283239; opacity:.55; }
.tut-cave .pool{ position:absolute; left:0; right:0; bottom:16%; height:30%;
  background:
    repeating-linear-gradient(0deg, rgba(124,173,209,.08) 0 2px, transparent 2px 14px),
    linear-gradient(#1C2A2E,#121C1D 70%,#0C1313); }
.tut-cave .pool::after{ content:""; position:absolute; top:6%; left:23%; width:18px; height:52%;
  background:repeating-linear-gradient(0deg, rgba(87,198,196,.18) 0 2px, transparent 2px 9px); }
.tut-cave .drip{ position:absolute; width:2px; height:5px; background:#7CADD1; opacity:0;
  box-shadow:0 0 4px rgba(124,173,209,.35); animation:cave-drip 6.5s linear infinite; }
.tut-cave .drip.d1{ top:calc(12% + 34px); left:calc(16% + 6px); }
.tut-cave .drip.d2{ top:calc(12% + 42px); right:calc(14% + 6px); animation-duration:9s; animation-delay:-4.2s; }
@keyframes cave-drip{
  0%   { transform:translateY(0) scaleY(.4); opacity:0 }
  40%  { transform:translateY(0) scaleY(.9); opacity:.85 }
  48%  { transform:translateY(0) scaleY(1.4); opacity:.9 }
  70%  { transform:translateY(36vh) scaleY(1.4); opacity:.85 }
  74%,100%{ transform:translateY(37vh) scaleY(.3); opacity:0 }
}
.tut-cave .floor{ position:absolute; left:0; right:0; bottom:0; height:16%;
  background-image:
    repeating-linear-gradient(0deg, rgba(6,10,9,.28) 0 2px, transparent 2px 12px),
    repeating-linear-gradient(90deg, rgba(6,10,9,.18) 0 2px, transparent 2px 12px),
    linear-gradient(#232B28,#111614); }
.tut-cave .floor::before{ content:""; position:absolute; left:0; right:0; top:-4px; height:4px;
  background:repeating-linear-gradient(90deg,#1C2A2E 0 11px,#121C1D 11px 22px); }
.tut-cave .stalagmite{ position:absolute; width:12px; height:24px; background:#2A3331;
  clip-path:polygon(42% 0,58% 0,58% 38%,79% 38%,79% 70%,100% 70%,100% 100%,0 100%,0 70%,21% 70%,21% 38%,42% 38%); }
.tut-cave .stalagmite.g1{ bottom:15%; left:7%; }
.tut-cave .stalagmite.g2{ bottom:4%; right:9%; height:17px; width:9px; opacity:.85; }
.tut-cave .crystal{ position:absolute; width:3px; height:3px; background:var(--teal,#57C6C4);
  box-shadow:
    0 -3px var(--teal,#57C6C4), 3px 0 rgba(87,198,196,.75), -3px 0 rgba(87,198,196,.5),
    0 -6px rgba(87,198,196,.45), 0 0 9px 2px rgba(87,198,196,.4);
  animation:cave-glint 7s ease-in-out infinite; }
.tut-cave .crystal.x1{ bottom:47%; left:23%; }
.tut-cave .crystal.x2{ top:22%; right:24%; animation-delay:-2.4s; }
.tut-cave .crystal.x3{ bottom:8%; left:62%; animation-delay:-4.6s; transform:scale(.8); }
@keyframes cave-glint{ 0%,100%{ opacity:.4 } 50%{ opacity:1 } }
.tut-cave .lantern{ position:absolute; bottom:18%; left:11%; width:8px; height:10px; background:#D9B45B;
  box-shadow:
    0 -3px 0 -1px #565D59, 0 4px 0 -1px #565D59,
    0 0 14px 5px rgba(217,180,91,.45), 0 0 44px 22px rgba(217,180,91,.12);
  animation:cave-lantern 3.8s ease-in-out infinite; }
.tut-cave .lantern::after{ content:""; position:absolute; top:13px; left:-18px; width:44px; height:8px;
  background:radial-gradient(closest-side, rgba(217,180,91,.25), transparent); }
@keyframes cave-lantern{ 50%{ box-shadow:
  0 -3px 0 -1px #565D59, 0 4px 0 -1px #565D59,
  0 0 18px 7px rgba(217,180,91,.55), 0 0 52px 26px rgba(217,180,91,.16); } }
@media (prefers-reduced-motion:reduce){
  .tut-cave .drip,.tut-cave .crystal,.tut-cave .lantern{ animation:none!important; }
  .tut-cave .crystal{ opacity:.8; }
  .tut-cave .lantern{ box-shadow:0 -3px 0 -1px #565D59,0 4px 0 -1px #565D59,0 0 14px 5px rgba(217,180,91,.45); }
}
```

Notes: base `.drip` opacity 0 → drips vanish under reduced-motion; drip travel uses `36vh` for phone heights inside the fixed-inset root; teal reserved for crystals (tonic colour, echoing Rue's wisps), gold lantern = the "little light carried down" that rhymes with beat 7's 4-chord.
