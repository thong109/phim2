// Quang Trung đại phá quân Thanh — tranh khắc gỗ, khung dọc 1080×1920
// Mọi hình dựng bằng code (dao khắc + in giấy), không ảnh AI.
import * as WC from '/loi/dao-khac/index.js';
import { clamp, lerp, seg, ss, eio, mulberry } from '/loi/lib.js';

export const W = 1080, H = 1920, DUR = 60;
const IMG = { x: 36, y: 36, w: 1008, h: 1560 };
const PW = IMG.w, PH = IMG.h, PI = Math.PI;
const [M, m] = WC.canvas(W, H), [C, c] = WC.canvas(W, H);
let P;
const L = WC.light(.55, -.7, .5);
const SON = '#B8322A';                      // đỏ son: cờ, khăn, lửa, hoa đào

// ---------------- lời đọc (giây tính từ đầu video) ----------------
const VO = 2.0;
const SUB = [
  [0, 'Cuối năm Mậu Thân 1788, 29 vạn quân Thanh tràn qua biên giới, chiếm Thăng Long.'],
  [6.2, 'Tại Phú Xuân, Nguyễn Huệ lên ngôi hoàng đế, lấy niên hiệu Quang Trung, rồi lập tức thân chinh ra Bắc.'],
  [12.5, 'Quân đi thần tốc, cứ ba người khiêng võng một người, ngày đêm không nghỉ.'],
  [16.4, 'Đến Tam Điệp, vua cho quân ăn Tết trước, hẹn mùng 7 vào Thăng Long mở tiệc lớn.'],
  [22.0, 'Đêm 30 Tết, quân Tây Sơn vượt sông Gián, vây đồn Hà Hồi. Quân Thanh hoảng sợ, xin hàng.'],
  [26.8, 'Rạng sáng mùng 5, đánh đồn Ngọc Hồi. Ván gỗ bọc rơm ướt che đạn, voi chiến xông lên.'],
  [32.7, 'Cùng lúc ở Đống Đa, Sầm Nghi Đống thắt cổ tự vẫn.'],
  [34.7, 'Tôn Sĩ Nghị không kịp mặc giáp, không kịp đóng yên ngựa, tháo chạy qua sông Nhị Hà.'],
  [39.7, 'Trưa mùng 5 Tết, vua Quang Trung tiến vào Thăng Long, áo bào sạm đen khói súng.'],
  [44.6, 'Sớm hơn hai ngày so với lời hẹn.'],
].map(([s, text], i, a) => ({ t0: VO + s, t1: VO + (a[i + 1] ? a[i + 1][0] : 49.2) - .05, text }));
export const SUBS = SUB;
const CAP = ['THĂNG LONG · 1788', 'PHÚ XUÂN · 22/12/1788', 'ĐƯỜNG RA BẮC', 'TAM ĐIỆP', 'HÀ HỒI · ĐÊM 30 TẾT', 'NGỌC HỒI · MÙNG 5', 'ĐỐNG ĐA', 'SÔNG NHỊ HÀ', 'THĂNG LONG · TRƯA MÙNG 5', ''];
const T = [0, 8.2, 14.5, 18.4, 24.0, 28.8, 34.7, 36.7, 41.7, 51.5, 60];

// ---------------- tiện ích ----------------
const memo = new Map();
const S = (k, f) => memo.has(k) ? memo.get(k) : (memo.set(k, f()), memo.get(k));
const KEY = { down: (x, y) => clamp(y / PH), diag: (x, y) => clamp((x + y * .4) / (PW * 1.4)) };
const shp = (polys, o = {}) => { if (o.reveal && typeof o.reveal.key !== 'function') o = { ...o, reveal: { ...o.reveal, key: KEY[o.reveal.key] || KEY.diag } }; return WC.shape(polys, { light: L, R: 30, sp: 7, halo: 4, seg: [18, 60], res: 1.5, ...o }); };
const R = WC.rect, E = WC.ellipse;
function both(f) { f(m); f(c); }
function put(x, y, s, flip, fn) { both(g => { g.save(); g.translate(x, y); g.scale(flip ? -s : s, s); }); fn(); both(g => g.restore()); }
const red = (polys, a = 1) => { WC.fillPoly(m, polys, '#fff'); WC.plate(c, polys, a); };
const white = polys => WC.fillPoly(m, polys, '#fff');
const black = polys => WC.fillPoly(m, polys, '#000');
function cut(pts, w = 3, kind = 'v', seed = 1) { return WC.cutAlong(pts, { w, kind, seed, seg: [30, 110], gap: [1, 4] }); }
const drawCuts = (st, t = 1e9, col = '#fff') => WC.drawStrokes(m, st, { t, color: col });
function wave(x0, x1, y, amp, n, ph = 0) { const p = []; for (let i = 0; i <= 40; i++) { const u = i / 40; p.push([lerp(x0, x1, u), y + Math.sin(u * n * PI * 2 + ph) * amp]); } return p; }

