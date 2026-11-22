#!/usr/bin/env python3
"""Playtest for Vaultbreak — The Meridian Job.

Serves game/ on localhost, drives it in headless Chromium, checks the
gameplay flows end to end, and takes the four staged screenshots at exactly
1280x800. Every check must pass before the entry is handed back.
"""
import json
import os
import socket
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
GAME_URL = "http://127.0.0.1:8901"
SHOTS = [
    ("cover", "1-cover.jpg"),
    ("patrol", "2-patrol.jpg"),
    ("alarm", "3-alarm.jpg"),
    ("win", "4-getaway.jpg"),
]

RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append((name, bool(ok), detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {detail}")


def wait_port(port, timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except OSError:
            time.sleep(0.2)
    return False


def state(page):
    return page.evaluate("() => { const s = window.__vaultbreak.state; return {"
                         " x: s.player.x, y: s.player.y, coins: s.player.coins,"
                         " emps: s.player.emps, hasDiamond: s.player.hasDiamond,"
                         " loot: s.player.lootTaken, alarm: s.alarm.value,"
                         " score: s.score, dark: s.cameras[0].darkFor,"
                         " guards: s.guards.map(g => ({x: g.x, y: g.y, a: g.angle, s: g.state, susp: g.suspicion}))"
                         " }; }")


def status_text(page):
    return page.evaluate("() => document.getElementById('status').textContent")


def teleport_ahead_of_guard(page, guard_index):
    """Put the thief 120 px ahead of a guard's nose, facing his walk."""
    page.evaluate(
        """(i) => {
          const g = window.__vaultbreak.state.guards[i];
          const wp = g.waypoints[g.waypoint];
          const dx = wp.x - g.x, dy = wp.y - g.y;
          const d = Math.hypot(dx, dy) || 1;
          window.__vaultbreak.teleport(g.x + dx / d * 120, g.y + dy / d * 120);
        }""",
        guard_index,
    )


def main():
    from playwright.sync_api import sync_playwright

    server = subprocess.Popen(
        ["node", "serve.ts", "--port", "8901"],
        cwd=HERE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        if not wait_port(8901):
            print("server did not come up")
            return 1
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                executable_path=os.path.expanduser(
                    "~/.cache/ms-playwright/chromium_headless_shell-1228"
                    "/chrome-headless-shell-linux64/chrome-headless-shell"
                )
            )
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            errors = []
            failed_requests = []
            external_requests = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("requestfailed", lambda r: failed_requests.append(r.url))
            page.on(
                "request",
                lambda r: external_requests.append(r.url)
                if not r.url.startswith(GAME_URL)
                else None,
            )

            page.goto(GAME_URL, wait_until="networkidle")
            page.wait_for_timeout(500)
            check("page loads, debug handle present",
                  page.evaluate("() => !!window.__vaultbreak"))
            check("title screen shown",
                  "Press Space" in status_text(page), status_text(page))

            # Start the game.
            page.keyboard.press("Space")
            page.wait_for_timeout(300)
            check("Space starts play",
                  "Playing" in status_text(page), status_text(page))

            # Movement: walk right for a second.
            page.evaluate("() => window.__vaultbreak.teleport(200, 700)")
            before = state(page)
            page.keyboard.down("d")
            page.wait_for_timeout(1000)
            page.keyboard.up("d")
            after = state(page)
            dx = after["x"] - before["x"]
            check("movement walk speed", 150 < dx < 220, f"dx={dx:.0f}")

            # Sneak: same key with Shift is roughly half speed.
            page.keyboard.down("Shift")
            page.keyboard.down("d")
            page.wait_for_timeout(1000)
            page.keyboard.up("d")
            page.keyboard.up("Shift")
            sneaked = state(page)
            dx2 = sneaked["x"] - after["x"]
            check("movement sneak speed", 60 < dx2 < 130, f"dx={dx2:.0f}")

            # Side loot: walk over the gold bars.
            page.evaluate("() => window.__vaultbreak.teleport(205, 640)")
            page.wait_for_timeout(300)
            st = state(page)
            check("loot pickup", st["loot"] == 1 and st["score"] == 100,
                  f"loot={st['loot']} score={st['score']}")

            # Coin throw: click the floor, a coin leaves the pocket.
            page.mouse.click(400, 400)
            page.wait_for_timeout(400)
            st = state(page)
            check("coin throw", st["coins"] == 2, f"coins={st['coins']}")

            # EMP: Q darkens the cameras.
            page.keyboard.press("q")
            page.wait_for_timeout(200)
            st = state(page)
            check("EMP burst", st["emps"] == 1 and st["dark"] > 0,
                  f"emps={st['emps']} darkFor={st['dark']:.1f}")

            # Alarm climb: fresh patrol state, then stay in a guard's cone.
            page.evaluate("() => window.__vaultbreak.start()")
            page.wait_for_timeout(300)
            for _ in range(8):
                teleport_ahead_of_guard(page, 1)
                page.wait_for_timeout(250)
            st = state(page)
            check("alarm climbs when seen", st["alarm"] > 10,
                  f"alarm={st['alarm']:.1f}")

            # Diamond crack: fresh state, hold E beside the case.
            page.evaluate("() => window.__vaultbreak.start()")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__vaultbreak.teleport(640, 440)")
            page.keyboard.down("e")
            page.wait_for_timeout(2200)
            page.keyboard.up("e")
            st = state(page)
            check("diamond crack", st["hasDiamond"] and st["score"] >= 500,
                  f"hasDiamond={st['hasDiamond']} score={st['score']}")

            # Win flow: diamond in hand, reach the getaway door.
            page.evaluate(
                """() => { const d = window.__vaultbreak.state.level.door;
                           window.__vaultbreak.teleport(d.x + d.w / 2, d.y + d.h / 2); }"""
            )
            won = False
            for _ in range(20):
                if "Clean getaway" in status_text(page):
                    won = True
                    break
                page.wait_for_timeout(250)
            st = state(page)
            check("win flow", won, f"score={st['score']} status={status_text(page)}")

            # R retries after a win.
            page.keyboard.press("r")
            page.wait_for_timeout(300)
            check("R retries after win", "Playing" in status_text(page))

            # Caught flow: fresh state, keep the thief in front of a guard.
            page.evaluate("() => window.__vaultbreak.start()")
            page.wait_for_timeout(300)
            for _ in range(14):
                teleport_ahead_of_guard(page, 1)
                page.wait_for_timeout(150)
                if "Caught" in status_text(page):
                    break
            caught = False
            for _ in range(40):
                if "Caught" in status_text(page):
                    caught = True
                    break
                page.wait_for_timeout(250)
            check("caught flow", caught, status_text(page))

            # Lockdown flow: alarm at 99.5, one more sighting trips it.
            page.keyboard.press("r")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__vaultbreak.setAlarm(99.5)")
            for _ in range(8):
                teleport_ahead_of_guard(page, 1)
                page.wait_for_timeout(250)
                if "Caught" in status_text(page) or "LOCKDOWN" in status_text(page):
                    break
            locked = False
            for _ in range(20):
                if "LOCKDOWN" in status_text(page):
                    locked = True
                    break
                page.wait_for_timeout(250)
            check("lockdown flow", locked, status_text(page))

            # Cleanliness: no console errors, no failed or external requests.
            check("zero console errors", len(errors) == 0, "; ".join(errors[:3]))
            check("zero failed requests", len(failed_requests) == 0,
                  "; ".join(failed_requests[:3]))
            check("zero external requests", len(external_requests) == 0,
                  "; ".join(external_requests[:3]))

            # Staged screenshots, exactly 1280x800.
            shot_dir = os.path.join(HERE, "screenshots")
            os.makedirs(shot_dir, exist_ok=True)
            for scene, name in SHOTS:
                shot = browser.new_page(viewport={"width": 1280, "height": 800})
                shot.goto(f"{GAME_URL}/?scene={scene}", wait_until="load")
                shot.wait_for_function("() => window.__shotReady === true", timeout=30000)
                path = os.path.join(shot_dir, name)
                shot.screenshot(path=path, type="jpeg", quality=82)
                shot.close()
                size = os.path.getsize(path)
                check(f"screenshot {name}", size < 262144, f"{size} bytes")
            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    passed = sum(1 for _, ok, _ in RESULTS if ok)
    print(f"\n{passed}/{len(RESULTS)} checks passed")
    with open(os.path.join(HERE, "playtest-results.json"), "w") as f:
        json.dump(
            [{"name": n, "ok": ok, "detail": d} for n, ok, d in RESULTS],
            f,
            indent=2,
        )
    return 0 if passed == len(RESULTS) else 1


if __name__ == "__main__":
    sys.exit(main())
