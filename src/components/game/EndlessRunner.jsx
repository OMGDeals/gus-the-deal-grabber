import { useEffect, useRef, useState, useCallback } from 'react';
import SubmitScoreModal from './SubmitScoreModal';
import Leaderboard from './Leaderboard';

const W = 800, H = 400;
const GROUND = 315;
const PX = 85;
const GRAVITY = 0.55;
const JUMP_VEL = -13;
const GUS_W = 62, GUS_H = 68;

const DEALS = [
  { emoji: '💻', label: '50% OFF!' },
  { emoji: '👟', label: '40% OFF!' },
  { emoji: '📱', label: '30% OFF!' },
  { emoji: '🎮', label: '60% OFF!' },
  { emoji: '📺', label: '45% OFF!' },
  { emoji: '🎧', label: '35% OFF!' },
  { emoji: '⌚', label: '55% OFF!' },
  { emoji: '🛍️', label: '70% OFF!' },
];

function drawTag(ctx, x, y, emoji, label) {
  const w = 60, h = 44;
  ctx.save();
  ctx.shadowColor = '#FF8C00';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#FF8C00';
  ctx.strokeStyle = '#CC4A00';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + 12, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + 12, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x + 15, y + h / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '20px serif';
  ctx.fillText(emoji, x + 19, y + 28);
  ctx.font = 'bold 8px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText(label, x + 19, y + h - 4);
  ctx.restore();
}

function drawObstacle(ctx, o) {
  ctx.save();
  if (o.type === 'sign') {
    ctx.fillStyle = '#888';
    ctx.fillRect(o.x + 18, o.y + 24, 5, o.height - 24);
    ctx.fillStyle = '#CC1111';
    ctx.strokeStyle = '#880000';
    ctx.lineWidth = 2;
    ctx.fillRect(o.x - 2, o.y, 52, 30);
    ctx.strokeRect(o.x - 2, o.y, 52, 30);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 7.5px Arial';
    ctx.fillText('💸 OVERPRICED!', o.x, o.y + 12);
    ctx.fillText('  AVOID! 🚫', o.x + 2, o.y + 24);
  } else if (o.type === 'wall' || o.type === 'tall_wall') {
    const brickH = 18, brickW = o.width;
    const rows = Math.ceil(o.height / brickH);
    for (let r = 0; r < rows; r++) {
      const rowY = o.y + r * brickH;
      const rowH = Math.min(brickH - 2, o.y + o.height - rowY);
      if (rowH <= 0) break;
      const offset = (r % 2 === 0) ? 0 : 12;
      // Draw brick row
      for (let bx = o.x - offset; bx < o.x + brickW; bx += 24) {
        const bLeft = Math.max(bx, o.x);
        const bRight = Math.min(bx + 22, o.x + brickW);
        if (bRight <= bLeft) continue;
        ctx.fillStyle = r % 3 === 0 ? '#8B2500' : r % 3 === 1 ? '#A52A00' : '#7A1F00';
        ctx.fillRect(bLeft, rowY, bRight - bLeft, rowH);
        ctx.strokeStyle = '#5A0A0A';
        ctx.lineWidth = 1;
        ctx.strokeRect(bLeft, rowY, bRight - bLeft, rowH);
      }
    }
    // Label on top bricks
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(o.x, o.y, o.width, 16);
    ctx.font = 'bold 7px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(o.type === 'tall_wall' ? '⚠️ PRICEY' : '💸 NOPE', o.x + 2, o.y + 11);
  } else {
    // Price tag shape
    const tx = o.x, ty = o.y;
    const tw = 52, th = 44;
    ctx.fillStyle = '#CC1111';
    ctx.strokeStyle = '#880000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tx + 14, ty);
    ctx.lineTo(tx + tw, ty);
    ctx.lineTo(tx + tw, ty + th);
    ctx.lineTo(tx + 14, ty + th);
    ctx.lineTo(tx, ty + th / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Hole
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(tx + 18, ty + th / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // Text
    ctx.font = 'bold 9px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('FULL', tx + 22, ty + 18);
    ctx.fillText('PRICE', tx + 20, ty + 30);
    ctx.font = '11px serif';
    ctx.fillText('💸', tx + 22, ty + 42);
  }
  ctx.restore();
}

function drawHUD(ctx, s) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(10, 10, 185, 38);
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`🏷️ ${s.score.toLocaleString()}`, 18, 34);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(W - 110, 10, 100, 38);
  ctx.font = '22px Arial';
  let hearts = '';
  for (let i = 0; i < 3; i++) hearts += i < s.lives ? '❤️' : '🖤';
  ctx.fillText(hearts, W - 105, 36);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(W / 2 - 65, 10, 130, 28);
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText(`⚡ x${s.speed.toFixed(1)} speed`, W / 2 - 56, 29);
}