// bầu trời: đường khắc ngang, sáng dần về chân trời
function sky(key, y0, y1, o = {}) {
  const ln = S('may' + key, () => { const r = mulberry(o.seed ?? 3), out = []; for (let i = 0; i < 7; i++) { const y = y0 + (y1 - y0) * (.15 + r() * .6), x = r() * PW; out.push(...cut(wave(x - 160, x + 160, y, 4, 1, i), 3, 'u', i)); } return out; });
  return { draw(g, t) { drawCuts(ln, t * 1.5, '#000'); } };
  return S('sky' + key, () => shp([R(-200, y0, PW + 400, y1 - y0)], {
    halo: 0, dir: 0, sp: o.sp ?? 13, kind: 'u', lo: .05, hi: .98, seg: [60, 220], gap: [4, 30], seed: o.seed ?? 3,
    tone: () => (x, y) => clamp(.82 + .18 * (o.k ?? .9) * Math.pow(seg(y, y0, y1), o.p ?? 1.4) + (o.add ?? 0)), reveal: { t0: 0, t1: 1.1, key: 'down' },
  }));
}
function hill(key, pts, o = {}) { return S('hill' + key, () => shp([pts], { sp: 9, R: 80, dir: o.dir, seed: o.seed ?? 7, reveal: { t0: .2, t1: 1.3 }, ...o })); }
function ridge(x0, x1, y, amp, seed, base = PH + 50) {
  const r = mulberry(seed), p = [[x0, base]];
  for (let i = 0; i <= 14; i++) { const u = i / 14; p.push([lerp(x0, x1, u), y - amp * (.5 + .5 * Math.sin(u * 7 + seed)) * (.6 + r() * .4)]); }
  p.push([x1, base]); return p;
}
function ground(y) { return; S('dat' + y, () => shp([R(-300, y, PW + 600, 900)], { halo: 0, dir: 0, sp: 10, kind: 'u', seg: [40, 160], gap: [6, 26], seed: y, tone: () => (x, yy) => clamp(.8 + .15 * seg(yy, y, y + 500)) })).draw(m); }
// tre: thân cong khắc trắng + lá chấm
function bamboo(key, x, y, h, n, seed) {
  return S('tre' + key, () => {
    const r = mulberry(seed), st = [];
    for (let i = 0; i < n; i++) {
      const bx = x + (r() - .5) * 120, lean = (r() - .5) * 140, pts = [];
      for (let k = 0; k <= 20; k++) { const u = k / 20; pts.push([bx + lean * u * u, y - h * u * (.8 + r() * .05)]); }
      st.push(...WC.cutAlong(pts, { w: 3, kind: 'v', seg: [24, 40], gap: [3, 5], seed: i + seed }));
      for (let k = 0; k < 14; k++) { const u = .4 + r() * .6, px = bx + lean * u * u, py = y - h * u * .82, a = -.4 + r() * .8 + (lean > 0 ? .5 : -.5);
        st.push(WC.mkStroke([[px, py], [px + Math.cos(a) * 26, py + Math.sin(a) * 10]], [5, 1], { kind: 'v', seed: k * 9 + i })); }
    }
    return st;
  });
}
// mái cong kiểu đình Việt, đầu đao vút lên
function roofPts(cx, y0, w, h) {
  return [[cx - .3 * w, y0], [cx + .3 * w, y0], [cx + .34 * w, y0 - .28 * h], [cx + .37 * w, y0 + .04 * h], [cx + .5 * w, y0 + .8 * h],
    [cx + .6 * w, y0 + .42 * h], [cx + .56 * w, y0 + h], [cx - .56 * w, y0 + h], [cx - .6 * w, y0 + .42 * h], [cx - .5 * w, y0 + .8 * h], [cx - .37 * w, y0 + .04 * h], [cx - .34 * w, y0 - .28 * h]];
}
function hall(key, cx, yb, w, tiers = 2) {   // nhà mái chồng diêm
  return S('hall' + key, () => {
    const out = [];
    const bodyH = w * .32;
    out.push(shp([R(cx - w * .42, yb - bodyH, w * .84, bodyH)], { dir: PI / 2, sp: 8, seed: 11, reveal: { t0: .3, t1: 1.4 } }));
    for (let i = 0; i < tiers; i++) {
      const ww = w * (1 - i * .28), y0 = yb - bodyH - w * .2 * (i + 1) - i * w * .1;
      out.push(shp([roofPts(cx, y0, ww, w * .22)], { dir: PI / 2 + .25, sp: 7, R: 50, seed: 20 + i, reveal: { t0: .5 + i * .2, t1: 1.6 } }));
    }
    return out;
  });
}
// cổng thành: tường gạch + vòm + lầu mái cong
function gate(key, cx, yb, w) {
  return S('gate' + key, () => {
    const h = w * .55, out = [];
    const wall = [[cx - w / 2, yb], [cx - w / 2, yb - h], [cx + w / 2, yb - h], [cx + w / 2, yb], [cx + w * .16, yb], [cx + w * .16, yb - h * .45]];
    for (let i = 0; i <= 10; i++) { const a = i / 10 * PI; wall.push([cx + Math.cos(a) * w * .16, yb - h * .45 - Math.sin(a) * w * .16]); }
    wall.push([cx - w * .16, yb]);
    out.push(shp([wall], { dir: 0, sp: 10, R: 40, seed: 31, reveal: { t0: .2, t1: 1.3 } }));
    out.push(shp([R(cx - w * .3, yb - h - w * .18, w * .6, w * .18)], { dir: PI / 2, sp: 8, seed: 32, reveal: { t0: .5, t1: 1.5 } }));
    out.push(shp([roofPts(cx, yb - h - w * .36, w * .78, w * .2)], { dir: PI / 2 + .25, sp: 7, seed: 33, reveal: { t0: .7, t1: 1.6 } }));
    out.push(shp([roofPts(cx, yb - h - w * .53, w * .5, w * .15)], { dir: PI / 2 + .25, sp: 7, seed: 34, reveal: { t0: .8, t1: 1.7 } }));
    return out;
  });
}
// gạch xây: vạch ngang so le
function bricks(x, y, w, h, s = 28) { for (let r = 0; r * s < h; r++) for (let k = -1; k * s * 2 < w; k++) { const bx = x + k * s * 2 + (r % 2) * s, by = y + r * s; if (bx > x && bx < x + w) drawCuts(S(`br${bx|0}_${by|0}`, () => cut([[bx, by], [bx + s * 1.7, by]], 2, 'k', bx + by))); } }

