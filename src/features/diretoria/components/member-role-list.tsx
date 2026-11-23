"use client";

import { Layers, Shield, Users } from "lucide-react";
import { useState } from "react";
import { Alert, Avatar, Badge, Button, Card, EmptyState, SectionTitle, Select } from "@/components/ui";
import { describeMember, EIXOS, ROLE_LABEL, TIMES } from "@/config/options";
import type { Eixo, Member, Role, Time } from "@/types";
import { updateMemberRoleAction } from "../actions";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "membro", label: ROLE_LABEL.membro },
  { value: "coordenador", label: ROLE_LABEL.coordenador },
  { value: "diretoria", label: ROLE_LABEL.diretoria },
];

const ROLE_TONE: Record<Role, "brand" | "accent" | "warning"> = {
  membro: "brand",
  coordenador: "accent",
  diretoria: "warning",
};

function MemberRoleRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<Role>(member.role);
  const [eixo, setEixo] = useState<Eixo | "">(member.eixo ?? "");
  const [time, setTime] = useState<Time | "">(member.time ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  function resetForm() {
    setRole(member.role);
    setEixo(member.eixo ?? "");
    setTime(member.time ?? "");
    setError(null);
    setFieldErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setSavedMsg(null);
    try {
      const result = await updateMemberRoleAction(member.id, {
        role,
        eixo: role === "diretoria" ? null : eixo || null,
        time: role === "membro" ? time || null : null,
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setEditing(false);
      setSavedMsg("Papel atualizado com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="px-3 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar decorative name={member.name} src={member.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-brand-950">{member.name}</p>
            {isSelf && <Badge tone="accent">Você</Badge>}
          </div>
          <p className="truncate text-xs text-ink-subtle">
            {member.email} · {describeMember(member)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={ROLE_TONE[member.role]}>{ROLE_LABEL[member.role]}</Badge>
          <Button
            type="button"
            variant={editing ? "ghost" : "secondary"}
            size="sm"
            onClick={() => {
              if (editing) resetForm();
              setSavedMsg(null);
              setEditing((v) => !v);
            }}
            aria-expanded={editing}
            aria-label={editing ? `Cancelar alteração de ${member.name}` : `Alterar papel de ${member.name}`}
          >
            {editing ? "Cancelar" : "Alterar papel"}
          </Button>
        </div>
      </div>

      {savedMsg && !editing && (
        <div className="mt-3">
          <Alert tone="success">{savedMsg}</Alert>
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3 rounded-xl bg-canvas p-4 ring-1 ring-line">
          {error && <Alert tone="danger">{error}</Alert>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              id={`role-${member.id}`}
              label="Papel"
              icon={Shield}
              placeholder="Selecione o papel..."
              options={ROLE_OPTIONS}
              value={role}
              onChange={(e) => {
                const next = e.target.value as Role;
                setRole(next);
                if (next === "diretoria") {
                  setEixo("");
                  setTime("");
                } else if (next === "coordenador") {
                  setTime("");
                }
                setError(null);
                setFieldErrors({});
              }}
              error={fieldErrors.role}
            />

            {role !== "diretoria" && (
              <Select
                id={`eixo-${member.id}`}
                label="Eixo"
                icon={Layers}
                placeholder="Selecione o eixo..."
                options={EIXOS}
                value={eixo}
                onChange={(e) => {
                  setEixo(e.target.value as Eixo | "");
                  setFieldErrors((prev) => ({ ...prev, eixo: "" }));
                }}
                error={fieldErrors.eixo}
              />
            )}

            {role === "membro" && (
              <Select
                id={`time-${member.id}`}
                label="Time"
                icon={Users}
                placeholder="Selecione o time..."
                options={TIMES}
                value={time}
                onChange={(e) => {
                  setTime(e.target.value as Time | "");
                  setFieldErrors((prev) => ({ ...prev, time: "" }));
                }}
                error={fieldErrors.time}
              />
            )}
          </div>

          <p className="text-xs text-ink-muted">
            {role === "diretoria"
              ? "A diretoria não pertence a eixo nem a time e tem acesso ao painel de todos os eixos."
              : role === "coordenador"
                ? "Cada eixo pode ter apenas um coordenador, sem vínculo a time."
                : "Membros precisam estar vinculados a um eixo e um time."}
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForm();
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Salvar papel
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}

export function MemberRoleList({ members, currentMemberId }: { members: Member[]; currentMemberId: string }) {
  const roleOrder: Role[] = ["diretoria", "coordenador", "membro"];
  const sorted = [...members].sort((a, b) => {
    const diff = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  return (
    <section aria-labelledby="gestao-papeis" className="space-y-3">
      <SectionTitle id="gestao-papeis">Membros e papéis ({members.length})</SectionTitle>
      {sorted.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum membro cadastrado">
          Novas contas criadas em /cadastro aparecerão aqui como membros.
        </EmptyState>
      ) : (
        <Card className="p-2">
          <ul className="divide-y divide-line/70">
            {sorted.map((member) => (
              <MemberRoleRow key={member.id} member={member} isSelf={member.id === currentMemberId} />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
