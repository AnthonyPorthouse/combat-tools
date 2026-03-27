import type { ReactNode } from "react";

import { LayoutContainer } from "@pixi/layout/components";
import { Application, extend } from "@pixi/react";
import { Container, Graphics } from "pixi.js";

import { CameraController } from "./CameraController";
import { GridOverlay } from "./GridOverlay";
import { LayoutResizer } from "./LayoutResizer";
extend({ Container, Graphics, LayoutContainer });

type BoardProps = {
  container?: HTMLDivElement | null;
  gridSize?: number;
  children?: ReactNode;
};

export function Board({ container, gridSize = 64, children }: Readonly<BoardProps>) {
  return (
    <Application resizeTo={container ?? globalThis} antialias={true} eventMode="static">
      <LayoutResizer>
        <CameraController />
        <GridOverlay size={gridSize} />
        {children}
      </LayoutResizer>
    </Application>
  );
}