// ---------------- nhân vật ----------------
// hệ toạ độ: chân ở (0,0), cao ~200, mặt quay phải
function legs(p, stride = 22) { const a = [0, 1, 0, -1][p % 4] * stride; return [[[-9, -92], [3, -92], [4 + a * .5, 0], [-6 + a * .5, 0]], [[-3, -92], [9, -92], [6 - a * .5, 0], [-4 - a * .5, 0]]]; }
function person(kind, p = 0, o = {}) {
  return S(`p${kind}${p}${o.arm ?? ''}`, () => {
    const out = [], king = kind === 'king', qing = kind === 'qing';
    if (!king) for (const lg of legs(p, o.still ? 0 : 22)) out.push({ s: shp([lg], { sp: 5, halo: 3, seed: 2 }) });
    const robe = king ? [[-24, -168], [24, -168], [46, 0], [-46, 0]] : qing ? [[-22, -168], [22, -168], [27, -70], [-27, -70]] : [[-20, -166], [20, -166], [24, -84], [-24, -84]];
    out.push({ s: shp([robe], { sp: king ? 6 : 6, halo: 4, R: 26, seed: 5, dir: PI / 2 - .2 }) });
    if (king) out.push({ s: shp([[[-26, -92], [26, -92], [26, -80], [-26, -80]]], { white: true, sp: 6, halo: 2, seed: 6 }) }); // đai
    // tay cầm
    const ar = o.arm ?? 0; // 0 thẳng xuống/cầm giáo, 1 giơ lên
    const arm = ar ? [[10, -160], [20, -166], [52, -232], [44, -238]] : [[10, -160], [20, -162], [34, -104], [24, -100]];
    out.push({ s: shp([arm], { sp: 5, halo: 3, seed: 8 }) });
    out.push({ face: true, s: shp([E(3, -186, 15, 18, 24)], { white: true, sp: 5, halo: 3, R: 12, seed: 9, lo: .5 }) });
    if (kind === 'ts') out.push({ red: [[[-17, -196], [-12, -212], [4, -218], [19, -206], [18, -195], [0, -199]], [[-17, -196], [-30, -186], [-24, -183], [-14, -191]]] });
    if (qing) {
      out.push({ s: shp([[[-26, -197], [26, -197], [22, -204], [10, -212], [8, -222], [-8, -222], [-10, -212], [-22, -204]]], { sp: 5, halo: 3, seed: 12 }) });
      out.push({ s: shp([[[-14, -186], [-10, -180], [-22, -120], [-26, -122]]], { sp: 4, halo: 2, seed: 13 }) }); // bím tóc
    }
    if (king) {
      out.push({ s: shp([[[-16, -198], [-14, -214], [0, -222], [14, -214], [16, -198]]], { sp: 5, halo: 3, seed: 14 }) });
      out.push({ s: shp([[[-48, -208], [-14, -206], [-14, -200], [-48, -202]], [[14, -206], [48, -208], [48, -202], [14, -200]]], { sp: 4, halo: 2, seed: 15 }) }); // cánh chuồn
      out.push({ s: shp([[[2, -172], [14, -172], [10, -150], [4, -152]]], { sp: 4, halo: 2, seed: 16 }) }); // râu
    }
    if (o.spear) { const top = ar ? [50, -330] : [36, -330]; out.push({ s: shp([[[28, -110], [32, -110], [top[0] + 2, top[1]], [top[0] - 2, top[1]]]], { sp: 4, halo: 2, seed: 17 }) });
      out.push({ wt: [[top[0], top[1] - 30], [top[0] + 7, top[1] + 2], [top[0] - 7, top[1] + 2]] }); }
    return out;
  });
}
function drawItems(items, t = 1e9) {
  for (const it of items) {
    if (it.s) it.s.draw(m, t);
    if (it.face) { WC.fillPoly(m, [E(10, -189, 2.5, 2.5, 8)], '#000'); }
    if (it.red) red(it.red);
    if (it.wt) white([it.wt]);
  }
}
function guy(kind, x, y, s, t, o = {}) {
  const p = o.walk ? Math.floor(t * 6 + (o.ph ?? 0)) % 4 : 0, bob = o.walk ? Math.abs(Math.sin((t * 6 + (o.ph ?? 0)) * PI / 2)) * 4 : 0;
  put(x, y - bob * s, s, o.flip, () => { drawItems(person(kind, p, o)); if (o.flag) flag(36, -330, t, o.flagW ?? 90, o.flagRed ?? true); });
}
function flag(x, y, t, w = 90, isRed = true) {
  black([[[x - 2, y - 10], [x + 2, y - 10], [x + 2, y + 230], [x - 2, y + 230]]]);
  const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([x + u * w, y + Math.sin(u * 5 + t * 7) * 7 * u]); }
  for (let i = 10; i >= 0; i--) { const u = i / 10; pts.push([x + u * w, y + w * .62 + Math.sin(u * 5 + t * 7 + .6) * 7 * u]); }
  isRed ? red([pts]) : white([pts]);
  if (!isRed) { const r = []; for (let i = 0; i < 4; i++) r.push([x + 12 + i * 12, y + 12]); }
}
function torch(x, y, t, s = 1) {
  const k = Math.floor(t * 12);
  black([[[x - 2, y], [x + 2, y], [x + 2, y + 60 * s], [x - 2, y + 60 * s]]]);
  const f = [[x - 9 * s, y], [x - 3 * s, y - (22 + (k % 3) * 5) * s], [x + 1, y - (36 + (k % 2) * 8) * s], [x + 5 * s, y - 20 * s], [x + 9 * s, y]];
  red([f]);
}
// voi chiến + bành
function elephant(key) {
  return S('voi' + key, () => {
    const o = { sp: 7, R: 50, seed: 41, halo: 5 };
    return [
      shp([[[-70, -40], [-60, 0], [-44, 0], [-40, -40]], [[30, -40], [36, 0], [52, 0], [56, -40]]], { ...o, seed: 42 }),
      shp([E(0, -100, 105, 66, 40)], o),
      shp([[[70, -150], [118, -140], [138, -96], [142, -30], [152, 0], [136, 0], [122, -40], [104, -86], [80, -90]]], { ...o, seed: 43 }),
      shp([E(86, -128, 30, 40, 24)], { ...o, seed: 44, R: 20 }),
      shp([[[-50, -158], [50, -158], [44, -196], [-44, -196]]], { ...o, seed: 45, dir: PI / 2 }),
      shp([roofPts(0, -238, 110, 40)], { ...o, seed: 46, dir: PI / 2 + .3 }),
    ];
  });
}
function drawElephant(x, y, s, t, o = {}) {
  const k = Math.floor(t * 8) % 2, bob = o.walk ? k * 4 : 0;
  put(x, y - bob * s, s, o.flip, () => {
    for (const sh of elephant('a')) sh.draw(m);
    white([[[118, -92], [160, -100], [160, -94], [122, -84]]]); // ngà
    WC.fillPoly(m, [E(112, -118, 3, 3, 8)], '#fff');
    red([[[-46, -200], [46, -200], [42, -192], [-42, -192]]]);
    if (o.rider) { both(g => { g.save(); g.translate(-6, -190); g.scale(.62, .62); }); drawItems(person(o.rider, 0, { still: true, arm: o.arm ?? 0 })); both(g => g.restore()); }
    if (o.flag) flag(-40, -360, t, 80);
  });
}
// ngựa (Tôn Sĩ Nghị cưỡi ngựa trần)
function horse() {
  return S('ngua', () => { const o = { sp: 6, R: 40, seed: 51, halo: 4 };
    return [shp([[[-60, -60], [-74, 0], [-62, 0], [-46, -50]], [[44, -60], [64, 0], [76, 0], [56, -62]]], o),
      shp([E(0, -88, 74, 36, 30)], o), shp([[[50, -110], [92, -172], [118, -160], [116, -146], [86, -124], [70, -80]]], { ...o, seed: 52 }),
      shp([[[-70, -100], [-110, -60], [-104, -54], [-66, -86]]], { ...o, seed: 53 })]; });
}
// cáng võng: 2 người khiêng, 1 người nằm
function hammock(x, y, s, t, ph) {
  put(x, y, s, false, () => {
    const b = Math.sin(t * 9 + ph) * 3;
    guy('ts', -70, 0, 1, t, { walk: true, ph });
    guy('ts', 90, 0, 1, t, { walk: true, ph: ph + 2 });
    black([[[-80, -150 + b], [110, -150 - b], [110, -144 - b], [-80, -144 + b]]]);
    const sag = []; for (let i = 0; i <= 12; i++) { const u = i / 12; sag.push([lerp(-60, 90, u), -146 + Math.sin(u * PI) * 42]); }
    drawCuts(S('vong', () => cut(sag, 4, 'v', 3)));
    put(10, -112, .55, false, () => drawItems([person('ts', 0, { still: true })[2]]));
    WC.fillPoly(m, [E(-40, -114, 14, 16, 20)], '#fff');
    red([[[-52, -124], [-30, -132], [-28, -122], [-50, -116]]]);
  });
}
// cành đào: nhánh khắc + hoa đỏ son
function peach(key, x, y, sc, bloom = 1, seed = 1) {
  const st = S('dao' + key, () => {
    const r = mulberry(seed), br = [], fl = [];
    const grow = (px, py, a, len, d) => { if (d > 4) return; const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len;
      br.push(WC.mkStroke([[px, py], [(px + nx) / 2 + (r() - .5) * 10, (py + ny) / 2], [nx, ny]], [8 - d * 1.5, 7 - d * 1.5, 5 - d], { kind: 'v', seed: d * 11 + len }));
      if (d >= 2) for (let k = 0; k < 3; k++) fl.push([nx + (r() - .5) * 30, ny + (r() - .5) * 30, 7 + r() * 5]);
      grow(nx, ny, a - .5 + r() * .3, len * .72, d + 1); grow(nx, ny, a + .3 + r() * .3, len * .7, d + 1); };
    grow(0, 0, -PI / 2 - .3, 110, 0);
    return { br, fl };
  });
  put(x, y, sc, false, () => {
    drawCuts(st.br, 1e9, '#000');
    st.fl.forEach(([fx, fy, rr], i) => { const a = clamp(bloom * 1.6 - i / st.fl.length); if (a > 0) { const pts = []; for (let k = 0; k < 10; k++) { const ang = k / 10 * PI * 2, rad = rr * a * (k % 2 ? .55 : 1); pts.push([fx + Math.cos(ang) * rad, fy + Math.sin(ang) * rad]); } red([pts]); } });
  });
}
function smoke(x, y, t, n, seed) { const r = mulberry(seed); for (let i = 0; i < n; i++) { const u = (t * .25 + r()) % 1, px = x + (r() - .5) * 220 + u * 60, py = y - u * 260, rr = 18 + u * 40;
  const pts = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * PI * 1.6 + r(); pts.push([px + Math.cos(a) * rr, py + Math.sin(a) * rr * .6]); }
  WC.drawStrokes(m, [WC.mkStroke(pts, 3 * (1 - u) + 1, { kind: 'v', seed: i })], { color: '#fff' }); } }