function drawBalloon(ctx, b) {
  ctx.save();
  // String
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(b.x + 18, b.y + 52);
  ctx.lineTo(b.x + 18, b.y + 68);
  ctx.stroke();
  // Balloon body
  ctx.shadowColor = '#CC0000';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#DD2222';
  ctx.strokeStyle = '#881111';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(b.x + 18, b.y + 24, 18, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Knot
  ctx.fillStyle = '#AA1111';
  ctx.beginPath();
  ctx.ellipse(b.x + 18, b.y + 48, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Text
  ctx.font = 'bold 7px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText('BAD', b.x + 18, b.y + 20);
  ctx.fillText('DEAL', b.x + 18, b.y + 30);
  ctx.textAlign = 'left';
  ctx.restore();
}

function getSkyColors(speed) {
  // Interpolate sky based on speed: 4=day, 12=sunset, 18=dusk, 20+=night storm
  if (speed < 12) {
    const t = (speed - 4) / 8;
    return [
      lerpColor('#1E88E5', '#FF7043', t),
      lerpColor('#B3E5FC', '#FFCCBC', t),
    ];
  } else if (speed < 20) {
    const t = (speed - 12) / 8;
    return [
      lerpColor('#FF7043', '#4A148C', t),
      lerpColor('#FFCCBC', '#880E4F', t),
    ];
  } else {
    return ['#1A0030', '#4A0030'];
  }
}

function lerpColor(c1, c2, t) {
  const h = s => parseInt(s.slice(1), 16);
  const r1 = (h(c1) >> 16) & 0xFF, g1 = (h(c1) >> 8) & 0xFF, b1 = h(c1) & 0xFF;
  const r2 = (h(c2) >> 16) & 0xFF, g2 = (h(c2) >> 8) & 0xFF, b2 = h(c2) & 0xFF;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function drawBackground(ctx, boff, speed) {
  // Dynamic sky
  const [skyTop, skyBot] = getSkyColors(speed);
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, skyTop); sky.addColorStop(1, skyBot);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);

  // Stars appear at night (speed > 16)
  if (speed > 16) {
    const starAlpha = Math.min(1, (speed - 16) / 6);
    ctx.globalAlpha = starAlpha;
    ctx.fillStyle = 'white';
    [[50,20],[150,35],[300,15],[420,40],[580,22],[700,38],[760,12],[100,50],[500,45]].forEach(([sx,sy]) => {
      const x = ((sx - boff * 0.05) % W + W) % W;
      ctx.beginPath(); ctx.arc(x, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // Clouds (fade out at night)
  const cloudAlpha = Math.max(0, 1 - (speed - 14) / 6);
  ctx.globalAlpha = cloudAlpha;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  [[90, 45, 28], [260, 38, 22], [490, 55, 32], [690, 32, 18], [880, 48, 25]].forEach(([cx, cy, r]) => {
    const x = ((cx - boff * 0.2) % (W + 200) + W + 200) % (W + 200) - 100;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.8, cy - r * 0.5, r * 0.65, 0, Math.PI * 2);
    ctx.arc(x - r * 0.55, cy - r * 0.3, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  const bldgs = [
    [0, '#C8B2FF', 110, 120], [130, '#A2C8FF', 80, 90], [230, '#FFD4A0', 100, 140],
    [355, '#A0FFD4', 90, 100], [465, '#FFB3BA', 130, 125], [615, '#C8B2FF', 85, 95],
    [720, '#A2C8FF', 110, 115], [855, '#FFD4A0', 90, 100],
  ];
  bldgs.forEach(([bx, color, bw, bh]) => {
    const x = ((bx - boff * 0.45) % (W + 250) + W + 250) % (W + 250) - 120;
    ctx.fillStyle = color;
    ctx.fillRect(x, GROUND - bh, bw, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const ww = Math.floor(bw / 3) - 8;
      ctx.fillRect(x + 6 + c * (bw / 3), GROUND - bh + 14 + r * 34, ww, 18);
    }
    ctx.fillStyle = '#FF6500';
    ctx.fillRect(x + bw / 2 - 22, GROUND - bh + 3, 44, 14);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 7px Arial';
    ctx.fillText('OMG Deals', x + bw / 2 - 20, GROUND - bh + 12);
  });
}

const fresh = () => ({
  py: GROUND - GUS_H, pvy: 0, pjumps: 0,
  obs: [], deals: [], balloons: [], parts: [], pops: [],
  speed: 4, dist: 0, score: 0, dc: 0,
  lives: 3, inv: 0, f: 0, boff: 0, ra: 0,
});

export default function EndlessRunner() {
  const cvs = useRef(null);
  const raf = useRef(null);
  const gs = useRef(null);
  const gusImg = useRef(null);
  const [ui, setUi] = useState('menu');
  const [fScore, setFScore] = useState(0);
  const [fDeals, setFDeals] = useState(0);
  const [best, setBest] = useState(0);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b33333f96da5ecbafb752a/e6670afca_Gus_Body.png';
    img.onload = () => { gusImg.current = img; };
  }, []);

  const start = useCallback(() => { gs.current = fresh(); setUi('playing'); }, []);

  const jump = useCallback(() => {
    const s = gs.current;
    if (s && s.pjumps < 2) { s.pvy = JUMP_VEL; s.pjumps++; }
  }, []);

  useEffect(() => {
    const kd = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (ui === 'menu' || ui === 'gameover') start(); else jump();
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [ui, start, jump]);

  useEffect(() => {
    if (ui !== 'playing') return;
    const canvas = cvs.current;
    const ctx = canvas.getContext('2d');

    const loop = () => {
      const s = gs.current;
      s.f++; s.dist++; s.boff += s.speed; s.ra += 0.28;
      s.speed = 4 + s.dist / 1000;

      // Physics
      s.pvy += GRAVITY; s.py += s.pvy;
      if (s.py >= GROUND - GUS_H) { s.py = GROUND - GUS_H; s.pvy = 0; s.pjumps = 0; }

      // Spawn obstacles
      const oi = Math.max(52, 118 - Math.floor(s.dist / 200));
      if (s.f % oi === 0) {
        const t = ['sign', 'wall', 'tall_wall', 'bag'][Math.floor(Math.random() * 4)];
        const h = t === 'tall_wall' ? 130 : t === 'wall' ? 76 : 52;
        s.obs.push({ x: W + 30, y: GROUND - h, width: 42, height: h, type: t });
      }

      // Spawn deals
      if (s.f % 88 === 0) {
        const d = DEALS[Math.floor(Math.random() * DEALS.length)];
        s.deals.push({ ...d, x: W + 20, y: Math.random() < 0.4 ? GROUND - 160 : GROUND - 82, bob: Math.random() * Math.PI * 2, col: false });
      }

      s.obs.forEach(o => { o.x -= s.speed; });
      s.obs = s.obs.filter(o => o.x > -90);
      s.deals.forEach(d => { d.x -= s.speed; d.bob += 0.06; });
      s.deals = s.deals.filter(d => d.x > -80 && !d.col);

      s.score = Math.floor(s.dist / 5) + s.dc * 100;

      // Obstacle collision
      let dead = false;
      if (s.inv > 0) s.inv--;
      if (s.inv === 0) {
        for (const o of s.obs) {
          const hx = PX + 10, hw = GUS_W - 20, hy = s.py + 12, hh = GUS_H - 16;
          if (hx + hw > o.x + 4 && hx < o.x + o.width - 4 && hy + hh > o.y + 4) {
            s.lives--; s.inv = 80; s.pvy = -8;
            if (s.lives <= 0) dead = true;
            break;
          }
        }
      }

      if (dead) {
        setFScore(s.score); setFDeals(s.dc);
        setBest(prev => Math.max(prev, s.score));
        setUi('gameover'); setShowSubmit(true); return;
      }

      // Deal collection
      for (const d of s.deals) {
        if (d.col) continue;
        const dy = d.y + Math.sin(d.bob) * 8;
        const hx = PX + 10, hw = GUS_W - 10;
        if (hx + hw > d.x && hx < d.x + 60 && s.py + 8 + GUS_H - 12 > dy && s.py + 8 < dy + 44) {
          d.col = true; s.dc++;
          for (let i = 0; i < 14; i++) s.parts.push({
            x: d.x + 30, y: dy + 22,
            vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 8,
            life: 55, c: `hsl(${20 + Math.random() * 40},100%,${55 + Math.random() * 15}%)`
          });
          s.pops.push({ x: d.x - 8, y: dy - 8, t: d.label, life: 75 });
        }
      }
      s.deals = s.deals.filter(d => !d.col);
      s.parts = s.parts.filter(p => p.life > 0);
      s.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--; });
      s.pops = s.pops.filter(p => p.life > 0);
      s.pops.forEach(p => { p.y -= 1.5; p.life--; });

      // === RENDER ===
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, '#1E88E5'); sky.addColorStop(1, '#B3E5FC');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      drawBackground(ctx, s.boff);

      // Ground
      const grd = ctx.createLinearGradient(0, GROUND, 0, H);
      grd.addColorStop(0, '#9E9E9E'); grd.addColorStop(1, '#546E7A');
      ctx.fillStyle = grd; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#BDBDBD';
      for (let i = 0; i < W + 80; i += 80) {
        const tx = ((i - s.boff * 1.5) % (W + 80) + W + 80) % (W + 80) - 40;
        ctx.fillRect(tx, GROUND, 75, 5);
      }

      // Deals
      s.deals.forEach(d => drawTag(ctx, d.x, d.y + Math.sin(d.bob) * 8, d.emoji, d.label));

      // Obstacles
      s.obs.forEach(o => drawObstacle(ctx, o));

      // Gus (flash when invincible)
      if (s.inv === 0 || Math.floor(s.f / 5) % 2 === 0) {
        const bob = s.pjumps === 0 ? Math.sin(s.ra * 2) * 2 : 0;
        if (gusImg.current) {
          ctx.drawImage(gusImg.current, PX, s.py + bob, GUS_W, GUS_H);
        } else {
          ctx.fillStyle = '#FF8C00';
          ctx.beginPath();
          ctx.arc(PX + 31, s.py + 34, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('GUS', PX + 17, s.py + 40);
        }
      }

      // Particles
      s.parts.forEach(p => {
        ctx.globalAlpha = p.life / 55;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Popups
      s.pops.forEach(p => {
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life / 35);
        ctx.font = 'bold 22px Arial';
        ctx.strokeStyle = '#CC4A00'; ctx.lineWidth = 3.5;
        ctx.strokeText(p.t, p.x, p.y);
        ctx.fillStyle = '#FFD700'; ctx.fillText(p.t, p.x, p.y);
        ctx.restore();
      });

      drawHUD(ctx, s);
      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [ui]);

  const tap = () => {
    if (ui === 'menu' || ui === 'gameover') start(); else jump();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-700 flex flex-col items-center justify-center p-3 select-none">
      <h1 className="text-2xl md:text-4xl font-black text-white mb-3 drop-shadow-lg tracking-tight">
        🏷️ GUS: DEAL HUNTER
      </h1>

      <div className="relative w-full max-w-4xl">
        <canvas
          ref={cvs} width={W} height={H} onClick={tap}
          className="w-full rounded-2xl shadow-2xl border-4 border-white cursor-pointer block"
        />

        {ui === 'menu' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
            <div className="bg-white rounded-2xl p-5 md:p-8 text-center max-w-xs mx-4 shadow-2xl">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b33333f96da5ecbafb752a/e6670afca_Gus_Body.png"
                alt="Gus" className="w-24 mx-auto mb-2" />
              <h2 className="text-2xl font-black text-orange-500 mb-1">DEAL HUNTER!</h2>
              <p className="text-gray-400 text-xs mb-3">Help Gus snag the best deals!</p>
              <div className="text-xs text-gray-500 mb-5 space-y-1 text-left bg-orange-50 rounded-xl p-3">
                <p>🏷️ <b>Collect</b> deal tags = +100 pts each</p>
                <p>💸 <b>Dodge</b> overpriced obstacles!</p>
                <p>❤️ You have <b>3 lives</b></p>
                <p>⬆️ <b>SPACE / tap</b> to jump</p>
                <p>✌️ <b>Double jump</b> available!</p>
              </div>
              <button onClick={start}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black text-lg px-8 py-3 rounded-full transition shadow-lg w-full">
                START HUNTING! 🏃
              </button>
            </div>
          </div>
        )}

        {ui === 'gameover' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 rounded-2xl">
            <div className="bg-white rounded-2xl p-5 md:p-8 text-center max-w-xs mx-4 shadow-2xl">
              <div className="text-5xl mb-2">😱</div>
              <h2 className="text-2xl font-black text-red-500 mb-1">DEAL MISSED!</h2>
              <p className="text-gray-400 text-xs mb-4">The overpriced goons got Gus...</p>
              <div className="bg-orange-50 rounded-xl p-3 mb-5 space-y-1">
                <p className="text-xl font-bold">Score: <span className="text-orange-500">{fScore.toLocaleString()}</span></p>
                {best > 0 && <p className="text-sm text-gray-500">🏆 Best: <span className="text-yellow-500 font-bold">{best.toLocaleString()}</span></p>}
                <p className="text-sm text-gray-600">Deals Snagged: <span className="text-green-500 font-bold">{fDeals}</span> 🏷️</p>
              </div>
              <button onClick={start}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black text-lg px-8 py-3 rounded-full transition shadow-lg w-full">
                TRY AGAIN! 🔄
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-3">
        <button
          onClick={() => setShowLeaderboard(true)}
          className="bg-white/20 hover:bg-white/30 text-white font-bold px-5 py-2 rounded-full text-sm transition"
        >
          🏆 Leaderboard
        </button>
        <p className="text-white/60 text-xs self-center">SPACE / TAP to jump • Double jump available!</p>
      </div>

      {showSubmit && ui === 'gameover' && (
        <SubmitScoreModal
          score={fScore}
          dealsCount={fDeals}
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => { setShowSubmit(false); setShowLeaderboard(true); }}
        />
      )}

      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}
    </div>
  );
}