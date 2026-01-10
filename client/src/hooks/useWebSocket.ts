import { useEffect, useRef, useState, useCallback } from "react";
import type { GameState, GameMode, PointGoal, WSMessage } from "@shared/schema";

interface UseWebSocketOptions {
  onGameStateUpdate?: (state: GameState) => void;
  onError?: (message: string) => void;
  onPlayerJoined?: (playerId: string) => void;
  onMatchFound?: (gameId: string, players: { id: string; name: string; isBot: boolean }[]) => void;
  onQueueUpdate?: (position: number, estimatedWait: number) => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        
        switch (message.type) {
          case "player_joined":
            setPlayerId(message.payload.playerId);
            optionsRef.current.onPlayerJoined?.(message.payload.playerId);
            break;
          case "game_state_update":
            setGameState(message.payload);
            optionsRef.current.onGameStateUpdate?.(message.payload);
            break;
          case "error":
            optionsRef.current.onError?.(message.payload.message);
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      
      // Auto-reconnect after 2 seconds if we had a connection
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 2000);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const startGame = useCallback((
    mode: GameMode,
    pointGoal: PointGoal,
    players: { id: string; name: string; isBot: boolean }[]
  ) => {
    sendMessage({
      type: "start_game",
      payload: { mode, pointGoal, players },
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
    setGameState(null);
  }, [sendMessage]);

  // Auto connect if option is set
  useEffect(() => {
    if (options.autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [options.autoConnect, connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected,
    playerId,
    gameState,
    startGame,
    placeBid,
    playCard,
    leaveLobby,
    sendMessage,
  };
}