function burst(x, y, t, t0, sz = 1) { const u = seg(t, t0, t0 + .5); if (u <= 0 || u >= 1) return; const n = 12, pts = [];
  for (let k = 0; k < n * 2; k++) { const a = k / (n * 2) * PI * 2, rr = (k % 2 ? 18 : 46) * sz * (.4 + u); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } red([pts], 1 - u * .6); }
function water(key, y0, y1, ph, seed = 5) { const st = S('nuoc' + key + (Math.floor(ph * 12) % 6), () => { const r = mulberry(seed), out = [];
  for (let y = y0; y < y1; y += 16) for (let k = 0; k < 6; k++) { const x0 = r() * PW * 1.2 - 100, len = 60 + r() * 140 * (y - y0) / (y1 - y0 + 1);
    out.push(...WC.cutAlong(wave(x0, x0 + len, y, 3, 1.5, ph * 2 + y), { w: 2 + 4 * (y - y0) / (y1 - y0), kind: 'v', seg: [40, 120], seed: y + k })); } return out; }); drawCuts(st, 1e9, '#000'); }
function stars(seed, n) { return S('sao' + seed, () => { const r = mulberry(seed), p = []; for (let i = 0; i < n; i++) p.push([r() * PW, r() * PH * .4, 2 + r() * 2]); return WC.flecks(p, { seed }); }); }
function stakes(x0, x1, y, h, seed) { const r = mulberry(seed), ps = []; for (let x = x0; x < x1; x += 22) { const hh = h * (.85 + r() * .3); ps.push([[x, y], [x, y - hh], [x + 9, y - hh - 16], [x + 18, y - hh], [x + 18, y]]); } return S('coc' + seed, () => shp(ps, { sp: 6, halo: 4, dir: PI / 2, seed })); }

