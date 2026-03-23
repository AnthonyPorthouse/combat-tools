import { Application, extend } from "@pixi/react";
import { Container, Graphics } from "pixi.js";
import { LayoutContainer } from "@pixi/layout/components";
import type { ReactNode } from "react";
import { CameraController } from "./CameraController";
import { GridOverlay } from "./GridOverlay";
import { LayoutResizer } from "./LayoutResizer";
import { CameraProvider } from "../contexts/CameraProvider";

extend({ Container, Graphics, LayoutContainer });

type BoardProps = {
  gridSize?: number;
  children?: ReactNode;
};

export function Board({ gridSize = 64, children }: BoardProps) {
  return (
    <CameraProvider>
      <Application resizeTo={window} antialias={true} eventMode="static">
        <LayoutResizer>
          <CameraController />
          <GridOverlay size={gridSize} />
          {children}
        </LayoutResizer>
      </Application>
    </CameraProvider>
  );
}
