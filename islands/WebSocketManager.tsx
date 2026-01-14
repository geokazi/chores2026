/**
 * Shared WebSocket Manager for FamilyScore Integration
 * Provides a single WebSocket connection shared across all components
 */

import { useEffect, useState } from "preact/hooks";

interface WebSocketMessage {
  type: string;
  familyId: string;
  timestamp: string;
  [key: string]: any;
}

interface WebSocketManagerProps {
  familyId: string;
  onLeaderboardUpdate?: (leaderboard: any[]) => void;
  onActivityUpdate?: (activity: any) => void;
  onMessage?: (message: WebSocketMessage) => void;
  children: any;
}

let globalWebSocket: WebSocket | null = null;
let globalFamilyId: string | null = null;
const subscribers: Set<(message: WebSocketMessage) => void> = new Set();

export default function WebSocketManager({
  familyId,
  onLeaderboardUpdate,
  onActivityUpdate,
  onMessage,
  children,
}: WebSocketManagerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Create message handler for this component
    const handleMessage = (message: WebSocketMessage) => {
      // Call component-specific handlers
      if (onMessage) onMessage(message);
      
      if (message.type === "leaderboard_update" && onLeaderboardUpdate) {
        onLeaderboardUpdate(message.leaderboard || []);
      }
      
      if (message.type === "chore_completed" && onActivityUpdate) {
        onActivityUpdate(message);
      }
    };

    // Add this component as a subscriber
    subscribers.add(handleMessage);

    // Create or reuse WebSocket connection
    const connectWebSocket = () => {
      // If we already have a connection for this family, reuse it
      if (globalWebSocket && globalFamilyId === familyId && globalWebSocket.readyState === WebSocket.OPEN) {
        setIsConnected(true);
        setIsLive(true);
        return;
      }

      // Close any existing connection for different family
      if (globalWebSocket && globalFamilyId !== familyId) {
        globalWebSocket.close();
        globalWebSocket = null;
      }

      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const hostname = window.location.hostname;
        
        // Detect Fly.io deployment and use proper WebSocket URL
        let websocketUrl;
        if (hostname.includes('.fly.dev')) {
          websocketUrl = `${protocol}//${hostname}/api/familyscore/live/${familyId}`;
        } else {
          websocketUrl = `${protocol}//${window.location.host}/api/familyscore/live/${familyId}`;
        }
        
        const ws = new WebSocket(websocketUrl);

        ws.onopen = () => {
          console.log("🔗 Shared WebSocket connected to FamilyScore");
          setIsConnected(true);
          setIsLive(true);
          globalWebSocket = ws;
          globalFamilyId = familyId;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Broadcast to all subscribers
            subscribers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.error("Error in WebSocket message handler:", error);
              }
            });
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onclose = () => {
          console.log("❌ Shared WebSocket disconnected");
          setIsConnected(false);
          setIsLive(false);
          globalWebSocket = null;
          globalFamilyId = null;
          
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
          setIsLive(false);
        };

      } catch (error) {
        console.error("Failed to create WebSocket:", error);
      }
    };

    // Connect on mount
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      subscribers.delete(handleMessage);
      
      // If no more subscribers, close the connection
      if (subscribers.size === 0 && globalWebSocket) {
        globalWebSocket.close();
        globalWebSocket = null;
        globalFamilyId = null;
      }
    };
  }, [familyId, onLeaderboardUpdate, onActivityUpdate, onMessage]);

  // Provide connection status to children
  return (
    <div data-websocket-connected={isConnected} data-websocket-live={isLive}>
      {children}
    </div>
  );
}