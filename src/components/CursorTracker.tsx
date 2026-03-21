import { useApplication } from "@pixi/react";
import { FederatedPointerEvent, Graphics } from "pixi.js";
import { useCallback, useEffect, useState } from "react";
import { screenToWorld, worldToScreen } from "../utils/cameraMath";
import { useCamera } from "../hooks/useCamera";

type CursorTrackerProps = {
  cursorRadius?: number;
};

export const CursorTracker = ({ cursorRadius = 3 }: CursorTrackerProps) => {
  const [screenCursorPos, setScreenCursorPos] = useState({ x: 0, y: 0 });
  const { app } = useApplication();
  const { camera } = useCamera();

  useEffect(() => {
    const handlePointerMove = (event: FederatedPointerEvent) => {
      setScreenCursorPos({ x: event.global.x, y: event.global.y });
    };

    app.stage.on("globalpointermove", handlePointerMove);

    return () => {
      app.stage.off("globalpointermove", handlePointerMove);
    };
  }, [app]);

  const drawCallback = useCallback(
    (graphics: Graphics) => {
      const worldCursorPos = screenToWorld(screenCursorPos, camera);
      const drawPos = worldToScreen(worldCursorPos, camera);

      graphics.clear();
      graphics.setFillStyle({ color: "red" });
      graphics.circle(drawPos.x - cursorRadius / 2, drawPos.y - cursorRadius / 2, cursorRadius);
      graphics.fill();
    },
    [camera, cursorRadius, screenCursorPos],
  );

  return <pixiGraphics draw={drawCallback} eventMode="none" />;
};
