import { describe, expect, test } from "bun:test";
import {
  assignableOwners,
  canApproveInventoryProposal,
  canEditInventoryItem,
  canManageEixo,
  canManageMemberRoles,
  canProposeInventoryChange,
  canRequestForProject,
  canResolveRequest,
  canReviewDirectorRequests,
  canUpdateTaskStatus,
  canUseCoordinationPanel,
  canViewEixo,
  canViewMemberEvaluations,
  getAccessibleEixos,
  hasMemberArea,
  isPendingEmailVerification,
  requestReviewerFor,
} from "./access";

const membroMidias = { id: "m2", role: "membro", eixo: "inovacao", time: "midias" } as const;
const membroProcessos = { id: "m3", role: "membro", eixo: "inovacao", time: "processos" } as const;
const coordInovacao = { id: "m1", role: "coordenador", eixo: "inovacao", time: null } as const;
const coordSaude = { id: "m8", role: "coordenador", eixo: "tecnologias-saude", time: null } as const;
const diretoria = { id: "d1", role: "diretoria", eixo: null, time: null } as const;

describe("acesso por eixo", () => {
  test("membro vê só o próprio eixo", () => {
    expect(canViewEixo(membroMidias, "inovacao")).toBe(true);
    expect(canViewEixo(membroMidias, "tecnico-sustentavel")).toBe(false);
    expect(canViewEixo(membroMidias, "tecnologias-saude")).toBe(false);
    expect(getAccessibleEixos(membroMidias)).toEqual(["inovacao"]);
  });

  test("coordenador vê só o próprio eixo", () => {
    expect(canViewEixo(coordSaude, "tecnologias-saude")).toBe(true);
    expect(canViewEixo(coordSaude, "inovacao")).toBe(false);
    expect(getAccessibleEixos(coordSaude)).toEqual(["tecnologias-saude"]);
  });

  test("diretoria vê todos os eixos", () => {
    expect(getAccessibleEixos(diretoria)).toEqual(["inovacao", "tecnico-sustentavel", "tecnologias-saude"]);
  });
});

describe("coordenação e diretoria", () => {
  test("só o coordenador do próprio eixo gerencia", () => {
    expect(canManageEixo(coordInovacao, "inovacao")).toBe(true);
    expect(canManageEixo(coordInovacao, "tecnologias-saude")).toBe(false);
    expect(canManageEixo(diretoria, "inovacao")).toBe(false);
    expect(canManageEixo(membroMidias, "inovacao")).toBe(false);
  });

  test("painel da coordenação: coordenação do eixo ou diretoria", () => {
    expect(canUseCoordinationPanel(coordInovacao, "inovacao")).toBe(true);
    expect(canUseCoordinationPanel(coordSaude, "inovacao")).toBe(false);
    expect(canUseCoordinationPanel(diretoria, "inovacao")).toBe(true);
    expect(canUseCoordinationPanel(membroMidias, "inovacao")).toBe(false);
  });

  test("gestão de papéis e fila da diretoria são exclusivas da diretoria", () => {
    expect(canReviewDirectorRequests(diretoria)).toBe(true);
    expect(canReviewDirectorRequests(coordInovacao)).toBe(false);
    expect(canManageMemberRoles(diretoria)).toBe(true);
    expect(canManageMemberRoles(coordInovacao)).toBe(false);
    expect(canManageMemberRoles(membroMidias)).toBe(false);
  });
});

describe("requisições, tarefas e avaliações", () => {
  test("destino das requisições por papel", () => {
    expect(requestReviewerFor(membroMidias)).toBe("coordenacao");
    expect(requestReviewerFor(coordInovacao)).toBe("diretoria");
    expect(requestReviewerFor(diretoria)).toBeNull();
  });

  test("quem resolve requisições", () => {
    expect(canResolveRequest(coordInovacao, { eixo: "inovacao", reviewer: "coordenacao" })).toBe(true);
    expect(canResolveRequest(coordSaude, { eixo: "inovacao", reviewer: "coordenacao" })).toBe(false);
    expect(canResolveRequest(diretoria, { eixo: "inovacao", reviewer: "coordenacao" })).toBe(true);
    expect(canResolveRequest(coordInovacao, { eixo: "inovacao", reviewer: "diretoria" })).toBe(false);
    expect(canResolveRequest(diretoria, { eixo: "inovacao", reviewer: "diretoria" })).toBe(true);
  });

  test("tarefas e projetos vinculáveis", () => {
    const project = { eixo: "inovacao" as const, memberIds: ["m1", "m2"] };
    expect(canRequestForProject(membroMidias, project)).toBe(true);
    expect(canRequestForProject(membroProcessos, project)).toBe(false);
    expect(canRequestForProject(coordInovacao, project)).toBe(true);
    expect(canUpdateTaskStatus(membroMidias, project, { assigneeId: "m2" })).toBe(true);
    expect(canUpdateTaskStatus(membroMidias, project, { assigneeId: "m3" })).toBe(false);
    expect(canUpdateTaskStatus(coordInovacao, project, { assigneeId: "m3" })).toBe(true);
  });

  test("avaliações detalhadas: só coordenação do eixo do avaliado", () => {
    expect(canViewMemberEvaluations(coordInovacao, membroMidias)).toBe(true);
    expect(canViewMemberEvaluations(coordSaude, membroMidias)).toBe(false);
    expect(canViewMemberEvaluations(diretoria, membroMidias)).toBe(false);
    expect(canViewMemberEvaluations(coordInovacao, diretoria)).toBe(false);
  });
});

describe("inventário", () => {
  test("edição direta, propostas do time Processos e aprovação", () => {
    expect(canEditInventoryItem(diretoria, { ownerEixo: "inovacao" })).toBe(true);
    expect(canEditInventoryItem(coordInovacao, { ownerEixo: "inovacao" })).toBe(true);
    expect(canEditInventoryItem(coordInovacao, { ownerEixo: null })).toBe(true);
    expect(canEditInventoryItem(coordInovacao, { ownerEixo: "tecnologias-saude" })).toBe(false);
    expect(canProposeInventoryChange(membroProcessos)).toBe(true);
    expect(canProposeInventoryChange(membroMidias)).toBe(false);
    expect(canApproveInventoryProposal(coordSaude, null)).toBe(true);
    expect(canApproveInventoryProposal(coordSaude, "inovacao")).toBe(false);
    expect(assignableOwners(coordInovacao)).toEqual([null, "inovacao"]);
    expect(assignableOwners(membroProcessos)).toEqual([null, "inovacao", "tecnico-sustentavel", "tecnologias-saude"]);
  });
});

describe("minha área", () => {
  test("membros e coordenação têm Minha área; diretoria não", () => {
    expect(hasMemberArea(membroMidias)).toBe(true);
    expect(hasMemberArea({ role: "coordenador", eixo: "inovacao" })).toBe(true);
    expect(hasMemberArea({ role: "diretoria", eixo: null })).toBe(false);
  });
});

describe("verificação de e-mail", () => {
  test("só bloqueia contas novas (verificationRequired) ainda não verificadas", () => {
    expect(isPendingEmailVerification({ verificationRequired: true, emailVerified: false })).toBe(true);
    expect(isPendingEmailVerification({ verificationRequired: true, emailVerified: true })).toBe(false);
    expect(isPendingEmailVerification({ verificationRequired: false, emailVerified: false })).toBe(false);
    expect(isPendingEmailVerification({ verificationRequired: null, emailVerified: false })).toBe(false);
  });
});
