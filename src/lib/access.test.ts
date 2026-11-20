import { describe, expect, test } from "bun:test";
import { canViewEixo, getAccessibleEixos } from "./access";

describe("acesso por eixo", () => {
  test("membro vê só o próprio eixo", () => {
    const membro = { role: "membro", eixo: "inovacao" } as const;
    expect(canViewEixo(membro, "inovacao")).toBe(true);
    expect(canViewEixo(membro, "tecnico-sustentavel")).toBe(false);
    expect(canViewEixo(membro, "tecnologias-saude")).toBe(false);
    expect(getAccessibleEixos(membro)).toEqual(["inovacao"]);
  });

  test("coordenador vê só o próprio eixo", () => {
    const coordenador = { role: "coordenador", eixo: "tecnologias-saude" } as const;
    expect(canViewEixo(coordenador, "tecnologias-saude")).toBe(true);
    expect(canViewEixo(coordenador, "inovacao")).toBe(false);
    expect(getAccessibleEixos(coordenador)).toEqual(["tecnologias-saude"]);
  });

  test("diretoria vê todos os eixos", () => {
    const diretoria = { role: "diretoria", eixo: "inovacao" } as const;
    expect(getAccessibleEixos(diretoria)).toEqual(["inovacao", "tecnico-sustentavel", "tecnologias-saude"]);
  });
});

describe("coordenação", () => {
  test("só o coordenador do próprio eixo gerencia", async () => {
    const { canManageEixo } = await import("./access");
    expect(canManageEixo({ role: "coordenador", eixo: "inovacao" }, "inovacao")).toBe(true);
    expect(canManageEixo({ role: "coordenador", eixo: "inovacao" }, "tecnologias-saude")).toBe(false);
    expect(canManageEixo({ role: "diretoria", eixo: "inovacao" }, "inovacao")).toBe(false);
    expect(canManageEixo({ role: "membro", eixo: "inovacao" }, "inovacao")).toBe(false);
  });
});
