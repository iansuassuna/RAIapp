import { describe, expect, test } from "bun:test";
import { addDays, autoCycleFor, daysBetween, monthCycleFor, periodsOverlap } from "./cycle-period";

describe("monthCycleFor", () => {
  test("mês comum, dezembro e fevereiro bissexto", () => {
    expect(monthCycleFor("2026-11-23")).toEqual({
      id: "2026-11",
      label: "Novembro/26",
      startsOn: "2026-11-01",
      endsOn: "2026-11-30",
    });
    expect(monthCycleFor("2026-12-31").endsOn).toBe("2026-12-31");
    expect(monthCycleFor("2028-02-10")).toMatchObject({ label: "Fevereiro/28", endsOn: "2028-02-29" });
    expect(monthCycleFor("2027-02-10").endsOn).toBe("2027-02-28");
  });
});

describe("datas", () => {
  test("addDays e daysBetween atravessam meses e anos", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-11-23", "2026-11-30")).toBe(7);
    expect(daysBetween("2026-11-30", "2026-11-23")).toBe(-7);
  });

  test("periodsOverlap inclui as pontas", () => {
    const a = { startsOn: "2026-11-01", endsOn: "2026-11-30" };
    expect(periodsOverlap(a, { startsOn: "2026-11-30", endsOn: "2026-12-10" })).toBe(true);
    expect(periodsOverlap(a, { startsOn: "2026-12-01", endsOn: "2026-12-31" })).toBe(false);
  });
});

describe("autoCycleFor", () => {
  test("sem ciclos: o mês inteiro", () => {
    expect(autoCycleFor("2026-12-05", [])).toMatchObject({ startsOn: "2026-12-01", endsOn: "2026-12-31" });
  });

  test("começa depois de um ciclo anterior que avançou no mês", () => {
    const prev = { startsOn: "2026-11-01", endsOn: "2026-12-03" };
    expect(autoCycleFor("2026-12-05", [prev])).toMatchObject({ startsOn: "2026-12-04", endsOn: "2026-12-31" });
  });

  test("termina antes de um ciclo futuro que começa no mesmo mês", () => {
    const next = { startsOn: "2026-12-20", endsOn: "2027-01-31" };
    expect(autoCycleFor("2026-12-05", [next])).toMatchObject({ startsOn: "2026-12-01", endsOn: "2026-12-19" });
  });
});
