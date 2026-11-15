import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Each fixture process owns its signing key. A continuation is valid only for
// the tool and round that issued it.
export const makeRequestStateSigner = (purpose: string) => {
  const key = randomBytes(32);
  const sign = (nonce: string) =>
    createHmac("sha256", key)
      .update(purpose)
      .update("\0")
      .update(nonce)
      .digest("hex");

  return {
    issue() {
      const nonce = randomBytes(16).toString("hex");
      return `${nonce}.${sign(nonce)}`;
    },
    verify(state: unknown) {
      if (typeof state !== "string" || state.length !== 97) return false;
      if (!/^[0-9a-f]{32}\.[0-9a-f]{64}$/.test(state)) return false;
      const nonce = state.slice(0, 32);
      const signature = state.slice(33);
      return timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(sign(nonce), "hex"),
      );
    },
  };
};
