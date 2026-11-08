import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";

export const MA_FRAMES = 65 * 30;
const SHOTS = [
  { at: 0, place: "00:13 · CĂN NHÀ CUỐI HẺM", text: "Đêm ấy, tôi về căn nhà cũ. Mẹ dặn: sau nửa đêm, nghe ai gọi cũng đừng mở cửa." },
  { at: 9, place: "BA TIẾNG GÕ", text: "Vừa tắt đèn, có ba tiếng gõ. Ngoài cửa, giọng mẹ thì thào: Con ơi, mở cửa cho mẹ." },
  { at: 17, place: "TIN NHẮN CỦA MẸ", text: "Tôi vừa chạm tay vào chốt thì điện thoại sáng lên. Mẹ nhắn: Mẹ đang ở bệnh viện. Con ngủ chưa?" },
  { at: 26, place: "BÊN KIA CÁNH CỬA", text: "Tôi nín thở nhìn qua khe cửa. Một người mặc áo trắng đứng quay lưng. Chân không chạm đất." },
  { at: 35, place: "CÁI GIẾNG CŨ", text: "Bóng ấy trôi về phía giếng. Từ dưới giếng, giọng mẹ lại cất lên: Sao con không mở cửa?" },
  { at: 44, place: "ĐỪNG TRẢ LỜI", text: "Điện thoại rung lần nữa: Dù nghe thấy gì, đừng trả lời. Tôi lùi lại. Sau lưng bỗng có tiếng nước nhỏ." },
  { at: 54, place: "TIẾNG GÕ CUỐI CÙNG", text: "Ba tiếng gõ lại vang lên. Lần này… từ phía trong tủ áo. Giọng tôi thì thào: Mở cửa cho tao." },
];
const shotAt = (s: number) => SHOTS.reduce((id, shot, i) => s >= shot.at ? i : id, 0);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Block = ({ pos, size, color }: { pos: [number, number, number]; size: [number, number, number]; color: string }) => <mesh position={pos} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>;

const World = ({ id, s, t }: { id: number; s: number; t: number }) => {
  const { camera } = useThree();
  const close = Math.min(1, t / 8);
  if (id === 0) { camera.position.set(2 - close, 2.7, 15 - close * 4); camera.lookAt(0, 2, 0); }
  else if (id === 4) { camera.position.set(5.3, 3.8 - close, 8 - close * 2); camera.lookAt(4.2, 0.8, 0.5); }
  else if (id === 6) { camera.position.set(-3.8 + close, 2.1, 6 - close * 2); camera.lookAt(-3.8, 1.9, 0); }
  else { camera.position.set(0.4 * Math.sin(s * 0.2), 2.1, (id === 3 ? 5.4 : 8) - close); camera.lookAt(0, 1.9, 0); }
  const ghost = id === 3 || id === 4;
  const gx = id === 4 ? 1 + close * 3.2 : 0;
  const flicker = 1.4 + 0.3 * Math.sin(s * 17) + 0.15 * Math.sin(s * 39);
  return <>
    <color attach="background" args={["#071018"]} />
    <fog attach="fog" args={["#10232c", 8, 27]} />
    <ambientLight intensity={0.65} color="#789eaf" />
    <directionalLight position={[-5, 9, 3]} intensity={1.8} color="#8baec8" />
    <pointLight position={[1.7, 3, 2]} intensity={flicker * 9} color="#e1a15b" distance={9} />
    <Block pos={[0, -0.18, 0]} size={[40, 0.3, 40]} color="#243635" />
    <Block pos={[-3.2, 2, -0.4]} size={[4, 4, 0.5]} color="#4c5148" />
    <Block pos={[3.2, 2, -0.4]} size={[4, 4, 0.5]} color="#4c5148" />
    <Block pos={[0, 3.75, -0.4]} size={[2.4, 0.5, 0.5]} color="#4c5148" />
    <Block pos={[0, 1.7, -0.55]} size={[2.4, 3.4, 0.18]} color="#05090d" />
    <group position={[-1.2, 0, 0]} rotation={[0, id === 3 || id === 4 ? -0.32 : -0.025, 0]}>
      <Block pos={[1.17, 1.7, 0]} size={[2.32, 3.4, 0.16]} color="#433326" />
      {[0.45, 1.1, 1.75].map(x => <Block key={x} pos={[x, 1.7, 0.1]} size={[0.025, 3.35, 0.03]} color="#1b2423" />)}
      <Block pos={[2, 1.65, 0.16]} size={[0.1, 0.3, 0.12]} color="#a28a5c" />
    </group>
    <mesh position={[0, 4.5, -1]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[5.8, 2, 4]} /><meshStandardMaterial color="#273735" /></mesh>
    <Block pos={[1.7, 3, 0.5]} size={[0.3, 0.5, 0.3]} color="#aa7544" />
    <mesh position={[1.7, 3, 0.7]}><sphereGeometry args={[0.09, 8, 8]} /><meshBasicMaterial color="#ffd99a" /></mesh>
    <group position={[4.2, 0.5, 1]}>
      <mesh><cylinderGeometry args={[1, 1.1, 1, 12, 1, true]} /><meshStandardMaterial color="#69716b" side={2} /></mesh>
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.98, 24]} /><meshBasicMaterial color="#03090c" /></mesh>
    </group>
    <group position={[-3.8, 0, 1]}>
      <Block pos={[0, 1.7, 0]} size={[1.8, 3.4, 1]} color="#302d2b" />
      <Block pos={[0, 1.7, 0.53]} size={[0.035, 3.3, 0.03]} color="#090f14" />
      {[-0.2, 0.2].map(x => <Block key={x} pos={[x, 1.6, 0.58]} size={[0.06, 0.25, 0.06]} color="#9a8f75" />)}
    </group>
    {Array.from({ length: 16 }, (_, i) => <group key={i} position={[(i % 2 ? -1 : 1) * (7 + i % 4), 0, -3 - i * 1.7]}>
      <Block pos={[0, 3, 0]} size={[0.25, 6 + i % 3, 0.3]} color="#202c2c" />
      <mesh position={[0, 5, 0]}><icosahedronGeometry args={[1.8, 0]} /><meshStandardMaterial color="#17302c" /></mesh>
    </group>)}
    {ghost && <group position={[gx, 0.6 + 0.1 * Math.sin(s * 2), id === 4 ? 1 : 0.9]}>
      <mesh position={[0, 1, 0]}><coneGeometry args={[0.48, 1.9, 12]} /><meshStandardMaterial color="#d2ddd2" emissive="#4b6864" emissiveIntensity={0.3} /></mesh>
      <mesh position={[0, 2.12, 0]}><sphereGeometry args={[0.3, 12, 12]} /><meshStandardMaterial color="#10171c" /></mesh>
      <Block pos={[0, 1.95, 0.16]} size={[0.57, 0.75, 0.2]} color="#11191c" />
    </group>}
    {id >= 5 && Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[-1.1 + i * 0.35, 0.005, 4 - i * 0.55]} rotation={[-Math.PI / 2, 0, i % 2 ? -0.3 : 0.3]} scale={[0.12, 0.25, 1]}><circleGeometry args={[1, 12]} /><meshStandardMaterial color="#678b8a" roughness={0.2} /></mesh>)}
  </>;
};

