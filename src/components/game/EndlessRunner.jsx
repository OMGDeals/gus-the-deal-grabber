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

  const phase = s.speed >= 12 ? '🌙 CHAOS' : s.speed >= 10 ? '🌃 NIGHT' : s.speed >= 8 ? '🌆 DUSK' : s.speed >= 6 ? '🌅 SUNSET' : '☀️ DAY';
  ctx.fillStyle = s.speed >= 12 ? 'rgba(80,0,80,0.7)' : 'rgba(0,0,0,0.25)';
  ctx.fillRect(W / 2 - 75, 10, 150, 28);
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = s.speed >= 12 ? '#FF44FF' : 'white';
  ctx.fillText(`${phase} x${s.speed.toFixed(1)}`, W / 2 - 68, 29);
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

function lerpColor(c1, c2, t) {
  const parse = s => {
    if (s.startsWith('rgb')) {
      const m = s.match(/\d+/g); return [+m[0], +m[1], +m[2]];
    }
    const h = parseInt(s.slice(1), 16);
    return [(h >> 16) & 0xFF, (h >> 8) & 0xFF, h & 0xFF];
  };
  const [r1,g1,b1] = parse(c1), [r2,g2,b2] = parse(c2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function drawBackground(ctx, boff, speed) {
  // === SKY GRADIENT ===
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  if (speed < 6) {
    // Daytime - bright blue sky
    sky.addColorStop(0, '#0D47A1');
    sky.addColorStop(0.4, '#1E88E5');
    sky.addColorStop(0.8, '#64B5F6');
    sky.addColorStop(1, '#B3E5FC');
  } else if (speed < 8) {
    const t = (speed - 6) / 2;
    sky.addColorStop(0, lerpColor('#0D47A1', '#B71C1C', t));
    sky.addColorStop(0.35, lerpColor('#1E88E5', '#E64A19', t));
    sky.addColorStop(0.7, lerpColor('#64B5F6', '#FF8A65', t));
    sky.addColorStop(1, lerpColor('#B3E5FC', '#FFCCBC', t));
  } else if (speed < 10) {
    // Dusk - deep orange/purple
    const t = (speed - 8) / 2;
    sky.addColorStop(0, lerpColor('#B71C1C', '#311B92', t));
    sky.addColorStop(0.3, lerpColor('#E64A19', '#4527A0', t));
    sky.addColorStop(0.65, lerpColor('#FF8A65', '#7B1FA2', t));
    sky.addColorStop(1, lerpColor('#FFCCBC', '#E040FB', t));
  } else if (speed < 13) {
    // Night transition
    const t = (speed - 10) / 3;
    sky.addColorStop(0, lerpColor('#311B92', '#050510', t));
    sky.addColorStop(0.4, lerpColor('#4527A0', '#0D0D2B', t));
    sky.addColorStop(1, lerpColor('#7B1FA2', '#1A0030', t));
  } else {
    // Full night
    sky.addColorStop(0, '#020210');
    sky.addColorStop(0.5, '#0A0A20');
    sky.addColorStop(1, '#120020');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND);

  // === SUN / MOON ===
  if (speed < 9) {
    // Sun
    const sunAlpha = Math.max(0, 1 - (speed - 7) / 2);
    const sunY = GROUND - 220 - (speed < 6 ? 40 : 0);
    ctx.save();
    ctx.globalAlpha = sunAlpha;
    // Sun glow
    const sunGlow = ctx.createRadialGradient(680, sunY, 0, 680, sunY, 55);
    sunGlow.addColorStop(0, 'rgba(255,230,80,0.9)');
    sunGlow.addColorStop(0.4, 'rgba(255,180,30,0.4)');
    sunGlow.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(620, sunY - 55, 120, 110);
    // Sun disk
    ctx.fillStyle = '#FFE040';
    ctx.beginPath();
    ctx.arc(680, sunY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (speed > 10) {
    // Moon
    const moonAlpha = Math.min(1, (speed - 10) / 3);
    ctx.save();
    ctx.globalAlpha = moonAlpha;
    const moonX = ((680 - boff * 0.01) % W + W) % W;
    // Moon glow
    const moonGlow = ctx.createRadialGradient(moonX, 55, 0, moonX, 55, 40);
    moonGlow.addColorStop(0, 'rgba(200,220,255,0.3)');
    moonGlow.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(moonX - 40, 15, 80, 80);
    // Moon crescent
    ctx.fillStyle = '#E8EFF8';
    ctx.beginPath(); ctx.arc(moonX, 55, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = speed > 13 ? '#0A0A20' : lerpColor('#4527A0', '#0A0A20', (speed - 10) / 3);
    ctx.beginPath(); ctx.arc(moonX + 6, 52, 13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // === STARS ===
  if (speed > 9) {
    const starAlpha = Math.min(1, (speed - 9) / 3);
    const stars = [
      [50,18,1.8],[150,32,1.2],[300,14,2],[420,38,1.5],[580,20,1],[700,35,1.8],
      [760,10,1.2],[100,48,1],[500,42,1.5],[200,22,2],[640,28,1],[380,50,1.2],
      [820,16,1.8],[460,8,1],[720,44,1.3],[180,55,1],[550,30,2],[340,20,1.2],
    ];
    stars.forEach(([sx, sy, sr]) => {
      const x = ((sx - boff * 0.03) % W + W) % W;
      const twinkle = 0.7 + 0.3 * Math.sin(boff * 0.01 + sx);
      ctx.save();
      ctx.globalAlpha = starAlpha * twinkle;
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(x, sy, sr, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  // === CLOUDS ===
  const cloudAlpha = Math.max(0, 1 - (speed - 7) / 3);
  if (cloudAlpha > 0) {
    const cloudDefs = [
      [80, 50, 32], [270, 38, 24], [500, 55, 36], [700, 35, 20], [900, 50, 28], [1100, 42, 22],
    ];
    cloudDefs.forEach(([cx, cy, r]) => {
      const x = ((cx - boff * 0.18) % (W + 300) + W + 300) % (W + 300) - 150;
      ctx.save();
      ctx.globalAlpha = cloudAlpha * 0.9;
      // Cloud shadow
      ctx.fillStyle = 'rgba(100,140,200,0.25)';
      ctx.beginPath();
      ctx.arc(x + 4, cy + 5, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.85 + 4, cy - r * 0.45 + 5, r * 0.7, 0, Math.PI * 2);
      ctx.arc(x - r * 0.5 + 4, cy - r * 0.25 + 5, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Cloud body
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(x, cy, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.85, cy - r * 0.45, r * 0.7, 0, Math.PI * 2);
      ctx.arc(x - r * 0.5, cy - r * 0.25, r * 0.6, 0, Math.PI * 2);
      ctx.arc(x + r * 0.4, cy - r * 0.65, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Cloud highlight
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(x - r * 0.1, cy - r * 0.2, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // === BUILDINGS (background layer - distant, desaturated) ===
  const nightT = Math.max(0, Math.min(1, (speed - 8) / 4));
  const bldgsBack = [
    [20, '#9E9BC0', 70, 80], [110, '#8EB4C8', 55, 65], [185, '#B0B890', 65, 90],
    [270, '#8AB8B0', 60, 72], [345, '#B09EB8', 80, 85], [445, '#9EACC8', 62, 68],
    [530, '#B8A898', 70, 78], [620, '#9EB8A0', 58, 82], [700, '#A8A8C0', 75, 70],
    [790, '#B0B8A8', 65, 88], [875, '#9EACC0', 72, 76],
  ];
  bldgsBack.forEach(([bx, color, bw, bh]) => {
    const x = ((bx - boff * 0.25) % (W + 300) + W + 300) % (W + 300) - 120;
    const nightColor = lerpColor(color, '#1A1830', nightT * 0.7);
    ctx.fillStyle = nightColor;
    ctx.fillRect(x, GROUND - bh, bw, bh);
    // Far building windows
    ctx.fillStyle = nightT > 0.3 ? `rgba(255,240,150,${0.6 * nightT})` : 'rgba(180,210,240,0.3)';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        if (Math.sin(bx + row * 7 + col * 13) > 0) {
          ctx.fillRect(x + 8 + col * (bw / 2 - 4), GROUND - bh + 12 + row * 22, bw / 2 - 14, 12);
        }
      }
    }
  });

  // === BUILDINGS (foreground layer - main, detailed) ===
  const bldgs = [
    [0, '#D4C0FF', '#B89EE8', 110, 120],
    [140, '#A8C8FF', '#88A8E8', 82, 95],
    [245, '#FFE0A8', '#E8C080', 105, 148],
    [375, '#A8FFD8', '#80E0B0', 92, 108],
    [490, '#FFC0C8', '#E8909A', 135, 132],
    [650, '#D4C0FF', '#B090E0', 88, 102],
    [760, '#A8CCFF', '#80ACEE', 115, 122],
    [900, '#FFE0A8', '#E8C080', 95, 110],
  ];
  bldgs.forEach(([bx, color, shadowColor, bw, bh]) => {
    const x = ((bx - boff * 0.45) % (W + 300) + W + 300) % (W + 300) - 130;
    // Night tint
    const fc = lerpColor(color, '#1E1C38', nightT * 0.75);
    const sc = lerpColor(shadowColor, '#12102A', nightT * 0.75);

    // Building body with gradient
    const bGrad = ctx.createLinearGradient(x, GROUND - bh, x + bw, GROUND);
    bGrad.addColorStop(0, fc);
    bGrad.addColorStop(1, sc);
    ctx.fillStyle = bGrad;
    ctx.fillRect(x, GROUND - bh, bw, bh);

    // Right-side shadow for depth
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + bw - 8, GROUND - bh, 8, bh);

    // Rooftop detail
    ctx.fillStyle = lerpColor(shadowColor, '#0A0820', nightT * 0.8);
    ctx.fillRect(x + 4, GROUND - bh - 6, bw - 8, 8);
    // Antenna / rooftop accent
    ctx.fillStyle = lerpColor('#888', '#444', nightT);
    ctx.fillRect(x + bw / 2 - 1, GROUND - bh - 18, 2, 14);
    ctx.fillStyle = lerpColor('#CC2222', '#FF4444', 0.5);
    ctx.beginPath();
    ctx.arc(x + bw / 2, GROUND - bh - 20, 3, 0, Math.PI * 2);
    ctx.fill();

    // Windows
    const cols = Math.floor(bw / 22);
    const rows = Math.floor((bh - 30) / 26);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wx = x + 8 + col * ((bw - 10) / cols);
        const wy = GROUND - bh + 28 + row * 26;
        const ww = (bw - 10) / cols - 8;
        const isLit = Math.sin(bx * 0.3 + row * 5.1 + col * 3.7) > (nightT > 0.5 ? -0.3 : 0.4);
        if (nightT > 0.3 && isLit) {
          // Lit windows at night
          ctx.fillStyle = `rgba(255,235,120,${0.75 + 0.2 * Math.sin(boff * 0.002 + row + col)})`;
          ctx.fillRect(wx, wy, ww, 16);
          // Window glow
          ctx.save();
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#FFE080';
          ctx.fillRect(wx - 2, wy - 2, ww + 4, 20);
          ctx.restore();
        } else if (nightT <= 0.3) {
          // Daytime windows - reflective
          const winGrad = ctx.createLinearGradient(wx, wy, wx + ww, wy + 16);
          winGrad.addColorStop(0, 'rgba(180,210,255,0.7)');
          winGrad.addColorStop(0.5, 'rgba(220,235,255,0.9)');
          winGrad.addColorStop(1, 'rgba(160,200,240,0.5)');
          ctx.fillStyle = winGrad;
          ctx.fillRect(wx, wy, ww, 16);
        } else {
          // Dark windows
          ctx.fillStyle = 'rgba(20,18,40,0.6)';
          ctx.fillRect(wx, wy, ww, 16);
        }
      }
    }

    // OMG Deals sign
    const signX = x + bw / 2 - 28;
    const signY = GROUND - bh + 6;
    ctx.fillStyle = lerpColor('#FF6500', '#CC4400', nightT * 0.5);
    ctx.fillRect(signX, signY, 56, 16);
    ctx.strokeStyle = 'rgba(255,180,80,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(signX, signY, 56, 16);
    // Sign glow at night
    if (nightT > 0.3) {
      ctx.save();
      ctx.globalAlpha = 0.25 * nightT;
      ctx.fillStyle = '#FF8800';
      ctx.fillRect(signX - 3, signY - 3, 62, 22);
      ctx.restore();
    }
    ctx.fillStyle = 'white';
    ctx.font = 'bold 7px Arial';
    ctx.fillText('OMG Deals', signX + 4, signY + 11);
  });

  // === HORIZON HAZE ===
  const hazeGrad = ctx.createLinearGradient(0, GROUND - 40, 0, GROUND);
  if (speed < 8) {
    hazeGrad.addColorStop(0, 'rgba(180,220,255,0)');
    hazeGrad.addColorStop(1, 'rgba(200,230,255,0.3)');
  } else if (speed < 12) {
    hazeGrad.addColorStop(0, 'rgba(255,100,50,0)');
    hazeGrad.addColorStop(1, 'rgba(255,80,30,0.2)');
  } else {
    hazeGrad.addColorStop(0, 'rgba(60,20,80,0)');
    hazeGrad.addColorStop(1, 'rgba(40,10,60,0.3)');
  }
  ctx.fillStyle = hazeGrad;
  ctx.fillRect(0, GROUND - 40, W, 40);
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
        if (ui === 'menu') start();
        else if (ui === 'gameover' && !showSubmit) start();
        else if (ui === 'playing') jump();
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

      // Spawn balloons (Bad Deal) at speed >= 12
      if (s.speed >= 12 && s.f % 120 === 0) {
        const floatY = 60 + Math.random() * 160;
        s.balloons.push({ x: W + 30, y: floatY, bob: Math.random() * Math.PI * 2 });
      }
      s.balloons.forEach(b => { b.x -= s.speed; b.bob += 0.04; b.y += Math.sin(b.bob) * 0.8; });
      s.balloons = s.balloons.filter(b => b.x > -60);

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

      // Balloon collision
      if (s.inv === 0) {
        for (const b of s.balloons) {
          const hx = PX + 10, hw = GUS_W - 20, hy = s.py + 12, hh = GUS_H - 16;
          const bdy = b.y + Math.sin(b.bob) * 6;
          if (hx + hw > b.x && hx < b.x + 36 && hy < bdy + 52 && hy + hh > bdy) {
            s.lives--; s.inv = 80; s.pvy = -8;
            if (s.lives <= 0) dead = true;
            s.balloons = s.balloons.filter(bb => bb !== b);
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
      drawBackground(ctx, s.boff, s.speed);

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

      // Bad Deal Balloons
      s.balloons.forEach(b => drawBalloon(ctx, b));

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
    if (ui === 'menu') start();
    else if (ui === 'gameover' && !showSubmit) start();
    else if (ui === 'playing') jump();
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
        <div className="flex flex-col self-center">
          <p className="text-white/60 text-xs">SPACE / TAP to jump • Double jump available!</p>
          <p className="text-white/60 text-xs">Mobile: Tap in game screen to jump. Double Tap to double jump.</p>
        </div>
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