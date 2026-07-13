import { C } from "../../constants/theme";

export function PixelCorners({ color = C.blue, size = 6 }: { color?: string; size?: number }) {
  const s = size;
  return (
    <>
      <div style={{ position: "absolute", top: -2, left: -2, width: s, height: s, background: color }} />
      <div style={{ position: "absolute", top: -2, right: -2, width: s, height: s, background: color }} />
      <div style={{ position: "absolute", bottom: -2, left: -2, width: s, height: s, background: color }} />
      <div style={{ position: "absolute", bottom: -2, right: -2, width: s, height: s, background: color }} />
    </>
  );
}
