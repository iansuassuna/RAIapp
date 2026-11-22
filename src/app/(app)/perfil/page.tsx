import { ImageIcon, KeyRound, Mail, Monitor, ShieldCheck, User } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, Badge, Card } from "@/components/ui";
import { describeMember, ROLE_LABEL, ROLE_TONE } from "@/config/options";
import {
  ActiveSessions,
  ChangeEmailForm,
  ChangePasswordForm,
  ProfileAvatarForm,
  ProfileNameForm,
} from "@/features/perfil";
import { getProfile } from "@/lib/api";
import { getCurrentMember, getSessionState } from "@/lib/session";

export const metadata: Metadata = { title: "Meu perfil" };

type Props = { searchParams: Promise<{ email?: string | string[]; error?: string | string[] }> };

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: typeof User;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <Card className="h-full space-y-4">
        <h2 id={id} className="flex items-center gap-2 font-display text-sm font-bold text-brand-900">
          <Icon className="size-4 text-accent-600" aria-hidden /> {title}
        </h2>
        {children}
      </Card>
    </section>
  );
}

export default async function ProfilePage({ searchParams }: Props) {
  const [member, session, params] = await Promise.all([getCurrentMember(), getSessionState(), searchParams]);
  const sessionId = session.status === "active" ? session.sessionId : "";
  const profile = await getProfile(member, sessionId);

  return (
    <div className="space-y-8 pt-7">
      <PageHeader eyebrow="Sua conta no RAITec" title="Meu perfil" />

      {params.email === "pendente" &&
        (params.error ? (
          <Alert tone="danger">O link de troca de e-mail é inválido ou expirou. Peça a troca novamente.</Alert>
        ) : (
          <Alert tone="info">
            Se você acabou de aprovar pelo e-mail atual, confirme agora pelo link enviado ao novo endereço. Se já
            confirmou o novo, a troca foi concluída: o e-mail em uso aparece no card “E-mail”.
          </Alert>
        ))}

      <Card className="flex flex-wrap items-center gap-3">
        <ShieldCheck className="size-5 text-accent-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-950">{describeMember(member)}</p>
          <p className="text-xs text-ink-subtle">Papel, eixo e time são definidos pela diretoria.</p>
        </div>
        <Badge tone={ROLE_TONE[member.role]}>{ROLE_LABEL[member.role]}</Badge>
      </Card>

      <div className="@container">
        <div className="grid grid-cols-1 gap-6 @xl:grid-cols-2">
          <Section id="perfil-nome" title="Nome" icon={User}>
            <ProfileNameForm name={member.name} />
          </Section>
          <Section id="perfil-avatar" title="Avatar" icon={ImageIcon}>
            <ProfileAvatarForm name={member.name} avatarUrl={member.avatarUrl} />
          </Section>
          <Section id="perfil-senha" title="Senha" icon={KeyRound}>
            <ChangePasswordForm />
          </Section>
          <Section id="perfil-email" title="E-mail" icon={Mail}>
            <ChangeEmailForm email={member.email} emailVerified={profile.emailVerified} />
          </Section>
        </div>
      </div>

      <Section id="perfil-sessoes" title="Sessões ativas" icon={Monitor}>
        <ActiveSessions sessions={profile.sessions} />
      </Section>
    </div>
  );
}
