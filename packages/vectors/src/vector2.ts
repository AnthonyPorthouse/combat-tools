/**
 * A 2D vector used for board positions and movement calculations.
 */
export type Vector2 = {
  x: number;
  y: number;
};

/**
 * Adds two vectors component-wise.
 */
export const addVector2 = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

/**
 * Subtracts vector `b` from vector `a` component-wise.
 */
export const subtractVector2 = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
});
