import { describe, expect, it } from "vitest";
import { parseEuroInput, toCents, toEuro } from "../money";

describe("money", () => {
  describe("toCents", () => {
    it("converts euros to integer cents", () => {
      expect(toCents(10)).toBe(1000);
      expect(toCents(10.005)).toBe(1001);
      expect(toCents(0.1 + 0.2)).toBe(30);
    });
  });

  describe("toEuro", () => {
    it("is the exact inverse of toCents", () => {
      expect(toEuro(toCents(33.33))).toBe(33.33);
    });
  });

  describe("parseEuroInput", () => {
    it.each([
      ["12,50", 12.5],
      ["12.5", 12.5],
      ["1.250,50", 1250.5],
      ["1.250", 1250],
      [" 30 € ", 30],
    ])("reads %s as %d", (raw, amount) => {
      expect(parseEuroInput(raw)).toEqual({ amount });
    });

    it("names the actual problem", () => {
      expect(parseEuroInput("")).toEqual({ error: "Scrivi quanto è costato." });
      expect(parseEuroInput("abc")).toEqual({ error: "Scrivi solo cifre, per esempio 12,50." });
      expect(parseEuroInput("0")).toEqual({ error: "L'importo deve essere più di 0." });
      expect(parseEuroInput("-5")).toEqual({ error: "L'importo deve essere più di 0." });
      expect("error" in parseEuroInput("2000000")).toBe(true);
    });
  });
});