// ---------------- 10 bản khắc ----------------
const SHOTS = [
  { // 1 · quân Thanh tràn vào Thăng Long
    cam: lt => ({ z: lerp(1.35, 1, eio(lt / 7)), y: lerp(900, PH / 2, eio(lt / 7)) }),
    draw(lt, t) {
      sky('1', 0, 1000, { k: .7 }).draw(m, lt);
      hill('1', ridge(-50, PW + 50, 820, 160, 3, 1100)).draw(m, lt);
      for (const s of gate('1', 560, 1080, 520)) s.draw(m, lt);
      if (lt > 1.2) bricks(300, 800, 520, 260, 30);
      ground(1080);
      for (let i = 0; i < 7; i++) { const x = ((i * 150 + lt * 60) % 1200) - 120; guy('qing', x, 1400 + (i % 2) * 40, 1.15, lt, { walk: true, ph: i, spear: i % 2 === 0, flag: i === 3, flagRed: false }); }
      for (let i = 0; i < 9; i++) guy('qing', ((i * 120 + lt * 40) % 1200) - 80, 1170, .6, lt, { walk: true, ph: i * 2, spear: true });
      // tiêu đề khắc
      const a = seg(lt, .6, 1.6) * (1 - seg(lt, 4.6, 5.2));
      if (a > 0) { m.save(); m.globalAlpha = a; m.fillStyle = '#000'; m.textAlign = 'center'; m.font = '700 104px "EBG"'; m.fillText('QUANG TRUNG', PW / 2, 420); m.font = '600 58px "EBG"'; m.fillText('ĐẠI PHÁ QUÂN THANH', PW / 2, 490); m.restore();
        c.save(); c.globalAlpha = a; c.fillStyle = '#000'; c.textAlign = 'center'; c.font = '700 104px "EBG"'; c.fillText('QUANG TRUNG', PW / 2, 250); c.restore(); }
    }
  },
  { // 2 · Phú Xuân lên ngôi
    cam: lt => ({ z: lerp(1, 1.18, eio(lt / 6.3)), y: lerp(PH / 2, 1000, eio(lt / 6.3)) }),
    draw(lt, t) {
      sky('2', 0, 900, { k: .5 }).draw(m, lt);
      if (lt > .8) drawCuts(S('hq2', () => WC.rays(PW / 2, 980, { n: 46, r0: 160, r1: [520, 900], w: 12, a0: PI * 1.05, a1: PI * 1.95, seed: 7 })), lt - .8);
      for (const s of hall('2', PW / 2, 1120, 820, 2)) s.draw(m, lt);
      ground(1120);
      drawCuts(S('bac', () => [0, 1, 2, 3].flatMap(i => cut([[200 - i * 30, 1160 + i * 44], [808 + i * 30, 1160 + i * 44]], 4, 'v', i))), lt);
      guy('king', PW / 2, 1360, 1.6, lt, { arm: lt > 2.5 ? 1 : 0 });
      for (const [x, f] of [[170, 0], [300, 0], [708, 1], [838, 1]]) guy('ts', x, 1500, 1.2, lt, { spear: true, flip: f, flag: x === 170 || x === 838 });
    }
  },
  { // 3 · hành quân cáng võng
    cam: lt => ({ z: 1.02, x: PW / 2 + lt * 18 }),
    draw(lt, t) {
      sky('3', 0, 1000, { k: .8 }).draw(m, lt);
      hill('3a', ridge(-200, PW + 300, 640, 260, 9, 1300), { sp: 11 }).draw(m, lt);
      hill('3b', ridge(-200, PW + 300, 980, 150, 5, 1400)).draw(m, lt);
      drawCuts(bamboo('3', 120, 1100, 420, 6, 4), lt * 2);
      drawCuts(bamboo('3b', 930, 1080, 380, 5, 8), lt * 2);
      ground(1130);
      drawCuts(S('duong', () => cut(wave(-300, PW + 300, 1150, 6, 2), 5, 'u', 2)));
      for (let i = 0; i < 3; i++) hammock(((i * 420 + lt * 140) % 1300) - 200, 1330 + i * 20, 1.0, lt, i * 1.7);
      for (let i = 0; i < 5; i++) guy('ts', ((i * 260 + lt * 160 + 120) % 1300) - 200, 1560, 1.15, lt, { walk: true, ph: i, spear: true, flag: i === 2 });
    }
  },
  { // 4 · ăn Tết sớm ở Tam Điệp
    cam: lt => ({ z: lerp(1.05, 1.2, eio(lt / 5.6)), y: lerp(PH / 2, 1050, eio(lt / 5.6)) }),
    draw(lt, t) {
      sky('4', 0, 900, { k: .45, add: .05 }).draw(m, lt);
      hill('4', ridge(-60, PW + 60, 760, 300, 13, 1100), { sp: 10 }).draw(m, lt);
      drawCuts(bamboo('4', 860, 980, 360, 5, 2), lt * 2);
      ground(960);
      // lều + đèn lồng
      for (const s of hall('4', 300, 1050, 380, 1)) s.draw(m, lt);
      for (let i = 0; i < 4; i++) { const x = 140 + i * 110, y = 880 + Math.sin(lt * 2 + i) * 4; black([[[x - 1, 840], [x + 1, 840], [x + 1, y], [x - 1, y]]]); red([E(x, y + 16, 13, 17, 16)]); }
      peach('4', 860, 1260, 1.5, seg(lt, .5, 3), 3);
      // mâm cỗ: bánh chưng
      black([E(PW / 2 + 60, 1330, 220, 46, 40)]);
      drawCuts(S('mam', () => cut(E(PW / 2 + 60, 1330, 222, 48, 40), 4, 'k', 9)));
      for (let i = 0; i < 4; i++) { const x = 400 + i * 80, y = 1300; WC.fillPoly(m, [R(x, y - 34, 52, 34)], '#fff'); drawCuts(S('bc' + i, () => [...cut([[x + 26, y - 34], [x + 26, y]], 3, 'k', i), ...cut([[x, y - 17], [x + 52, y - 17]], 3, 'k', i + 4)]), 1e9, '#000'); }
      guy('king', 820, 1430, 1.3, lt, { arm: lt > 2 ? 1 : 0 });
      for (let i = 0; i < 5; i++) guy('ts', 180 + i * 120, 1560, 1.2, lt, { still: true, arm: (lt > 2.2 && i % 2) ? 1 : 0, flip: i > 2 });
    }
  },
  { // 5 · đêm 30 Tết vây đồn Hà Hồi
    cam: lt => ({ z: lerp(1.25, 1, eio(lt / 4.8)) }),
    draw(lt, t) {
      black([R(-500, -500, PW + 1000, PH + 1000)]); drawCuts(stars(5, 90), lt * 3);
      drawCuts(S('trang', () => WC.rays(780, 220, { n: 30, r0: 40, r1: [70, 110], w: 6, seed: 3 })));
      WC.fillPoly(m, [E(780, 220, 40, 40, 30)], '#fff');
      hill('5', ridge(-60, PW + 60, 720, 120, 21, 1000), { sp: 14, lo: .5 }).draw(m, lt);
      stakes(100, 900, 960, 150, 4).draw(m, lt);
      for (const s of hall('5', 500, 900, 300, 1)) s.draw(m, lt);
      water('5', 1020, 1180, lt, 8);
      for (let i = 0; i < 4; i++) guy('qing', 300 + i * 120, 960, .6, lt, { still: true, flag: i === 1, flagRed: false, flagW: 60, arm: lt > 3 ? 1 : 0 });
      for (let i = 0; i < 7; i++) { const x = 80 + i * 140, y = 1400 + (i % 2) * 90; guy('ts', x, y, 1.15, lt, { still: true, spear: i % 2 === 1, flip: i > 3, arm: 1 }); torch(x + (i > 3 ? -46 : 46), y - 300, lt + i, 1.4); }
    }
  },
  { // 6 · Ngọc Hồi: ván bọc rơm, voi chiến
    cam: lt => ({ z: lerp(1.0, 1.12, eio(lt / 5.9)), x: PW / 2 + lt * 10 }),
    draw(lt, t) {
      sky('6', 0, 900, { k: 1, p: 1.1 }).draw(m, lt);
      if (lt > .5) drawCuts(S('rang', () => WC.rays(PW / 2, 900, { n: 40, r0: 90, r1: [400, 800], w: 14, a0: PI, a1: PI * 2, seed: 9 })), lt - .5);
      stakes(-100, 1200, 960, 120, 6).draw(m, lt);
      ground(940);
      for (let i = 0; i < 5; i++) burst(120 + i * 200, 900, lt, 1 + i * .7 + (i % 2) * .3, 1.2);
      smoke(500, 960, lt, 10, 3);
      const adv = eio(seg(lt, 0, 5.9)) * 120;
      drawElephant(220, 1260 - adv * .3, 1.35, lt, { walk: true, rider: 'ts', flag: true });
      drawElephant(800, 1240 - adv * .3, 1.2, lt, { walk: true, rider: 'ts', flip: true });
      for (let i = 0; i < 4; i++) { const x = 90 + i * 250, y = 1540 - adv;
        guy('ts', x + 40, y, 1.1, lt, { walk: true, ph: i });
        const sh = S('van' + i, () => shp([R(-60, -190, 120, 190)], { dir: PI / 2, sp: 6, kind: 'v', seed: 60 + i, halo: 5 }));
        put(x + 10, y, 1.1, false, () => { sh.draw(m); drawCuts(S('rom' + i, () => { const r = mulberry(i + 3), o = []; for (let k = 0; k < 26; k++) { const xx = -58 + r() * 116, yy = -186 + r() * 180; o.push(WC.mkStroke([[xx, yy], [xx + (r() - .5) * 30, yy + 18]], 2, { kind: 'v', seed: k })); } return o; })); });
      }
    }
  },
  { // 7 · Đống Đa
    cam: lt => ({ z: lerp(1.3, 1.36, lt / 2) }),
    draw(lt, t) {
      sky('7', 0, 1000, { k: .6 }).draw(m, lt * 2);
      hill('7', [[-100, 1400], [100, 1060], [400, 900], [700, 940], [1000, 1100], [1200, 1400]], { sp: 9, R: 120 }).draw(m, lt * 2);
      ground(1300);
      smoke(420, 880, lt, 12, 7);
      // cờ Thanh gãy cắm nghiêng
      put(560, 960, 1.4, false, () => { both(g => g.rotate(.5)); black([[[-3, -260], [3, -260], [3, 0], [-3, 0]]]); white([[[3, -260], [90, -244], [70, -200], [86, -160], [3, -176]]]); both(g => g.rotate(0)); });
      drawCuts(S('quaD', () => { const r = mulberry(4), o = []; for (let i = 0; i < 9; i++) { const x = 200 + r() * 600, y = 300 + r() * 300; o.push(WC.mkStroke([[x - 14, y], [x, y + 6], [x + 14, y]], 4, { kind: 'v', seed: i })); } return o; }), 1e9, '#fff');
    }
  },
  { // 8 · Tôn Sĩ Nghị tháo chạy qua sông Nhị Hà
    cam: lt => ({ z: 1.05, x: PW / 2 - lt * 20 }),
    draw(lt, t) {
      sky('8', 0, 760, { k: .75 }).draw(m, lt);
      hill('8', ridge(-200, PW + 200, 700, 80, 17, 800), { sp: 12 }).draw(m, lt);
      water('8', 800, 1580, lt, 12);
      // cầu phao gãy
      for (let i = 0; i < 9; i++) { const x = -40 + i * 130, br = i === 4 || i === 5, y = 1000 + (br ? 40 + Math.sin(lt * 3 + i) * 10 : 0), a = br ? (i === 4 ? .3 : -.35) : 0;
        put(x, y, 1, false, () => { both(g => g.rotate(a)); black([R(0, 0, 118, 22)]); drawCuts(S('phao', () => cut([[4, 4], [114, 4]], 3, 'k', 1))); }); }
      const hx = lerp(820, 380, seg(lt, 0, 5));
      put(hx, 1060, 2.2, true, () => { for (const s of horse()) s.draw(m); both(g => { g.save(); g.translate(0, -100); g.scale(.6, .6); }); drawItems(person('qing', 0, { still: true, arm: 1 })); both(g => g.restore()); });
      for (let i = 0; i < 4; i++) { const x = 140 + i * 230, s = seg(lt, i * .6, i * .6 + 1.4), y = 1080 + s * 220;
        put(x, y, .95, i % 2, () => { both(g => g.rotate(s * 1.4 * (i % 2 ? -1 : 1))); drawItems(person('qing', 1, { arm: 1 })); }); }
      for (let i = 0; i < 3; i++) guy('ts', 1000 - (lt * 40 % 80) + i * 90, 1000, .7, lt, { walk: true, ph: i, spear: true, flag: i === 1, flip: true });
    }
  },
  { // 9 · tiến vào Thăng Long, hoa đào nở
    cam: lt => ({ z: lerp(1.25, 1, eio(lt / 9.8)), y: lerp(1150, PH / 2, eio(lt / 9.8)) }),
    draw(lt, t) {
      sky('9', 0, 1000, { k: .95, p: 1.2 }).draw(m, lt);
      if (lt > .6) drawCuts(S('hq9', () => WC.rays(PW / 2, 700, { n: 50, r0: 250, r1: [600, 1000], w: 12, a0: PI * 1.02, a1: PI * 1.98, seed: 21 })), lt - .6);
      for (const s of gate('9', PW / 2, 1100, 640)) s.draw(m, lt);
      if (lt > 1.4) bricks(200, 760, 640, 340, 32);
      ground(1100);
      const ex = lerp(PW / 2 + 40, PW / 2 - 20, seg(lt, 0, 6)), ey = lerp(1120, 1330, eio(seg(lt, 0, 6)));
      drawElephant(ex, ey, lerp(.9, 1.5, eio(seg(lt, 0, 6))), lt, { walk: lt < 6, rider: 'king', arm: lt > 5 ? 1 : 0, flag: true });
      smoke(ex, ey - 260, lt, 6, 2);
      const bl = seg(lt, 2, 8);
      peach('9a', 120, 1580, 1.6, bl, 5); peach('9b', 960, 1560, 1.5, bl, 9);
      for (let i = 0; i < 6; i++) guy('ts', 60 + i * 190 + (i > 2 ? 60 : -40), 1600, 1.05, lt, { still: true, arm: (Math.floor(lt * 3) + i) % 2, flag: i === 1 || i === 4 });
    }
  },
  { // 10 · màn kết
    cam: lt => ({ z: lerp(1.15, 1, eio(lt / 8.5)) }),
    draw(lt, t) {
      peach('10', PW / 2 - 20, 1520, 1.9, seg(lt, .3, 3), 11);
      const a = seg(lt, .4, 1.4);
      m.save(); m.globalAlpha = a; m.fillStyle = '#000'; m.textAlign = 'center';
      m.font = '600 48px "EBG"'; m.fillText('XUÂN KỶ DẬU · 1789', PW / 2, 300);
      m.font = '700 150px "EBG"'; m.fillText('ĐẠI THẮNG', PW / 2, 470);
      m.font = 'italic 500 46px "EBG"'; m.fillText('Quang Trung đại phá quân Thanh', PW / 2, 560);
      m.restore();
    }
  },
];

