import { describe, expect, it } from "vitest";
import { serverUrlFromLog } from "./server-process";

describe("fixture listening address", () => {
  it("uses the actual bound port reported by the fixture", () => {
    expect(
      serverUrlFromLog(
        "[15:00:00] INFO (#2): Listening on http://127.0.0.1:49152",
      ),
    ).toBe("http://127.0.0.1:49152/mcp");
    expect(serverUrlFromLog("Listening on http://127.0.0.1:9009")).toBe(
      "http://127.0.0.1:9009/mcp",
    );
  });

  it.each([
    "Listening on http://127.0.0.1:0",
    "Listening on http://127.0.0.1:65536",
    "Listening on http://127.0.0.1:49152invalid",
    "Failed to start server. Is port 37128 in use?",
    "Listening on http://0.0.0.0:49152",
  ])("does not treat %s as a ready fixture", (line) => {
    expect(serverUrlFromLog(line)).toBeUndefined();
  });
});
