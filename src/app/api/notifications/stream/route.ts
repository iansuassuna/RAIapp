import { countUnreadNotifications, getNotificationFor } from "@/lib/api";
import { subscribeToNotifications } from "@/lib/notification-hub";
import { getSessionMember } from "@/lib/session";

/**
 * Stream SSE da central de notificações do membro logado.
 * Eventos: `ready` ({ unread }) ao conectar e `notification` ({ unread, item }) a cada nova notificação.
 * Sessão é validada no banco a cada conexão (o EventSource reconecta sozinho).
 */
export async function GET(request: Request) {
  const member = await getSessionMember();
  if (!member) return new Response("Não autenticado.", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      // Pede ao navegador para reconectar em 5 s se a conexão cair.
      write("retry: 5000\n\n");
      send("ready", { unread: await countUnreadNotifications(member.id) });

      const unsubscribe = await subscribeToNotifications(member.id, async (notificationId) => {
        const [item, unread] = await Promise.all([
          getNotificationFor(member.id, notificationId),
          countUnreadNotifications(member.id),
        ]);
        if (item) send("notification", { unread, item });
      });
      // Comentário periódico mantém proxies e o navegador com a conexão aberta.
      const heartbeat = setInterval(() => write(": ping\n\n"), 25_000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Já fechado pelo cliente.
        }
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
