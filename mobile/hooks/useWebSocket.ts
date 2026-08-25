import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '@/config/api';
import { getStoredSessionCookie } from '@/lib/auth';

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
  onDisconnected?: () => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  autoConnect?: boolean;
  userId?: number | null;
}

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'authenticating'
  | 'authenticated'
  | 'reconnecting'
  | 'error';

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authenticationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const pendingMessagesRef = useRef<Map<string, WSMessage>>(new Map());
  const intentionalDisconnectRef = useRef(false);
  const authenticatedRef = useRef(false);
  const optionsRef = useRef(options);
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const updateConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    optionsRef.current.onConnectionStateChange?.(state);
  }, []);

  const connect = useCallback((isExplicit?: boolean) => {
    if (isExplicit) {
      intentionalDisconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }
    if (intentionalDisconnectRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const wsUrl = `${WS_BASE_URL}/ws`;
    const isReconnect = reconnectAttemptRef.current > 0;
    updateConnectionState(isReconnect ? 'reconnecting' : 'connecting');
    setIsAuthenticated(false);
    authenticatedRef.current = false;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    let opened = false;
    let errorReported = false;

    connectionTimeoutRef.current = setTimeout(() => {
      if (wsRef.current !== ws || ws.readyState === WebSocket.OPEN) return;
      errorReported = true;
      updateConnectionState('error');
      optionsRef.current.onError?.('The online server did not respond. Check your connection and try again.');
      ws.close();
    }, 12000);

    ws.onopen = async () => {
      if (intentionalDisconnectRef.current || wsRef.current !== ws) {
        ws.close();
        return;
      }
      opened = true;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      updateConnectionState('connected');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (optionsRef.current.userId) {
        const sessionCookie = await getStoredSessionCookie();
        if (intentionalDisconnectRef.current || wsRef.current !== ws) return;
        if (!sessionCookie) {
          errorReported = true;
          updateConnectionState('error');
          optionsRef.current.onError?.('Your sign-in session is missing. Please sign in again to play online.');
          ws.close();
          return;
        }
        updateConnectionState('authenticating');
        ws.send(JSON.stringify({
          type: 'authenticate',
          payload: { sessionCookie },
        }));
        if (__DEV__) console.log('[WebSocket] Sent authenticate message for user', optionsRef.current.userId);
        authenticationTimeoutRef.current = setTimeout(() => {
          if (wsRef.current !== ws || authenticatedRef.current) return;
          errorReported = true;
          updateConnectionState('error');
          optionsRef.current.onError?.('The server could not verify your session. Please sign in again.');
          ws.close();
        }, 8000);
      }
    };

    ws.onmessage = (event) => {
      if (intentionalDisconnectRef.current || wsRef.current !== ws) return;
      try {
        const message = JSON.parse(event.data) as WSMessage;
        
        switch (message.type) {
          case 'player_joined':
            setPlayerId(message.payload.playerId);
            optionsRef.current.onPlayerJoined?.(message.payload.playerId);
            if (message.payload.authenticated) {
              if (__DEV__) console.log('[WebSocket] Authentication confirmed');
              if (authenticationTimeoutRef.current) {
                clearTimeout(authenticationTimeoutRef.current);
                authenticationTimeoutRef.current = null;
              }
              authenticatedRef.current = true;
              setIsAuthenticated(true);
              updateConnectionState('authenticated');
              optionsRef.current.onAuthenticated?.();

              // Gameplay actions made during a brief network interruption are retained
              // and sent only after the reconnected socket is authenticated.
              pendingMessagesRef.current.forEach((pendingMessage) => {
                ws.send(JSON.stringify(pendingMessage));
              });
              pendingMessagesRef.current.clear();
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
          case 'error': {
            const serverMessage = message.payload?.message || 'The online server reported an error.';
            if (/auth|session|sign.?in|unauthor/i.test(serverMessage)) {
              authenticatedRef.current = false;
              setIsAuthenticated(false);
              updateConnectionState('error');
              if (authenticationTimeoutRef.current) {
                clearTimeout(authenticationTimeoutRef.current);
                authenticationTimeoutRef.current = null;
              }
            }
            optionsRef.current.onError?.(serverMessage);
            break;
          }
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (authenticationTimeoutRef.current) {
        clearTimeout(authenticationTimeoutRef.current);
        authenticationTimeoutRef.current = null;
      }
      setIsConnected(false);
      setIsAuthenticated(false);
      authenticatedRef.current = false;
      wsRef.current = null;
      optionsRef.current.onDisconnected?.();

      if (!opened && !errorReported && !intentionalDisconnectRef.current) {
        optionsRef.current.onError?.('Unable to open a connection to the online server. Please try again.');
      }
      
      if (intentionalDisconnectRef.current) {
        updateConnectionState('idle');
        return;
      }
      
      if (!reconnectTimeoutRef.current) {
        const attempt = reconnectAttemptRef.current++;
        const delay = Math.min(8000, 750 * 2 ** attempt) + Math.random() * 250;
        updateConnectionState('reconnecting');
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      if (__DEV__) console.error('WebSocket error:', error);
      if (!opened && !errorReported) {
        errorReported = true;
        updateConnectionState('error');
        optionsRef.current.onError?.('Unable to reach the online server. Check your internet connection and try again.');
      }
    };
  }, [updateConnectionState]);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (authenticationTimeoutRef.current) {
      clearTimeout(authenticationTimeoutRef.current);
      authenticationTimeoutRef.current = null;
    }
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.close();
    }
    pendingMessagesRef.current.clear();
    reconnectAttemptRef.current = 0;
    authenticatedRef.current = false;
    setIsConnected(false);
    setIsAuthenticated(false);
    updateConnectionState('idle');
  }, [updateConnectionState]);

  const sendMessage = useCallback((message: WSMessage) => {
    const requiresAuthentication = Boolean(optionsRef.current.userId);
    if (
      wsRef.current?.readyState === WebSocket.OPEN &&
      (!requiresAuthentication || authenticatedRef.current)
    ) {
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
      connect(true);
    }
    return () => {
      disconnect();
    };
  }, [options.autoConnect, connect, disconnect]);

  return {
    connect,
    disconnect,
    isConnected,
    isAuthenticated,
    connectionState,
    playerId,
    gameState,
    startGame,
    placeBid,
    playCard,
    leaveLobby,
    sendMessage,
  };
}
