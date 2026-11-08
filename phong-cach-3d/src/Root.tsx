import React from "react";
import { Composition } from "remotion";
import { QuangTrung, QT_FRAMES } from "./phim/QuangTrung";
import { TiengGoSauCua, MA_FRAMES } from "./phim/TiengGoSauCua";
import { NguoiDemThoc } from "./phim/NguoiDemThoc";
import preview from "./nguoi-dem-thoc-preview.json";
export const Root: React.FC = () => <>
  <Composition id="NguoiDemThoc" component={NguoiDemThoc} durationInFrames={preview.durationInFrames} fps={preview.fps} width={preview.width} height={preview.height} />
  <Composition id="TiengGoSauCua" component={TiengGoSauCua} durationInFrames={MA_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="QuangTrung" component={QuangTrung} durationInFrames={QT_FRAMES} fps={30} width={1080} height={1920} />
</>;
