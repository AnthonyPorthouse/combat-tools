import { Assets, type Texture } from "pixi.js";
import { useEffect, useState } from "react";

export const useTokenTexture = ({ imageUrl }: Readonly<{ imageUrl: string | undefined }>) => {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!imageUrl) {
        setTexture(null);
        return;
      }
      try {
        const loaded = await Assets.load<Texture>(imageUrl);
        if (!cancelled) setTexture(loaded);
      } catch {
        if (!cancelled) setTexture(null);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return { texture };
};
