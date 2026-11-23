import { describe, expect, test } from "bun:test";
import { addDaysIso, brToIso, isoToBr, longDateLabel, maskBrDate, monthGrid, monthTitle, shiftMonth } from "./date-br";

describe("conversão dd/mm/aaaa ↔ AAAA-MM-DD", () => {
  test("ida e volta", () => {
    expect(isoToBr("2026-11-23")).toBe("23/11/2026");
    expect(brToIso("23/11/2026")).toBe("2026-11-23");
    expect(brToIso(isoToBr("2027-01-05"))).toBe("2027-01-05");
  });

  test("vazio ou fora do formato", () => {
    expect(isoToBr("")).toBe("");
    expect(isoToBr(null)).toBe("");
    expect(isoToBr("23/11/2026")).toBe("");
    expect(brToIso("")).toBeNull();
    expect(brToIso("23/11/26")).toBeNull();
    expect(brToIso("2/11/2026")).toBeNull();
  });

  test("datas impossíveis são recusadas, inclusive 29/02 fora de ano bissexto", () => {
    expect(brToIso("31/02/2026")).toBeNull();
    expect(brToIso("31/04/2026")).toBeNull();
    expect(brToIso("00/05/2026")).toBeNull();
    expect(brToIso("10/13/2026")).toBeNull();
    expect(brToIso("29/02/2027")).toBeNull();
    expect(brToIso("29/02/2028")).toBe("2028-02-29");
    expect(brToIso("31/12/2026")).toBe("2026-12-31");
  });
});

describe("máscara de digitação", () => {
  test("insere as barras conforme digita", () => {
    expect(maskBrDate("2")).toBe("2");
    expect(maskBrDate("23")).toBe("23");
    expect(maskBrDate("231")).toBe("23/1");
    expect(maskBrDate("2311")).toBe("23/11");
    expect(maskBrDate("23112")).toBe("23/11/2");
    expect(maskBrDate("23112026")).toBe("23/11/2026");
  });

  test("ignora letras e excesso; aceita colar formatado ou ISO", () => {
    expect(maskBrDate("23a11b2026999")).toBe("23/11/2026");
    expect(maskBrDate("23/11/2026")).toBe("23/11/2026");
    expect(maskBrDate("23-11-2026")).toBe("23/11/2026");
    expect(maskBrDate("2026-11-23")).toBe("23/11/2026");
  });
});

describe("calendário", () => {
  test("grade de novembro/2026 começa no domingo certo e tem 6 semanas", () => {
    const grid = monthGrid(2026, 11);
    expect(grid).toHaveLength(6);
    // 01/11/2026 é domingo.
    expect(grid[0]?.[0]).toBe("2026-11-01");
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
  });

  test("fevereiro bissexto e mês que começa no sábado", () => {
    expect(monthGrid(2028, 2).flat().filter(Boolean)).toHaveLength(29);
    // 01/08/2026 é sábado: 6 casas vazias antes.
    expect(monthGrid(2026, 8)[0]?.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-08-01"]);
  });

  test("navegação entre meses e dias atravessa anos", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-01", -7)).toBe("2026-02-22");
  });

  test("rótulos em português", () => {
    expect(monthTitle(2026, 11)).toBe("Novembro de 2026");
    expect(longDateLabel("2026-11-23")).toBe("23 de novembro de 2026");
  });
});
