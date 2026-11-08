// "Quang Trung đại phá quân Thanh" — 60 giây, thế giới low-poly three.js + nét mực + nhân vật 2D (RevidAPI).
// (InkPass) + flat toon character cards drawn by toon.ts, colour grade last. One shot per narration sentence.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { Pen, bodyFront, Outfit, Expr, INK, SKINS, fxPuff, fxBurst } from "../dong-co/toon";
import { Pool, Req } from "../dong-co/cast";
import { InkPass, NOINK, noInkFallback } from "../dong-co/ink";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../dong-co/grade";

const FPS = 30;
import VO from "../vo.json";
// độ dài giọng đọc thật (dung.sh ghi vào src/vo.json) — các cảnh co giãn theo nó
const VO_LEN = (VO as { len: number }).len || 47.14, K = VO_LEN / 47.14;
export const QT_FRAMES = Math.ceil((2.0 + VO_LEN + 10.86) * 30);
// shot starts (s) = narration sentence starts + 2 s lead-in
const T = [0, 8.2, 14.5, 18.4, 24.0, 28.8, 34.7, 36.7, 41.7].map(x => x * K).concat(QT_FRAMES / 30);
const CAP = ["Thăng Long · cuối năm 1788", "Phú Xuân · 22/12/1788", "Hành quân thần tốc", "Tam Điệp · ăn Tết sớm", "Hà Hồi · đêm 30 Tết",
  "Ngọc Hồi · mùng 5 Tết", "Đống Đa", "Sông Nhị Hà", "Thăng Long · trưa mùng 5 Tết Kỷ Dậu"];
const SUB = [
  "Cuối năm Mậu Thân 1788, hai mươi chín vạn quân Thanh tràn qua biên giới, chiếm Thăng Long.",
  "Tại Phú Xuân, Nguyễn Huệ lên ngôi hoàng đế, niên hiệu Quang Trung, rồi lập tức thân chinh ra Bắc.",
  "Quân đi thần tốc, ba người khiêng võng một người, thay phiên nhau, ngày đêm không nghỉ.",
  "Đến Tam Điệp, vua cho quân ăn Tết trước, hẹn mùng bảy vào Thăng Long mở tiệc lớn.",
  "Đêm 30 Tết, quân Tây Sơn vượt sông Gián, vây đồn Hà Hồi. Quân Thanh hoảng sợ, xin hàng.",
  "Rạng sáng mùng 5, quân ta đánh đồn Ngọc Hồi. Ván gỗ bọc rơm ướt che đạn, voi chiến xông lên, phá tan đồn giặc.",
  "Cùng lúc ở Đống Đa, Sầm Nghi Đống thắt cổ tự vẫn.",
  "Tôn Sĩ Nghị không kịp mặc giáp, không kịp đóng yên ngựa, tháo chạy qua sông Nhị Hà.",
  "Trưa mùng 5 Tết, vua Quang Trung tiến vào Thăng Long, áo bào sạm đen khói súng. Sớm hơn hai ngày so với lời hẹn.",
];
const VO_AT = 2.0;
// phụ đề ngắn: cắt theo dấu câu rồi theo từ, mỗi mảnh <= 30 ký tự, chạy theo tỉ lệ số chữ
const chunks = (txt: string) => { const out: string[] = []; for (const part of txt.split(/(?<=[,.])\s+/)) { let cur = ""; for (const w of part.split(" ")) { if ((cur + " " + w).trim().length > 30 && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); } if (cur) out.push(cur); } return out; };
const subAt = (id: number, s: number) => { const a = Math.max(T[id], VO_AT), b = Math.min(T[id + 1], VO_AT + VO_LEN + 0.4), cs = chunks(SUB[id]), tot = cs.reduce((n, c) => n + c.length, 0); let acc = 0;
  for (const c of cs) { acc += c.length; if (s < a + (b - a) * acc / tot) return c; } return cs[cs.length - 1]; };
const shotAt = (s: number) => { let i = 0; while (i < 8 && s >= T[i + 1]) i++; return i; };

// ---------------- outfits ----------------
const TS = (v: number, gun = false): Outfit => ({ jacket: ["#6b4a2e", "#2f3f5a", "#7a3a26"][v % 3], pants: "#2a2622", boots: INK, hat: "khan", cap: v % 2 ? "#c0353a" : "#d2452f",
  belt: null, sash: "#c0353a", rifle: gun, sword: !gun, skin: SKINS[v % 4], moustache: v % 4 === 1 ? "#2a201a" : undefined });
const QING = (v: number): Outfit => ({ jacket: v % 2 ? "#2f5d9a" : "#36508a", pants: "#2b2f3a", boots: INK, hat: "qing", cap: "#d9b46a", belt: null,
  rifle: v % 3 !== 0, sword: v % 3 === 0, skin: SKINS[(v + 1) % 4], moustache: v % 3 === 2 ? "#2a201a" : undefined });
