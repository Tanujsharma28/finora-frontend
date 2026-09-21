import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WS_URL = "http://localhost:8080/ws";

export interface TransactionStatusUpdate {
  transactionId: string;
  status: "COMPLETED" | "FLAGGED";
  accountId: string;
}

export interface NotificationMessage {
  accountId: string;
  message: string;
  transactionId?: string;
  type?: string;
}

export function connectToAccount(
  accountId: string,
  onUpdate: (update: TransactionStatusUpdate) => void,
  onNotification?: (notification: NotificationMessage) => void
): () => void {
  let active = true;
  const token = localStorage.getItem("finora_token");

  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    reconnectDelay: 3000,
    onConnect: () => {
      if (!active) {
        client.deactivate();
        return;
      }
      client.subscribe(`/topic/transactions/${accountId}`, (message) => {
        if (!active) return;
        const update: TransactionStatusUpdate = JSON.parse(message.body);
        onUpdate(update);
      });

      if (onNotification) {
        client.subscribe(`/topic/notifications/${accountId}`, (message) => {
          if (!active) return;
          const notification: NotificationMessage = JSON.parse(message.body);
          onNotification(notification);
        });
      }
    },
    onStompError: (frame) => {
      console.error("STOMP error:", frame.headers["message"], frame.body);
    },
  });

  client.activate();

  return () => {
    active = false;
    client.deactivate();
  };
}