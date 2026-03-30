import type { Vector2 } from "@combat-tools/vectors";

import type { Token } from "./token";

export type TokenPlacement = {
  token: Token;
  position: Vector2;
};
