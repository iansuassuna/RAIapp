import { describe, expect, test } from "bun:test";
import { describeUserAgent, formatIpAddress } from "./format";

describe("describeUserAgent", () => {
  test.each([
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36", "Chrome · Windows"],
    ["Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0", "Edge · Windows"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0", "Firefox · Linux"],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1",
      "Safari · iOS",
    ],
    ["Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36", "Chrome · Android"],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15",
      "Safari · macOS",
    ],
  ])("%s", (ua, expected) => {
    expect(describeUserAgent(ua)).toBe(expected);
  });

  test("sem User-Agent ou irreconhecível", () => {
    expect(describeUserAgent(null)).toBe("Aparelho desconhecido");
    expect(describeUserAgent("curl/8.5.0")).toBe("Navegador desconhecido");
  });
});

describe("formatIpAddress", () => {
  test("compacta IPv6, nomeia loopback e omite endereço não especificado", () => {
    expect(formatIpAddress("0000:0000:0000:0000:0000:0000:0000:0001")).toBe("esta máquina");
    expect(formatIpAddress("127.0.0.1")).toBe("esta máquina");
    expect(formatIpAddress("2804:0d4b:0000:0000:0000:0000:0000:0010")).toBe("2804:d4b::10");
    expect(formatIpAddress("200.17.41.5")).toBe("200.17.41.5");
    expect(formatIpAddress(null)).toBeNull();
    expect(formatIpAddress("0000:0000:0000:0000:0000:0000:0000:0000")).toBeNull();
    expect(formatIpAddress("0.0.0.0")).toBeNull();
  });
});
