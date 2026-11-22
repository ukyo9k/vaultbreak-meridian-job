// Vaultbreak — The Meridian Job: everything the eye sees.
// One canvas, one painter: the night floor and its furniture, the vault and
// its glass case, loot, the getaway door, guard and camera cones, the thief,
// the HUD (alarm meter, score, tools, objective), and the title, win,
// caught and pause screens. Screens are named constants so the loop and the
// screenshot scenes agree on them.
import {
  CAMERA_HALF_ANGLE,
  CAMERA_RANGE,
  COLORS,
  GUARD_VISION_HALF_ANGLE,
  GUARD_VISION_RANGE,
  VIEW_H,
  VIEW_W,
} from './config.js';
import { alarmColor } from './alarm.js';
import { cameraIsDark } from './cameras.js';
import { coinPosition } from './player.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function wedge(x, y, angle, range, halfAngle, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawFloor(level) {
    ctx.fillStyle = COLORS.floorA;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = COLORS.floorB;
    for (let y = 24; y < VIEW_H - 24; y += 64) {
      for (let x = 24 + ((y / 64) % 2) * 32; x < VIEW_W - 24; x += 64) {
        ctx.fillRect(x, y, 60, 60);
      }
    }
    // Faint marble veining across the vault floor.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.moveTo(60 + i * 140, 40);
      ctx.bezierCurveTo(120 + i * 130, 300, 40 + i * 150, 520, 100 + i * 140, 780);
      ctx.stroke();
    }
    for (const s of level.shadows) {
      ctx.fillStyle = COLORS.shadow;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(120, 140, 200, 0.25)';
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(s.x, s.y, s.w, s.h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(160, 180, 230, 0.5)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('DEEP SHADOW', s.x + 8, s.y + 16);
    }
  }

  function drawDoor(level) {
    const d = level.door;
    // A green exit corridor joins the doorway to the north wall.
    ctx.fillStyle = 'rgba(47, 191, 90, 0.25)';
    ctx.fillRect(d.x, 24, d.w, d.y - 24);
    ctx.fillStyle = COLORS.doorGlow;
    ctx.fillRect(d.x - 14, d.y - 6, d.w + 28, d.h + 26);
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = '#0c2b16';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GETAWAY', d.x + d.w / 2, d.y + d.h / 2 + 5);
  }

  function drawVault(level, state) {
    // Vault walls read as a solid enclosure; the case glows at its heart.
    for (const w of level.walls.slice(4)) {
      ctx.fillStyle = COLORS.vaultWall;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(w.x, w.y, w.w, 4);
    }
    const c = level.case;
    ctx.fillStyle = '#101018';
    ctx.fillRect(c.x - 44, c.y - 34, 88, 68);
    ctx.strokeStyle = COLORS.caseFrame;
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x - 44, c.y - 34, 88, 68);
    ctx.fillStyle = COLORS.caseGlass;
    ctx.fillRect(c.x - 41, c.y - 31, 82, 62);
    if (!state.player.hasDiamond) {
      drawDiamond(c.x, c.y, 13);
    }
    ctx.fillStyle = '#cdd6ea';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MERIDIAN DIAMOND', c.x, c.y - 44);
    if (state.player.crack > 0 && !state.player.hasDiamond) {
      ctx.fillStyle = '#0c0e14';
      ctx.fillRect(c.x - 40, c.y + 40, 80, 10);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(c.x - 40, c.y + 40, 80 * state.player.crack, 10);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '10px monospace';
      ctx.fillText('CRACKING…', c.x, c.y + 64);
    }
  }

  function drawDiamond(x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = COLORS.diamond;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.8, -r * 0.2);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.8, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.2);
    ctx.lineTo(r * 0.8, -r * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  function drawLoot(level) {
    for (const item of level.loot) {
      if (item.taken) continue;
      if (item.id === 'gold') {
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(item.x - 16, item.y - 8, 32, 16);
        ctx.fillStyle = '#ffe9a8';
        ctx.fillRect(item.x - 16, item.y - 8, 32, 5);
        ctx.strokeStyle = '#8a6d1f';
        ctx.lineWidth = 1;
        ctx.strokeRect(item.x - 16, item.y - 8, 32, 16);
      } else if (item.id === 'cash') {
        ctx.fillStyle = COLORS.cash;
        ctx.fillRect(item.x - 14, item.y - 10, 28, 20);
        ctx.fillStyle = '#e6f5e0';
        ctx.beginPath();
        ctx.arc(item.x, item.y, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = COLORS.ledger;
        ctx.fillRect(item.x - 12, item.y - 15, 24, 30);
        ctx.strokeStyle = '#c9a86a';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x - 12, item.y - 15, 24, 30);
        ctx.fillStyle = '#c9a86a';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('M', item.x, item.y + 4);
      }
      ctx.fillStyle = 'rgba(232, 228, 216, 0.75)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(item.label.toUpperCase(), item.x, item.y + 30);
    }
  }

  function drawObstacles(level) {
    for (const o of level.obstacles) {
      if (o.kind === 'crate') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = COLORS.crateTop;
        ctx.fillRect(o.x, o.y, o.w, 8);
        ctx.strokeStyle = '#4a3a20';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.moveTo(o.x + o.w, o.y);
        ctx.lineTo(o.x, o.y + o.h);
        ctx.stroke();
      } else if (o.kind === 'desk') {
        ctx.fillStyle = COLORS.desk;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#5d4a38';
        ctx.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
      } else {
        ctx.fillStyle = '#2c3140';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(o.x, o.y, o.w, 5);
      }
    }
    for (const w of level.walls.slice(0, 4)) {
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = COLORS.wallTop;
      if (w.h <= 24) ctx.fillRect(w.x, w.y + w.h - 4, w.w, 4);
      else ctx.fillRect(w.x + w.w - 4, w.y, 4, w.h);
    }
    ctx.fillStyle = 'rgba(232, 228, 216, 0.55)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MERIDIAN BANK — VAULT FLOOR', 40, 78);
    ctx.textAlign = 'right';
    ctx.fillText('02:47 AM', 1090, 78);
  }

  function drawCoin(state) {
    const pos = coinPosition(state.player);
    if (!pos) return;
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.flying ? 5 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!pos.flying) {
      ctx.strokeStyle = 'rgba(232, 200, 90, 0.5)';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawCameras(state) {
    for (const camera of state.cameras) {
      const dark = cameraIsDark(camera);
      wedge(
        camera.x,
        camera.y,
        camera.angle,
        CAMERA_RANGE,
        CAMERA_HALF_ANGLE,
        dark ? 'rgba(120, 120, 120, 0.07)' : COLORS.cameraCone,
      );
      ctx.fillStyle = dark ? '#5a5a5a' : COLORS.cameraBody;
      ctx.beginPath();
      ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark ? '#333' : '#ffd6d6';
      ctx.beginPath();
      ctx.arc(camera.x, camera.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (dark) {
        ctx.fillStyle = 'rgba(232, 228, 216, 0.7)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OFFLINE', camera.x, camera.y + 22);
      }
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      const hot = guard.state === 'chase';
      const warm = guard.suspicion > 50 && !hot;
      wedge(
        guard.x,
        guard.y,
        guard.angle,
        GUARD_VISION_RANGE,
        GUARD_VISION_HALF_ANGLE,
        hot ? COLORS.guardConeHot : warm ? 'rgba(255, 160, 60, 0.2)' : COLORS.guardCone,
      );
      ctx.fillStyle = hot ? '#ff5a3c' : COLORS.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5f1d1d';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing tick and name tag.
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.angle) * 20, guard.y + Math.sin(guard.angle) * 20);
      ctx.stroke();
      ctx.fillStyle = '#f5f0e0';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y - 22);
      // Suspicion arc above the guard's head.
      if (guard.suspicion > 2) {
        ctx.strokeStyle = guard.suspicion >= 100 ? '#ff5a3c' : '#ffd65a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, 21, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.suspicion) / 100);
        ctx.stroke();
      }
      if (guard.state === 'investigate') {
        ctx.fillStyle = '#ffd65a';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('?', guard.x, guard.y - 34);
      }
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 12, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.playerHood;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.playerHood;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 17, p.y + Math.sin(p.angle) * 17);
    ctx.stroke();
    if (p.hasDiamond) {
      drawDiamond(p.x + 12, p.y - 12, 6);
    }
    if (p.sneaking) {
      ctx.fillStyle = 'rgba(232, 228, 216, 0.7)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SNEAKING', p.x, p.y + 28);
    }
  }

  function drawHud(state) {
    // Top bar: alarm meter, score, clock, tools, objective.
    ctx.fillStyle = 'rgba(8, 10, 16, 0.82)';
    ctx.fillRect(0, 0, VIEW_W, 58);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', 24, 24);
    ctx.fillStyle = '#22262f';
    ctx.fillRect(90, 12, 260, 18);
    ctx.fillStyle = alarmColor(state.alarm.value);
    ctx.fillRect(90, 12, Math.max(0, (260 * state.alarm.value) / 100), 18);
    ctx.strokeStyle = '#565e70';
    ctx.lineWidth = 1;
    ctx.strokeRect(90, 12, 260, 18);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '12px monospace';
    ctx.fillText(`${Math.floor(state.alarm.value)}`, 358, 26);
    if (state.alarm.seen) {
      ctx.fillStyle = '#ff5a3c';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(state.alarm.seenBy === 'guard' ? 'SPOTTED BY GUARD' : 'SPOTTED BY CAMERA', 400, 26);
    }
    ctx.fillStyle = '#e8e4d8';
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`SCORE ${state.score}`, VIEW_W - 24, 24);
    ctx.font = '12px monospace';
    const minutes = Math.floor(state.elapsed / 60);
    const seconds = Math.floor(state.elapsed % 60);
    ctx.fillText(
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}   COINS ${'●'.repeat(state.player.coins)}${'○'.repeat(3 - state.player.coins)}   EMP ${'◆'.repeat(state.player.emps)}${'◇'.repeat(2 - state.player.emps)}   LOOT ${state.player.lootTaken}/3${state.player.hasDiamond ? '   ◆ DIAMOND' : ''}`,
      VIEW_W - 24,
      46,
    );
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b9c0cf';
    ctx.font = '12px monospace';
    ctx.fillText(
      state.player.hasDiamond
        ? 'OBJECTIVE: reach the green GETAWAY door'
        : 'OBJECTIVE: crack the case (hold E), steal the diamond, escape',
      24,
      46,
    );
    // Bottom hint line.
    ctx.fillStyle = 'rgba(8, 10, 16, 0.7)';
    ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
    ctx.fillStyle = '#9aa3b5';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / ARROWS move · SHIFT sneak · CLICK throw coin · Q EMP · E (hold) crack · P pause · M sound', VIEW_W / 2, VIEW_H - 9);
  }

  function drawToast(state) {
    if (!state.toast || state.toastFor <= 0) return;
    ctx.fillStyle = 'rgba(8, 10, 16, 0.85)';
    const text = state.toast;
    ctx.font = 'bold 15px monospace';
    const w = ctx.measureText(text).width + 32;
    ctx.fillRect((VIEW_W - w) / 2, 70, w, 32);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1;
    ctx.strokeRect((VIEW_W - w) / 2, 70, w, 32);
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(text, VIEW_W / 2, 91);
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(6, 8, 14, 0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = accent;
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_W / 2, 300);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '17px monospace';
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 350 + i * 30));
  }

  function drawTitle(state, best) {
    overlay('VAULTBREAK', ['THE MERIDIAN JOB', '', 'One room. Three guards. Three cameras.', 'Crack the case, take the diamond, walk out the green door.', '', 'Press SPACE to begin'], '#f2c14e');
    ctx.fillStyle = '#9aa3b5';
    ctx.font = '13px monospace';
    ctx.fillText(`BEST SCORE ${best}`, VIEW_W / 2, 560);
    ctx.fillText('WASD move · SHIFT sneak · CLICK coin · Q EMP · E hold to crack', VIEW_W / 2, 590);
  }

  function drawWin(state) {
    const bonus = Math.max(0, 400 - Math.floor(state.elapsed) * 2);
    overlay('CLEAN GETAWAY', [
      'The Meridian Diamond is yours.',
      '',
      `Diamond 500  ·  Side loot ${state.player.lootTaken * 100}  ·  Time bonus ${bonus}`,
      `FINAL SCORE ${state.score}`,
      '',
      'Press R to run it again',
    ], '#2fbf5a');
  }

  function drawCaught(state) {
    overlay(state.caughtReason === 'lockdown' ? 'LOCKDOWN' : 'CAUGHT!', [
      state.caughtReason === 'lockdown'
        ? 'The alarm hit 100. Steel shutters. Sirens. Over.'
        : 'A guard laid a hand on you. The job is over.',
      '',
      `SCORE ${state.score}`,
      '',
      'Press R to try again',
    ], '#e5484d');
  }

  function drawPaused() {
    overlay('PAUSED', ['Press P or SPACE to keep going'], '#b9c0cf');
  }

  return {
    draw(state, screen, best) {
      const level = state.level;
      drawFloor(level);
      drawDoor(level);
      drawVault(level, state);
      drawLoot(level);
      drawCoin(state);
      drawObstacles(level);
      drawCameras(state);
      drawGuards(state);
      drawPlayer(state);
      drawHud(state);
      drawToast(state);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_WIN) drawWin(state);
      else if (screen === SCREEN_CAUGHT) drawCaught(state);
      else if (screen === SCREEN_PAUSED) drawPaused();
    },
  };
}
