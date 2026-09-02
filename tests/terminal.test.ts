import { describe, expect, it } from "vitest";
import { CAREERS_URL, runTerminalCommand } from "../src/domain/terminal";

describe("terminal commands", () => {
  it("offers the verified Browserbase careers link", () => {
    expect(runTerminalCommand("careers").link?.href).toBe(CAREERS_URL);
    expect(CAREERS_URL).toBe("https://www.browserbase.com/careers");
  });

  it("supports help, about, clear, exit, and unknown recovery", () => {
    expect(runTerminalCommand("help").lines[0]).toContain("careers");
    expect(runTerminalCommand("about").lines.join(" ")).toContain("Browserbase");
    expect(runTerminalCommand("clear").action).toBe("clear");
    expect(runTerminalCommand("exit").action).toBe("exit");
    expect(runTerminalCommand("wat").lines.join(" ")).toContain("Command not found");
  });
});