const KING = (smoke = false): Outfit => ({ jacket: smoke ? "#8c6f3e" : "#e3b23c", pants: "#7a2a1e", boots: INK, hat: "crown", cap: "#e8c45a", sash: "#c0353a",
  sword: true, moustache: "#2a201a", build: "stout", skin: SKINS[1] });
const NGHI: Outfit = { jacket: "#ece5d2", pants: "#2b2f3a", boots: INK, hat: "hair", hair: "#1d1b22", moustache: "#2a201a", build: "stout", skin: SKINS[2] };
const DONG: Outfit = { jacket: "#2a4a7a", pants: "#22252e", boots: INK, hat: "qing", cap: "#c0353a", sash: "#e8c45a", moustache: "#2a201a", build: "stout", skin: SKINS[0] };
const FOLK = (v: number): Outfit => ({ jacket: ["#6f8a5a", "#9a6b3e", "#5f6f8a", "#a8584a"][v % 4], pants: "#3b3530", boots: "#5a3b2a", hat: v % 2 ? "hair" : "khan",
  hair: "#1d1b22", cap: "#4a3a30", skin: SKINS[v % 4] });

// ---------------- 2D props drawn with the toon Pen ----------------
const drawElephant = (p: Pen, step: number) => { // 900x700 canvas, facing right, feet at y 680
  const g = "#8d8a94", d = "#6d6a75", lg = (x: number, ph: number) => p.poly([[x - 34, 470], [x + 34, 470], [x + 30 + ph, 680], [x - 30 + ph, 680]], d, 10);
  const s = Math.sin(step * Math.PI * 2) * 22;
  lg(250, s); lg(560, -s);
  p.ell(400, 400, 260, 170, g, 12);
  lg(330, -s); lg(640, s);
  p.ell(690, 310, 120, 120, g, 12);
  p.line([[760, 340], [810, 450], [800, 560], [840, 600]], g, 46);
  p.poly([[700, 380], [800, 430], [770, 395]], "#f4efe2", 8);
  p.ell(620, 300, 70, 105, d, 10);
  p.ell(720, 280, 9, 9, INK, 0);
  p.poly([[230, 240], [560, 240], [600, 330], [200, 330]], "#c0353a", 10);
  p.band([[230, 285], [570, 285]], "#e8c45a", 14, 3);
  p.line([[150, 380], [120, 470]], d, 18);
};
const drawHammock = (p: Pen, ph: number, v: number) => { // 1500x1000: two carriers + pole + hammock with a resting soldier
  const g = p.g;
  const carrier = (x: number, k: number) => { g.save(); g.translate(x, 0); g.scale(1, 1); bodyFront(p, TS(v + k), { phase: ph + k * 0.5, mode: "march", expr: "stern", facing: 1, seed: v * 7 + k }); g.restore(); };
  carrier(-60, 0);
  p.line([[180, 520], [1270, 520]], "#7a5a34", 22);
  p.poly([[330, 525], [1120, 525], [1000, 720], [450, 720]], "#d9c08a", 10);
  p.ell(560, 640, 70, 62, SKINS[v % 4], 10);
  p.ell(560, 600, 72, 32, "#c0353a", 8, 180, 360);
  p.ell(800, 690, 230, 50, "#8f3326", 10, 180, 360);
  carrier(840, 1);
};
const drawFlame = (p: Pen, k: number) => { // 300x500
  const w = 1 + 0.12 * Math.sin(k * 2.1);
  p.poly([[150 - 110 * w, 470], [150 - 70, 260], [150 - 10 + 20 * Math.sin(k), 30], [150 + 80, 250], [150 + 110 * w, 470]], "#f07a24", 10);
  p.poly([[150 - 60, 470], [150 - 30, 320], [150 + 10 * Math.cos(k), 170], [150 + 45, 320], [150 + 60, 470]], "#ffd34d", 0);
};
const drawPeach = (p: Pen, seed: number) => { // 600x800 tree card
  p.line([[300, 790], [290, 520], [220, 360], [300, 520], [380, 330]], "#5a3b2a", 26);
  for (let i = 0; i < 46; i++) {
    const a = (i * 137.5 * Math.PI) / 180, r = 40 + ((i * 53 + seed * 31) % 210);
    const x = 300 + r * Math.cos(a), y = 300 + r * 0.7 * Math.sin(a);
    p.ell(x, y, 30, 30, i % 5 ? "#f39ab8" : "#fbd2df", 6);
  }
};
const drawSmoke = (p: Pen, t: number) => { for (let i = 0; i < 6; i++) p.ell(250 + 120 * Math.sin(i * 2.3 + t), 300 - i * 40 - 60 * t, 110 - i * 8, 90 - i * 6, `rgba(150,144,150,${(0.55 * (1 - t)).toFixed(3)})`, 0); };
const drawShield = (p: Pen) => { // straw-wrapped plank 500x700
  p.poly([[40, 680], [40, 60], [460, 30], [460, 680]], "#c9a35a", 12);
  for (let y = 100; y < 660; y += 55) p.stroke([[50, y], [450, y - 18]], 6, "#8f6d30");
  p.band([[30, 220], [470, 190]], "#6d5226", 26, 4); p.band([[30, 520], [470, 500]], "#6d5226", 26, 4);
};

