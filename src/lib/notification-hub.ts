import "server-only";
import { sqlClient } from "@/db";
import { decodeSignal, NOTIFICATIONS_CHANNEL } from "@/lib/api/notifications";

type Listener = (notificationId: string) => void;

type Hub = {
  listeners: Map<string, Set<Listener>>;
  started: Promise<void> | null;
};

const KEY = "__raiappNotificationHub";
const store = globalThis as typeof globalThis & { [KEY]?: Hub };
store[KEY] ??= { listeners: new Map(), started: null };
const hub: Hub = store[KEY];

/**
 * Um único `LISTEN` por processo (conexão dedicada do postgres.js), repassando cada sinal só aos streams
 * SSE do destinatário. Funciona com várias instâncias do app: cada uma escuta o mesmo canal do Postgres.
 */
function ensureListening() {
  hub.started ??= sqlClient
    .listen(NOTIFICATIONS_CHANNEL, (payload) => {
      const signal = decodeSignal(payload);
      if (!signal) return;
      for (const listener of hub.listeners.get(signal.recipientId) ?? []) {
        try {
          listener(signal.notificationId);
        } catch (error) {
          console.error("[notificações] Falha ao entregar sinal:", error);
        }
      }
    })
    .then(() => undefined)
    .catch((error) => {
      // Permite tentar de novo na próxima conexão; o cliente cai no polling enquanto isso.
      hub.started = null;
      throw error;
    });
  return hub.started;
}

/** Inscreve um stream para o membro. Devolve a função de cancelamento. */
export async function subscribeToNotifications(recipientId: string, listener: Listener): Promise<() => void> {
  await ensureListening();
  const set = hub.listeners.get(recipientId) ?? new Set<Listener>();
  set.add(listener);
  hub.listeners.set(recipientId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) hub.listeners.delete(recipientId);
  };
}
