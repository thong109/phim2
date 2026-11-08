import React from "react";
import { AbsoluteFill, Video, staticFile } from "remotion";
import media from "../nguoi-dem-thoc-preview.json";

export const NguoiDemThoc: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#14212a" }}>
    <Video
      src={staticFile(media.file)}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  </AbsoluteFill>
);