// ---------------- the world ----------------
type Spec = { key: string; cw: number; ch: number; k: number; draw: (p: Pen) => void; x: number; z: number; y?: number; h: number; mirror?: boolean; shadow?: boolean; glow?: boolean };
const lam = (c: string) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const M = (geo: THREE.BufferGeometry, c: string, x: number, y: number, z: number, ry = 0, grp?: THREE.Object3D) => {
  const m = new THREE.Mesh(geo, lam(c)); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; grp?.add(m); return m;
};
const box = (g: THREE.Object3D, w: number, h: number, d: number, c: string, x: number, y: number, z: number, ry = 0) => M(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, ry, g);
const hill = (g: THREE.Object3D, r: number, h: number, c: string, x: number, z: number) => { const m = M(new THREE.SphereGeometry(r, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), c, x, 0, z, x, g); m.scale.y = h / r; return m; };
const tree = (g: THREE.Object3D, x: number, z: number, s = 1, c = "#3f7a3a") => { M(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.4 * s, 6), "#6a4a2e", x, 0.7 * s, z, 0, g); M(new THREE.IcosahedronGeometry(1.1 * s, 0), c, x, 2.1 * s, z, x * 3, g); };
const roof = (g: THREE.Object3D, w: number, d: number, h: number, c: string, x: number, y: number, z: number) => { // mái cong đầu đao
  const m = M(new THREE.ConeGeometry(1, h, 4, 1), c, x, y + h / 2, z, Math.PI / 4, g); m.scale.set(w * 0.75, 1, d * 0.75);
  box(g, w * 1.02, 0.18, d * 1.02, c, x, y, z); box(g, w * 0.3, 0.22, 0.3, c, x, y + h * 0.93, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const t = M(new THREE.ConeGeometry(0.16, 0.9, 5), c, x + sx * w * 0.52, y + 0.35, z + sz * d * 0.52, 0, g); t.rotation.z = -sx * 0.7; t.rotation.x = sz * 0.5; }
  return m; };
const bamboo = (g: THREE.Object3D, x: number, z: number, n = 7) => { for (let i = 0; i < n; i++) { const h = 5 + ((i * 37) % 5), ox = x + (i - n / 2) * 0.35, c = M(new THREE.CylinderGeometry(0.07, 0.09, h, 5), "#7fa24a", ox, h / 2, z + (i % 3) * 0.3, 0, g); c.rotation.z = (i % 2 ? 1 : -1) * 0.08 * (i % 3);
  M(new THREE.IcosahedronGeometry(0.9, 0), i % 2 ? "#4f7f34" : "#5e9440", ox, h - 0.3, z + (i % 3) * 0.3, i, g); } };
const wall = (g: THREE.Object3D, x0: number, x1: number, z: number, h = 3.2, c = "#8a8378") => {
  box(g, x1 - x0, h, 1.6, c, (x0 + x1) / 2, 0, z);
  box(g, x1 - x0 + 0.4, 0.35, 2.2, "#6a3a2a", (x0 + x1) / 2, h, z); // mái ngói ốp đầu tường, không răng cưa
};
const gate = (g: THREE.Object3D, x: number, z: number, c = "#8a8378", rc = "#5a3a2a") => {
  box(g, 3, 4.6, 2.2, c, x - 2.6, 0, z); box(g, 3, 4.6, 2.2, c, x + 2.6, 0, z); box(g, 8.2, 1.4, 2.2, c, x, 4.6, z);
  box(g, 6.6, 1.8, 2.6, "#a8342a", x, 6.0, z); roof(g, 10, 4.4, 1.5, rc, x, 7.8, z); box(g, 5, 1.2, 2.2, "#a8342a", x, 9.3, z); roof(g, 7, 3.4, 1.4, rc, x, 10.5, z);
};
const flagPole = (g: THREE.Object3D, x: number, z: number, c: string, hgt = 5) => { M(new THREE.CylinderGeometry(0.05, 0.05, hgt, 5), "#5a3b2a", x, hgt / 2, z, 0, g); const f = box(g, 1.4, 0.9, 0.04, c, x + 0.72, hgt - 1.0, z); f.userData.flag = 1; return f; };

class Shot {
  g = new THREE.Group();
  sky = "#a9cbe8"; fog = "#c7dbe9"; night = false; ground = "#9cb36a";
  constructor() { this.g.visible = false; }
}

