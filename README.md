# Vaultbreak — The Meridian Job

[![make.fun competition](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![make.fun rank](https://make.fun/badge/best-heist-game-20261122-0559/ukyo9k/vaultbreak-meridian-job/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![make.fun reward](https://make.fun/badge/best-heist-game-20261122-0559/ukyo9k/vaultbreak-meridian-job/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

A top-down heist game, built for the [make.fun best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559). One room: the Meridian Bank vault floor at night. Slip in through the service door, cross the floor past three patrolling guards (Mara, Drex, Vex) and three sweeping wall cameras, crack the glass case at the vault's heart, steal the Meridian Diamond, pocket what side loot you can, and walk out the green getaway door — before the alarm hits 100 and the vault locks down.

## How to play

Serve the game (any static server works) and open it in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak (slower, harder to spot) |
| Click the floor | Throw a coin — guards in earshot investigate (3 coins) |
| Q | EMP burst — every camera goes dark for ~6 s (2 bursts) |
| E (hold) | Crack the glass case (~1.8 s) |
| Space | Start |
| P / Esc | Pause |
| M | Sound on/off |
| R | Retry after win or caught |

The alarm meter climbs while a guard or camera sees you — faster the closer the watcher is, halved while you sneak or stand in a deep-shadow patch — and cools while you stay hidden. At 100 the vault locks down. A guard who catches you mid-chase ends the job on the spot.

Score: the diamond is 500, each piece of side loot (gold bars, cash stack, black ledger) is 100, and a fast escape adds a time bonus.

## File layout

```
game/
  index.html        page shell (1280x800 canvas)
  style.css         page around the canvas
  src/
    config.js       every number the game balances on
    level.js        the room: walls, vault, crates, shadows, loot, door
    guards.js       Mara, Drex, Vex — patrol, suspicion, chase, investigate
    cameras.js      sweeping wall cameras and the EMP blackout
    player.js       the thief — move, sneak, coins, EMP, cracking the case
    alarm.js        the 0–100 alarm meter
    audio.js        WebAudio-synthesised sounds, no audio files
    render.js       everything the eye sees, screens included
    shots.js        frozen staged scenes behind ?scene=
    input.js        keyboard and mouse
    main.js         boot, the one loop, the debug handle
main.ts             hand-in program: copies game/ + screenshots/ to /output,
                    writes /output/dossier.json (MAKEFUN_OUTPUT_DIR outside
                    the grader)
serve.ts            tiny local static server for development
screenshots/       real renders of the game's own code in a browser
vendor/
  makefun-game.ts   the kit's copy, unchanged
```

Staged scenes for screenshots: `?scene=cover` (mid-heist inside the vault), `?scene=patrol` (the room at rest), `?scene=alarm` (spotted, meter high), `?scene=win` (the getaway). `window.__vaultbreak` is the debug handle (`state`, `teleport`, `setAlarm`, `start`, `reset`, `score`).

Everything is original work — original names, art drawn in code, and sounds synthesised in the browser. No libraries, no network requests, no audio or image files.
