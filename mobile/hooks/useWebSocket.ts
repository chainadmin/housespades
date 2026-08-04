import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '@/config/api';

// Define types locally since we can't import from shared in mobile
export interface Card {
  id: string;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';
  value: string;
  numericValue: number;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  position: 'north' | 'south' | 'east' | 'west';
  hand: Card[];
  bid: number | null;
  tricks: number;
  isReady: boolean;
}

export interface Team {
  id: number;
  name: string;
  players: string[];
  score: number;
  bags: number;
  tricksWon: number;
  totalBid: number | null;
}

export interface Trick {
  cards: { playerId: string; card: Card }[];
  leadSuit: string | null;
  winnerId: string | null;
}

export interface GameState {
  id: string;
  mode: 'ace_high' | 'joker_joker_deuce_deuce';
  phase: 'waiting' | 'bidding' | 'playing' | 'round_end' | 'game_over';
  players: Player[];
  teams: Team[];
  currentPlayerIndex: number;
  dealerIndex: number;
  currentTrick: Trick;
  spadesBroken: boolean;
  roundNumber: number;
  winningScore: number;
}

type WSMessageType = 
  | 'start_game'
  | 'player_joined'
  | 'game_state_update'
  | 'place_bid'
  | 'play_card'
  | 'leave_lobby'
  | 'match_found'
  | 'authenticate'
  | 'error';

interface WSMessage {
  type: WSMessageType;
  payload: any;
}

interface UseWebSocketOptions {
  onGameStateUpdate?: (state: GameState) => void;
  onError?: (message: string) => void;
  onPlayerJoined?: (playerId: string) => void;
  onMatchFound?: (gameId: string) => void;
  onAuthenticated?: () => void;
  autoConnect?: boolean;
  userId?: number | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const pendingMessagesRef = useRef<Map<string, WSMessage>>(new Map());
  const intentionalDisconnectRef = useRef(false);
  const optionsRef = useRef(options);
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback((isExplicit?: boolean) => {
    if (isExplicit) {
      intentionalDisconnectRef.current = false;
    }
    if (intentionalDisconnectRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const wsUrl = `${WS_BASE_URL}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (intentionalDisconnectRef.current) {
        ws.close();
        return;
      }
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (optionsRef.current.userId) {
        ws.send(JSON.stringify({
          type: 'authenticate',
          payload: { userId: optionsRef.current.userId },
        }));
        if (__DEV__) console.log('[WebSocket] Sent authenticate message for user', optionsRef.current.userId);
      }

      // Gameplay actions made during a brief network interruption are retained
      // and sent in order as soon as the socket is healthy again.
      pendingMessagesRef.current.forEach((message) => {
        ws.send(JSON.stringify(message));
      });
      pendingMessagesRef.current.clear();
    };

    ws.onmessage = (event) => {
      if (intentionalDisconnectRef.current) return;
      try {
        const message = JSON.parse(event.data) as WSMessage;
        
        switch (message.type) {
          case 'player_joined':
            setPlayerId(message.payload.playerId);
            optionsRef.current.onPlayerJoined?.(message.payload.playerId);
            if (message.payload.authenticated) {
              if (__DEV__) console.log('[WebSocket] Authentication confirmed');
              optionsRef.current.onAuthenticated?.();
            }
            break;
          case 'game_state_update':
            setGameState(message.payload);
            optionsRef.current.onGameStateUpdate?.(message.payload);
            break;
          case 'match_found':
            if (__DEV__) console.log('[WebSocket] Match found:', message.payload.gameId);
            optionsRef.current.onMatchFound?.(message.payload.gameId);
            break;
          case 'error':
            optionsRef.current.onError?.(message.payload.message);
            break;
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      
      if (intentionalDisconnectRef.current) return;
      
      if (!reconnectTimeoutRef.current) {
        const attempt = reconnectAttemptRef.current++;
        const delay = Math.min(8000, 750 * 2 ** attempt) + Math.random() * 250;
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      if (__DEV__) console.error('WebSocket error:', error);
    };
  }, []);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    pendingMessagesRef.current.clear();
    reconnectAttemptRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    if (message.type === 'place_bid' || message.type === 'play_card') {
      pendingMessagesRef.current.set(message.type, message);
    }
    return false;
  }, []);

  const startGame = useCallback((
    mode: 'ace_high' | 'joker_joker_deuce_deuce',
    pointGoal: string,
    players: { id: string; name: string; isBot: boolean }[]
  ) => {
    sendMessage({
      type: 'start_game',
      payload: { mode, pointGoal, players },
    });
  }, [sendMessage]);

  const placeBid = useCallback((bid: number) => {
    if (__DEV__) console.log(`[WebSocket] Sending place_bid: ${bid}, wsReady: ${wsRef.current?.readyState === WebSocket.OPEN}`);
    const sent = sendMessage({
      type: 'place_bid',
      payload: { bid },
    });
    if (!sent && __DEV__) console.log('[WebSocket] Bid queued until reconnection');
  }, [sendMessage]);

  const playCard = useCallback((cardId: string) => {
    if (__DEV__) console.log(`[WebSocket] Sending play_card: ${cardId}, wsReady: ${wsRef.current?.readyState === WebSocket.OPEN}`);
    const sent = sendMessage({
      type: 'play_card',
      payload: { cardId },
    });
    if (!sent && __DEV__) console.log('[WebSocket] Card play queued until reconnection');
  }, [sendMessage]);

  const leaveLobby = useCallback(() => {
    sendMessage({
      type: 'leave_lobby',
      payload: {},
    });
    setGameState(null);
  }, [sendMessage]);

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