const buildShots = () => {
  const S: Shot[] = [];
  const base = (sh: Shot, gc: string) => { const m = M(new THREE.PlaneGeometry(400, 400), gc, 0, 0, 0, 0, sh.g); m.rotation.x = -Math.PI / 2; m.castShadow = false; };
  // 0 Thăng Long taken: wall + gate, hills, Qing column marching in
  { const s = new Shot(); base(s, "#9cb36a"); wall(s.g, -30, -4.1, -14); wall(s.g, 4.1, 30, -14); gate(s.g, 0, -14);
    for (let i = 0; i < 6; i++) hill(s.g, 10 + i * 2, 6 + (i % 3) * 3, "#6f9a58", -40 + i * 16, -50 - (i % 2) * 15);
    for (let i = 0; i < 5; i++) flagPole(s.g, -14 + i * 7, -13, "#e8c45a", 6.5); bamboo(s.g, -20, -10); bamboo(s.g, 19, -11);
    s.sky = "#9cb9d6"; S.push(s); }
  // 1 Phú Xuân palace
  { const s = new Shot(); base(s, "#b9a77e"); box(s.g, 18, 0.8, 9, "#c9b48a", 0, 0, -10);
    for (let i = 0; i < 6; i++) M(new THREE.CylinderGeometry(0.25, 0.25, 4.2, 8), "#a8342a", -6.5 + i * 2.6, 2.9, -7.2, 0, s.g);
    box(s.g, 16, 4.2, 4, "#d9cdb0", 0, 0.8, -11); roof(s.g, 21, 9, 3.2, "#d9a43a", 0, 5, -10); roof(s.g, 12, 5, 1.6, "#d9a43a", 0, 7.8, -10);
    for (let i = 0; i < 4; i++) { flagPole(s.g, -9 + i * 6, -4, "#c0353a", 5.5); }
    for (let i = 0; i < 5; i++) tree(s.g, -22 + i * 11, -24 - (i % 2) * 5, 1.5);
    s.sky = "#9ec4e6"; S.push(s); }
  // 2 march through hills (road along x)
  { const s = new Shot(); base(s, "#8fae5f"); const r = M(new THREE.PlaneGeometry(400, 4), "#c9ae7e", 0, 0.01, 0, 0, s.g); r.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 14; i++) hill(s.g, 8 + (i % 4) * 3, 5 + (i % 3) * 4, i % 2 ? "#5f8f4f" : "#76a35c", -70 + i * 11, -22 - (i % 3) * 12); for (let i = 0; i < 6; i++) bamboo(s.g, -30 + i * 12, -9 - (i % 2) * 3, 5);
    for (let i = 0; i < 16; i++) tree(s.g, -60 + i * 8.3, 6 + (i % 3) * 2.5, 1 + (i % 2) * 0.4);
    s.sky = "#b8d2e8"; S.push(s); }
  // 3 Tam Điệp camp, early Tết: tents, peach trees (cards), red banners
  { const s = new Shot(); base(s, "#93a85e"); for (let i = 0; i < 5; i++) { const x = -12 + i * 6; roof(s.g, 4, 4, 2.6, i % 2 ? "#d8c79a" : "#c9b483", x, 0, -10 - (i % 2) * 3); }
    for (let i = 0; i < 6; i++) flagPole(s.g, -15 + i * 6, -6, "#c0353a", 5);
    for (let i = 0; i < 6; i++) hill(s.g, 14, 12 + (i % 3) * 5, "#5a7e4c", -45 + i * 18, -40);
    s.sky = "#f0c79a"; s.fog = "#f2cfa6"; S.push(s); }
  // 4 Hà Hồi at night
  { const s = new Shot(); base(s, "#3c4a3a"); wall(s.g, -16, -3.1, -12, 3.6, "#6a6a72"); wall(s.g, 3.1, 16, -12, 3.6, "#6a6a72"); gate(s.g, 0, -12, "#6a6a72", "#3a2a24");
    const rv = M(new THREE.PlaneGeometry(400, 6), "#2a4a6a", 0, 0.02, 6, 0, s.g); rv.rotation.x = -Math.PI / 2;
    s.sky = "#1a2240"; s.fog = "#1d2744"; s.night = true; S.push(s); }
  // 5 Ngọc Hồi charge: fort far, straw shields, elephants (cards)
  { const s = new Shot(); base(s, "#8a9a5a"); wall(s.g, -25, -3.1, -26); wall(s.g, 3.1, 25, -26); gate(s.g, 0, -26);
    for (let i = 0; i < 6; i++) flagPole(s.g, -16 + i * 6.5, -25, "#2f5d9a", 7);
    s.sky = "#d9b48f"; s.fog = "#d6b796"; S.push(s); }
  // 6 Đống Đa mound
  { const s = new Shot(); base(s, "#7f8a52"); hill(s.g, 7, 3, "#6d7a46", 0, -8); for (let i = 0; i < 4; i++) tree(s.g, -12 + i * 8, -18, 1.3, "#4d6a3a");
    s.sky = "#b7a48c"; s.fog = "#b9a690"; S.push(s); }
  // 7 Nhị Hà river, broken pontoon
  { const s = new Shot(); base(s, "#8fa45e"); const rv = M(new THREE.PlaneGeometry(400, 26), "#4a7fa6", 0, 0.03, -10, 0, s.g); rv.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 12; i++) box(s.g, 1.6, 0.3, 2.4, "#7a5a34", -4 + (i % 2) * 0.4, 0.05, -1 - i * 2.0, (i % 3 - 1) * 0.3);
    for (let i = 0; i < 8; i++) tree(s.g, -30 + i * 8, -28, 1.2);
    s.sky = "#a9c4dc"; S.push(s); }
  // 8 Thăng Long entry: big gate, crowd, banners
  { const s = new Shot(); base(s, "#a9b57a"); wall(s.g, -30, -4.1, -16); wall(s.g, 4.1, 30, -16); gate(s.g, 0, -16);
    const road = M(new THREE.PlaneGeometry(5, 40), "#c9ae7e", 0, 0.02, 0, 0, s.g); road.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 8; i++) flagPole(s.g, i < 4 ? -4 - i * 3 : 4 + (i - 4) * 3, -6 + (i % 4) * 4, "#c0353a", 5); bamboo(s.g, -18, -12); bamboo(s.g, 18, -12);
    s.sky = "#a8cbe8"; S.push(s); }
  return S;
};

