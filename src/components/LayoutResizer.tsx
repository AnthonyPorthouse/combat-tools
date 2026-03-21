import { useApplication } from "@pixi/react";
import { Container } from "pixi.js";
import { useEffect, useRef, type PropsWithChildren } from "react";

type LayoutDimensions = {
  width: number;
  height: number;
};

type LayoutEnabledContainer = Container & {
  layout: LayoutDimensions;
};

export const LayoutResizer = ({ children }: PropsWithChildren) => {
  const layoutRef = useRef<LayoutEnabledContainer>(null);
  const { app } = useApplication();

  useEffect(() => {
    if (!app.renderer) {
      return;
    }

    const applyLayout = () => {
      if (!layoutRef.current) return;

      layoutRef.current.layout = {
        width: app.screen.width,
        height: app.screen.height,
      };
    };

    applyLayout();
    app.renderer.on("resize", applyLayout);

    return () => {
      app.renderer?.off("resize", applyLayout);
    };
  }, [app]);

  return (
    <pixiContainer ref={layoutRef} eventMode="static">
      {children}
    </pixiContainer>
  );
};
