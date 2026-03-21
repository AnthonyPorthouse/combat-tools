import { nanoid } from "nanoid";

/**
 * Valid sizes for a token on the game board.
 *
 * The value represents the number of grid squares the token occupies along each axis.
 * A size of 0.5 means the token is half a grid square wide/tall and is centred
 * within the cell it is placed on.
 */
export type TokenSize = 0.5 | 1 | 2 | 3 | 4;

/**
 * Represents a combat token that can be placed on the game board.
 *
 * A token is the visual representation of any entity (player, NPC, creature, etc.)
 * on the VTT grid. Its unique ID is generated automatically by `createToken`.
 */
export type Token = {
  /** Unique identifier generated with nanoid. */
  id: string;
  /** Display name, shown as fallback when no image is provided. */
  name: string;
  /**
   * Size of the token in grid squares (width and height are equal).
   * Defaults to 1. A value of 0.5 centres the token inside a single cell.
   */
  size: TokenSize;
  /** Optional URL or data-URI for the token's portrait image. */
  image?: string;
  /** When true, the token cannot be dragged to a new position. */
  locked?: boolean;
};

/**
 * Factory that creates a new `Token` with a unique nanoid-generated ID.
 *
 * Use this instead of constructing a `Token` literal directly so that
 * IDs are always unique and well-formed.
 *
 * @param name  - Display name for the token.
 * @param size  - Grid-square size of the token (default 1).
 * @param image - Optional portrait image URL.
 */
export const createToken = (
  name: string,
  size: TokenSize = 1,
  image?: string,
  locked?: boolean,
): Token => ({
  id: nanoid(),
  name,
  size,
  image,
  locked,
});