// ---------------- per-shot cast + camera ----------------
type Cam = { from: [number, number, number]; to: [number, number, number]; look: [number, number, number]; look2?: [number, number, number] };
const CAMS: Cam[] = [
  { from: [0, 3, 22], to: [0, 2.2, 13], look: [0, 3, -10] },
  { from: [0, 1.9, 9], to: [0, 1.5, -0.3], look: [0, 1.7, -6] },
  { from: [-6, 2.4, 14], to: [6, 2.4, 14], look: [-6, 1.3, 0], look2: [6, 1.3, 0] },
  { from: [-3, 1.9, 9], to: [2, 2.1, 8], look: [0, 1.4, -2] },
  { from: [0, 2.2, 14], to: [0, 2.6, 10], look: [0, 2.2, -10] },
  { from: [0, 1.6, 9], to: [0, 1.8, 3], look: [0, 1.8, -10] },
  { from: [3, 1.6, 6.5], to: [0, 1.7, 5.5], look: [0, 1.5, -6] },
  { from: [8, 2.4, 8], to: [4, 2.0, 6], look: [-4, 1.0, -6] },
  { from: [0, 1.7, 16], to: [0, 2.1, 7.5], look: [0, 2.0, -8], look2: [0, 2.4, -8] },
];
const sm = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const q = (x: number, n = 8) => Math.floor(((x % 1) + 1) % 1 * n) / n;
const body = (key: string, o: Outfit, x: number, z: number, opt: { phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall"; facing?: -1 | 0 | 1; wave?: number; seed?: number; tilt?: number }, h = 2.16, k = 0.4): Spec =>
  ({ key: `${key}|${JSON.stringify(opt)}`, cw: 600, ch: 1000, k, draw: (p) => bodyFront(p, o, opt as any), x, z, h, shadow: true });

const castFor = (id: number, t: number, f: number): Spec[] => {
  const c: Spec[] = [];
  const mk = (n: number, fn: (i: number) => Spec | null) => { for (let i = 0; i < n; i++) { const s = fn(i); if (s) c.push(s); } };
  if (id === 0) { // Qing column marching toward the gate (away/toward camera), flags
    mk(24, (i) => { const row = Math.floor(i / 4), col = i % 4, z = 8 - row * 3.2 - t * 1.2; if (z < -12) return null;
      return body(`q${i % 6}`, QING(i), -2.4 + col * 1.6, z, { phase: q(t * 1.6 + i * 0.13), mode: "march", expr: i % 3 ? "stern" : "grin", seed: i }); });
  } else if (id === 1) { // the emperor + guards
    c.push(body("king", KING(), 0, -5.2, { mode: "stand", expr: "stern", seed: 3, wave: t > 2.5 ? Math.min(1, (t - 2.5) * 2) : 0 }, 2.16, 1));
    mk(8, (i) => body(`g${i}`, TS(i, i % 2 === 0), (i < 4 ? -2.4 - (i % 4) * 1.5 : 2.4 + (i % 4) * 1.5), -3.2 + (i % 4) * 0.9, { mode: "stand", expr: "stern", seed: 20 + i, facing: i < 4 ? 1 : -1 }));
  } else if (id === 2) { // march + hammock teams along the road (x)
    mk(10, (i) => { const x = -26 + i * 5.2 + t * 2.6; const ph = q(t * 2 + i * 0.3, 8);
      if (i % 3 === 1) return { key: `ham${i % 2}|${ph}`, cw: 1500, ch: 1000, k: 0.4, draw: (p) => drawHammock(p, ph, i), x, z: 0.2, h: 2.16, shadow: true };
      return body(`m${i % 5}`, TS(i, i % 2 === 0), x, 0.2 + (i % 2) * 0.6, { phase: ph, mode: "march", expr: "stern", facing: 1, seed: 40 + i }); });
  } else if (id === 3) { // early Tết feast
    mk(5, (i) => ({ key: `peach${i}`, cw: 600, ch: 800, k: 0.4, draw: (p) => drawPeach(p, i), x: -10 + i * 5, z: -5 - (i % 2) * 2, h: 3.2 }));
    mk(9, (i) => body(`f${i}`, TS(i), -4 + (i % 5) * 2, -0.6 + Math.floor(i / 5) * 1.6, { mode: i < 5 ? "sit" : "stand", expr: (["laugh", "grin", "laugh", "relief_open", "grin"] as Expr[])[i % 5], seed: 60 + i, wave: i === 6 ? 0.8 * Math.abs(Math.sin(t * 3)) : 0 }));
    c.push(body("king3", KING(), 3.2, -2.4, { mode: "stand", expr: "grin", seed: 3, wave: 0.7 }, 2.16, 0.7));
  } else if (id === 4) { // night siege: torches, soldiers crossing, Qing on the wall surrender
    mk(8, (i) => ({ key: `fl${i % 3}|${Math.floor(f / 3) % 6}`, cw: 300, ch: 500, k: 0.4, draw: (p) => drawFlame(p, Math.floor(f / 3) % 6 + i), x: -10 + i * 2.8, z: 2.5 + (i % 2) * 2, y: 1.8, h: 0.8, glow: true }));
    mk(10, (i) => body(`n${i % 5}`, TS(i, true), -9 + i * 2, 3 + (i % 2) * 1.5 - t * 1.5, { phase: q(t * 2 + i * 0.2), mode: "march", expr: "stern", seed: 80 + i }));
    mk(5, (i) => body(`qs${i}`, QING(i), -6 + i * 3, -10.0, { mode: "stand", expr: t > 2 ? "shock" : "nervous", wave: t > 2.3 ? 1 : 0, seed: 90 + i }, 2.16, 0.4));
    c.forEach((s) => { if (s.key.startsWith("qs")) s.y = 3.6; });
  } else if (id === 5) { // charge: shields + elephants + smoke
    const adv = t * 1.6;
    mk(6, (i) => ({ key: "shield", cw: 500, ch: 700, k: 0.4, draw: drawShield, x: -6 + i * 2.4, z: -1 - adv, h: 2.0, shadow: true }));
    mk(6, (i) => body(`sh${i}`, TS(i), -6 + i * 2.4 + 0.5, -0.3 - adv, { phase: q(t * 2.4 + i * 0.25), mode: "march", expr: "stern", seed: 100 + i }, 2.16, 0.4));
    mk(2, (i) => ({ key: `el|${q(t * 1.2 + i * 0.5)}`, cw: 900, ch: 700, k: 0.4, draw: (p) => drawElephant(p, q(t * 1.2 + i * 0.5)), x: i ? 3.8 : -3.8, z: -7 - adv * 1.3, h: 4.0, mirror: i === 0, shadow: true }));
    mk(5, (i) => { const tt = ((t * 0.7 + i * 0.21) % 1); return { key: `sm|${q(tt, 10)}`, cw: 500, ch: 500, k: 0.3, draw: (p) => drawSmoke(p, q(tt, 10)), x: -10 + i * 5, z: -20 + (i % 2) * 3, y: 1 + tt * 4, h: 6 }; });
    mk(3, (i) => { const tt = ((t * 0.9 + i * 0.37) % 1); return { key: `bu|${q(tt, 8)}`, cw: 500, ch: 500, k: 0.3, draw: (p) => fxBurst(p, q(tt, 8), "#ffd34d"), x: -8 + i * 8, z: -24, y: 3, h: 4, glow: true }; });
  } else if (id === 6) { // Đống Đa: Qing general falls, smoke
    c.push(body("dong", DONG, 0, -0.3, { mode: t > 0.9 ? "fall" : "stand", expr: t > 0.9 ? "dazed" : "shock", seed: 5 }, 2.16, 0.7));
    c[0].y = 0;
    mk(4, (i) => { const tt = ((t * 0.5 + i * 0.25) % 1); return { key: `sm6|${q(tt, 10)}`, cw: 500, ch: 500, k: 0.3, draw: (p) => drawSmoke(p, q(tt, 10)), x: -5 + i * 3.3, z: -7, y: 1 + tt * 3, h: 5 }; });
  } else if (id === 7) { // Tôn Sĩ Nghị flees across the pontoon, soldiers scramble, splashes
    c.push(body("nghi", NGHI, -3.8, -2 - t * 2.4, { phase: q(t * 3), mode: "march", expr: "shock", seed: 9, facing: -1 }, 2.16, 0.7));
    mk(6, (i) => body(`fq${i}`, QING(i), -5 + (i % 3) * 1.6, 2 - (i % 2) * 1.5 - t * 2.2, { phase: q(t * 3 + i * 0.3), mode: i === 4 ? "fall" : "march", expr: i % 2 ? "shock" : "nervous", seed: 120 + i }, 2.16, 0.4));
    mk(4, (i) => { const tt = (t * 0.8 + i * 0.25) % 1; return { key: `sp|${q(tt, 8)}`, cw: 300, ch: 300, k: 0.4, draw: (p) => fxPuff(p, q(tt, 8)), x: -7 + i * 2.2, z: -6 - i * 2, y: 0.1, h: 1.6 }; });
  } else { // 8 triumphant entry
    const z = 4 - Math.min(t, 9) * 0.55;
    c.push(body("king8", KING(true), 0, z, { phase: q(t * 1.2), mode: "stroll", expr: t > 5 ? "grin" : "stern", seed: 3, wave: t > 4 ? 0.9 : 0 }, 2.16, 1));
    mk(6, (i) => body(`e${i}`, TS(i, i % 2 === 1), (i % 2 ? 1.4 : -1.4), z + 1.6 + Math.floor(i / 2) * 1.6, { phase: q(t * 1.2 + i * 0.2), mode: "stroll", expr: "grin", seed: 140 + i }));
    mk(12, (i) => body(`c${i % 8}`, FOLK(i), (i % 2 ? 1 : -1) * (3.6 + Math.floor(i / 6) * 1.4), 3 - (i % 6) * 2.2, { mode: "stand", expr: i % 3 ? "laugh" : "grin", wave: 0.5 + 0.5 * Math.abs(Math.sin(t * 4 + i)), seed: 160 + i, facing: i % 2 ? -1 : 1 }));
  }
  return c;
};

// ---------------- renderer side ----------------
const CARD = (() => { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0); return g; })();
const blobTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const g = cv.getContext("2d")!; const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, "rgba(0,0,0,0.45)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();

class World {
  root = new THREE.Group(); shots = buildShots(); pool = new Pool();
  cards: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; b: THREE.Mesh }[] = [];
  hemi = new THREE.HemisphereLight("#dcecff", "#7a6a50", 1.1); sun = new THREE.DirectionalLight("#fff1dc", 2.2);
  fire = new THREE.PointLight("#ff9a40", 0, 30, 1.5);
  constructor() {
    for (const s of this.shots) this.root.add(s.g);
    this.sun.position.set(18, 26, 14); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.far = 120; this.sun.shadow.bias = -0.0005;
    this.root.add(this.hemi, this.sun, this.sun.target, this.fire);
  }
  card(i: number) {
    while (this.cards.length <= i) {
      const mat = new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: true });
      const m = new THREE.Mesh(CARD, mat); m.layers.set(NOINK); m.renderOrder = 1;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
      b.rotation.x = -Math.PI / 2; b.layers.set(NOINK);
      this.root.add(m, b); this.cards.push({ m, mat, b });
    }
    return this.cards[i];
  }
  update(f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const s = f / FPS, id = shotAt(s), t = s - T[id], dur = T[id + 1] - T[id], u = sm(t / dur);
    this.shots.forEach((sh, i) => (sh.g.visible = i === id));
    const sh = this.shots[id];
    scene.background = new THREE.Color(sh.sky);
    scene.fog = new THREE.Fog(sh.fog, 30, 160);
    this.hemi.intensity = sh.night ? 0.35 : 1.1; this.hemi.color.set(sh.night ? "#5a6aa8" : "#dcecff");
    this.sun.intensity = sh.night ? 0.25 : id === 3 || id === 5 ? 2.0 : 2.3; this.sun.color.set(sh.night ? "#8aa0e0" : id === 3 || id === 5 ? "#ffcf9a" : "#fff1dc");
    this.fire.intensity = sh.night ? 60 * (1 + 0.15 * Math.sin(f * 0.9)) : 0; this.fire.position.set(0, 3, 3);
    sh.g.traverse((o) => { if (o.userData.flag) o.rotation.y = 0.25 * Math.sin(f * 0.15 + o.position.x); });
    // camera
    const c = CAMS[id], L = (a: number[], b: number[]) => new THREE.Vector3(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u);
    cam.position.copy(L(c.from, c.to)); const look = L(c.look, c.look2 ?? c.look);
    cam.position.y += 0.03 * Math.sin(f * 0.21); cam.lookAt(look); cam.updateMatrixWorld();
    // cards
    const specs = castFor(id, t, f);
    const reqs: Req[] = specs.map((sp) => this.pool.req(sp.key, Math.round(sp.cw * sp.k), Math.round(sp.ch * sp.k), sp.k, sp.draw));
    this.pool.flush();
    const tint = sh.night ? new THREE.Color(0.55, 0.58, 0.85) : id === 3 || id === 5 ? new THREE.Color(1.0, 0.9, 0.8) : new THREE.Color(1, 0.97, 0.95);
    specs.forEach((sp, i) => {
      const cd = this.card(i), w = (sp.h * sp.cw) / sp.ch;
      cd.mat.map = reqs[i].tex!; cd.mat.needsUpdate = cd.mat.userData.t !== reqs[i].tex; cd.mat.userData.t = reqs[i].tex;
      cd.mat.color.copy(sp.glow ? new THREE.Color(1.6, 1.4, 1.2) : tint);
      cd.m.visible = true; cd.m.scale.set(sp.mirror ? -w : w, sp.h, 1); cd.m.position.set(sp.x, (sp.y ?? 0) - sp.h * 0.025, sp.z);
      cd.m.rotation.set(0, Math.atan2(cam.position.x - sp.x, cam.position.z - sp.z), 0);
      cd.b.visible = !!sp.shadow && !sh.night; cd.b.position.set(sp.x, 0.03, sp.z); cd.b.scale.set(w * 0.75, 0.9, 1);
    });
    for (let i = specs.length; i < this.cards.length; i++) { this.cards[i].m.visible = false; this.cards[i].b.visible = false; }
  }
}

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({ ink: new InkPass(scene, camera as THREE.PerspectiveCamera), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) }), [camera, scene]);
  world.update(f, camera as THREE.PerspectiveCamera, scene);
  noInkFallback(world.root);
  return (<>
    <primitive object={world.root} dispose={null} />
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  </>);
};