// ---------------- khung in ----------------
function wrap(g, text, maxW) { const w = text.split(' '), lines = []; let cur = ''; for (const x of w) { const n = cur ? cur + ' ' + x : x; if (g.measureText(n).width > maxW && cur) { lines.push(cur); cur = x; } else cur = n; } if (cur) lines.push(cur); return lines; }
export function captionAt(t) { return SUB.find(s => t >= s.t0 && t < s.t1); }
export async function init() {
  await document.fonts.load('700 40px "EBG"'); await document.fonts.load('italic 500 40px "EBG"');
  P = WC.makePrinter(W, H);
}
export function render(g, t) {
  const i = Math.max(0, T.findIndex((x, k) => t >= x && t < T[k + 1])), sh = SHOTS[i], lt = t - T[i];
  const cam = sh.cam(lt), z = cam.z ?? 1, cx = cam.x ?? PW / 2, cy = cam.y ?? PH / 2;
  m.setTransform(1, 0, 0, 1, 0, 0); c.setTransform(1, 0, 0, 1, 0, 0);
  m.fillStyle = '#fff'; m.fillRect(0, 0, W, H); c.clearRect(0, 0, W, H);
  for (const q of [m, c]) { q.save(); q.beginPath(); q.rect(IMG.x, IMG.y, IMG.w, IMG.h); q.clip(); q.translate(IMG.x + PW / 2, IMG.y + PH / 2); q.scale(z, z); q.translate(-cx, -cy); }
  m.fillStyle = '#fff'; m.fillRect(-3000, -3000, 9000, 9000);
  sh.draw(lt, t);
  m.restore(); c.restore();
  // chữ địa danh (khắc trên dải giấy ở mép trên lề dưới) + phụ đề in chữ
  m.fillStyle = '#000'; m.textAlign = 'center'; m.textBaseline = 'alphabetic';
  if (CAP[i]) { m.font = '600 30px "EBG"'; m.fillText(CAP[i].split('').join(String.fromCharCode(8202)), W / 2, IMG.y + IMG.h + 52); }
  const s = captionAt(t);
  if (s) { const a = Math.min(seg(t, s.t0, s.t0 + .1), 1 - seg(t, s.t1 - .15, s.t1)); m.globalAlpha = a; m.font = '500 44px "EBG"';
    const ls = wrap(m, s.text, 960); ls.forEach((l, k) => m.fillText(l, W / 2, IMG.y + IMG.h + 120 + k * 54)); m.globalAlpha = 1; }
  const jolt = lt < 1 / 24 ? [5, -3] : lt < 2 / 24 ? [-2, 1] : [0, 0];
  const out = P.render(M, C, { seed: i + 1, inkSeed: 3, reg: [3, 2], plate: SON, paper: '#EFE6D2' });
  g.fillStyle = '#EFE6D2'; g.fillRect(0, 0, W, H); g.drawImage(out, jolt[0], jolt[1]);
}