export const TiengGoSauCua: React.FC = () => {
  const f = useCurrentFrame(), s = f / 30, id = shotAt(s), shot = SHOTS[id], t = s - shot.at;
  const end = id < SHOTS.length - 1 ? SHOTS[id + 1].at : 63;
  const words = shot.text.split(/(?<=[.!?…])\s+/);
  const index = Math.min(words.length - 1, Math.floor(Math.max(0, t - 1) / Math.max(1, end - shot.at - 1) * words.length));
  const cut = interpolate(t, [0, 0.45], [1, 0], clamp);
  return <AbsoluteFill style={{ background: "#071018", color: "#eef1e3", fontFamily: "Arial, sans-serif" }}>
    <ThreeCanvas width={1080} height={1920} camera={{ fov: 48, near: 0.1, far: 100 }} gl={{ antialias: true }}><World id={id} s={s} t={t} /></ThreeCanvas>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, transparent 18%, rgba(0,5,10,.8) 100%), linear-gradient(0deg, #040b12 0%, transparent 45%, rgba(0,0,0,.6) 100%)" }} />
    <div style={{ position: "absolute", top: 130, left: 70, right: 70, fontSize: 27, letterSpacing: 7, color: "#a6bfbc" }}>CHUYỆN KỂ LÚC NỬA ĐÊM</div>
    <div style={{ position: "absolute", top: 205, left: 70, right: 70, fontSize: 42, fontWeight: 700 }}>{shot.place}</div>
    {s < 7 && <div style={{ position: "absolute", left: 70, right: 70, top: 400, fontFamily: "Georgia, serif", fontSize: 112, lineHeight: 1.1, textShadow: "0 4px 25px #000" }}>TIẾNG GÕ<br /><span style={{ color: "#c4a78d" }}>SAU CỬA</span><div style={{ marginTop: 28, fontSize: 28, letterSpacing: 4 }}>MỘT CÂU CHUYỆN HƯ CẤU</div></div>}
    {id === 2 && <div style={{ position: "absolute", top: 760, left: 120, right: 120, padding: 48, borderRadius: 28, background: "#d5dfcf", color: "#182723", boxShadow: "0 0 100px #81aca64a" }}><div style={{ fontSize: 30, marginBottom: 20 }}>MẸ · 00:17</div><div style={{ fontSize: 53, lineHeight: 1.35 }}>Mẹ đang ở bệnh viện.<br />Con ngủ chưa?</div></div>}
    {id === 5 && <div style={{ position: "absolute", top: 650, left: 120, right: 120, padding: 40, background: "#d5dfcf", color: "#182723", borderRadius: 24, fontSize: 48 }}>MẸ: Dù nghe thấy gì,<br /><b>đừng trả lời.</b></div>}
    <div style={{ position: "absolute", bottom: 225, left: 75, right: 75, textAlign: "center", fontSize: 55, fontWeight: 600, lineHeight: 1.4, textShadow: "0 3px 12px #000" }}>{words[index]}</div>
    {s > 61 && <AbsoluteFill style={{ background: `rgba(0,0,0,${interpolate(s, [61, 64], [0, 0.95], clamp)})`, alignItems: "center", justifyContent: "center", opacity: interpolate(s, [61, 63], [0, 1], clamp) }}><div style={{ fontSize: 66, color: "#c4a78d", textAlign: "center" }}>Bạn có chắc…<br />mình đang ở nhà một mình?</div></AbsoluteFill>}
    <AbsoluteFill style={{ background: "#02070b", opacity: cut }} />
  </AbsoluteFill>;
};