const font = "'Be Vietnam Pro', 'Helvetica Neue', Arial, sans-serif", serif = "'Noto Serif', Georgia, 'Times New Roman', serif";
export const QuangTrung: React.FC = () => {
  const f = useCurrentFrame(), s = f / FPS, id = shotAt(s), t = s - T[id];
  const capA = interpolate(t, [0.2, 0.7, T[id + 1] - T[id] - 0.6, T[id + 1] - T[id] - 0.1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleA = interpolate(s, [0.2, 0.8, 3.6, 4.4], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const endA = interpolate(s, [VO_AT + VO_LEN + 2.36, VO_AT + VO_LEN + 3.36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cut = interpolate(t, [0, 0.25], [1, 0], { extrapolateRight: "clamp" });
  const subOn = s >= VO_AT && s < VO_AT + VO_LEN + 0.5 && id < 9;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.2, far: 600 }}>
        <Inner />
      </ThreeCanvas>
      {id > 0 && cut > 0 && <AbsoluteFill style={{ background: "#000", opacity: cut }} />}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.55) 100%)" }} />
      {titleA > 0 && <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: titleA }}>
        <div style={{ textAlign: "center", color: "#fff4d6", fontFamily: serif, fontWeight: 800, textShadow: "0 6px 0 #241726, 0 0 30px rgba(0,0,0,0.6)", transform: `translateY(${-260 + (1 - titleA) * 30}px)` }}>
          <div style={{ fontSize: 120, letterSpacing: 6, color: "#ffd34d" }}>QUANG TRUNG</div>
          <div style={{ fontSize: 76, letterSpacing: 3 }}>ĐẠI PHÁ QUÂN THANH</div>
          <div style={{ fontSize: 44, marginTop: 18, fontFamily: font, fontWeight: 600 }}>Xuân Kỷ Dậu · 1789</div>
        </div>
      </AbsoluteFill>}
      {s > 4 && s < 52 && <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", opacity: capA }}>
        <span style={{ fontFamily: font, fontWeight: 700, fontSize: 46, color: "#fff4d6", background: "rgba(143,51,38,0.85)", padding: "12px 30px", borderRadius: 8, border: "3px solid #241726" }}>{CAP[id]}</span>
      </div>}
      {subOn && id < 9 && <div style={{ position: "absolute", bottom: 230, left: 60, right: 60, textAlign: "center" }}>
        <span style={{ fontFamily: font, fontWeight: 800, fontSize: 60, lineHeight: 1.3, color: "#fff", textShadow: "0 3px 0 #000, 0 0 12px #000, 3px 0 0 #000, -3px 0 0 #000" }}>{subAt(id, s)}</span>
      </div>}
      {endA > 0 && <AbsoluteFill style={{ background: `rgba(14,8,6,${0.82 * endA})`, justifyContent: "center", alignItems: "center", opacity: endA }}>
        <div style={{ textAlign: "center", color: "#fff4d6", fontFamily: serif, fontWeight: 800, textShadow: "0 6px 0 #241726, 0 0 28px rgba(0,0,0,0.8)", background: "rgba(143,51,38,0.92)", border: "6px solid #e8c45a", borderRadius: 18, padding: "56px 48px", maxWidth: 940, transform: `scale(${0.92 + 0.08 * endA})` }}>
          <div style={{ fontSize: 66, color: "#ffd34d", letterSpacing: 2 }}>Mùng 5 Tết Kỷ Dậu</div>
          <div style={{ fontSize: 128, margin: "18px 0", whiteSpace: "nowrap" }}>ĐẠI THẮNG</div>
          <div style={{ fontSize: 70 }}>Ngọc Hồi – Đống Đa</div>
          <div style={{ fontSize: 42, marginTop: 30, fontFamily: font, fontWeight: 600, color: "#ffe9b0" }}>Xuân 1789 · quét sạch 29 vạn quân Thanh</div>
        </div>
      </AbsoluteFill>}
    </AbsoluteFill>
  );
};
