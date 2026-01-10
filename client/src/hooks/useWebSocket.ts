import { useEffect, useRef, useState, useCallback } from "react";
import type { GameState, GameMode, TimeControl, WSMessage } from "@shared/schema";

interface UseWebSocketOptions {
  onGameStateUpdate?: (state: GameState) => void;
  onError?: (message: string) => void;
  onPlayerJoined?: (playerId: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        
        switch (message.type) {
          case "player_joined":
            setPlayerId(message.payload.playerId);
            options.onPlayerJoined?.(message.payload.playerId);
            break;
          case "game_state_update":
            options.onGameStateUpdate?.(message.payload);
            break;
          case "error":
            options.onError?.(message.payload.message);
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, [options]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const startGame = useCallback((
    mode: GameMode,
    timeControl: TimeControl,
    players: { id: string; name: string; isBot: boolean }[]
  ) => {
    sendMessage({
      type: "start_game",
      payload: { mode, timeControl, players },
    });
  }, [sendMessage]);

  const placeBid = useCallback((bid: number) => {
    sendMessage({
      type: "place_bid",
      payload: { bid },
    });
  }, [sendMessage]);

  const playCard = useCallback((cardId: string) => {
    sendMessage({
      type: "play_card",
      payload: { cardId },
    });
  }, [sendMessage]);

  const leaveLobby = useCallback(() => {
    sendMessage({
      type: "leave_lobby",
      payload: {},
    });
  }, [sendMessage]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isConnected,
    playerId,
    startGame,
    placeBid,
    playCard,
    leaveLobby,
    sendMessage,
  };
}
