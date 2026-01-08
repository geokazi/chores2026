/**
 * WebSocket Proxy Route for FamilyScore Integration
 * Handles real-time connections to FamilyScore Phoenix Channels
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(req, ctx) {
    const familyId = ctx.params.family_id;
    const upgrade = req.headers.get("upgrade") || "";

    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected websocket upgrade request", {
        status: 426,
      });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    let familyScoreSocket: WebSocket | null = null;

    socket.addEventListener("open", () => {
      console.log(`🔗 Client WebSocket opened for family ${familyId}`);

      // Connect to FamilyScore Phoenix Channel
      connectToFamilyScore(familyId, socket);
    });

    socket.addEventListener("close", () => {
      console.log(`❌ Client WebSocket closed for family ${familyId}`);
      if (familyScoreSocket) {
        familyScoreSocket.close();
      }
    });

    socket.addEventListener("error", (e) => {
      console.error(`WebSocket error for family ${familyId}:`, e);
      if (familyScoreSocket) {
        familyScoreSocket.close();
      }
    });

    async function connectToFamilyScore(
      familyId: string,
      clientSocket: WebSocket,
    ) {
      const familyScoreWsEnabled = Deno.env.get("FAMILYSCORE_WEBSOCKET_ENABLED") === "true";
      const familyScoreWsUrl = Deno.env.get("FAMILYSCORE_WEBSOCKET_URL");
      const familyScoreApiKey = Deno.env.get("FAMILYSCORE_API_KEY");

      if (!familyScoreWsEnabled) {
        console.log("🔕 FamilyScore WebSocket disabled via feature flag");
        // Send fallback message to client
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: "feature_disabled",
            message: "Real-time sync disabled - using polling mode",
            familyId: familyId,
            timestamp: new Date().toISOString(),
          }));
        }
        return;
      }

      if (!familyScoreWsUrl || !familyScoreApiKey) {
        console.warn("FamilyScore WebSocket URL or API key not configured", {
          hasUrl: !!familyScoreWsUrl,
          hasKey: !!familyScoreApiKey,
        });
        return;
      }

      try {
        // Connect to FamilyScore Phoenix Channel (matching working test pattern)
        let wsUrl = `${familyScoreWsUrl}/websocket?vsn=1.0.0&token=${familyScoreApiKey}`;
        
        console.log(`🔗 Attempting to connect to: ${wsUrl}`);
        familyScoreSocket = new WebSocket(wsUrl);

        familyScoreSocket.addEventListener("open", () => {
          console.log(`🚀 Connected to FamilyScore Phoenix socket for family ${familyId}`);

          // Join the family channel (matching working test - empty payload)
          const joinMessage = {
            topic: `family:${familyId}`,
            event: "phx_join", 
            payload: {},
            ref: Date.now().toString(),
          };

          console.log(`📤 Sending join message:`, joinMessage);
          familyScoreSocket!.send(JSON.stringify(joinMessage));
        });

        familyScoreSocket.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.event === "phx_reply" && data.payload.status === "ok") {
              console.log(`✅ Successfully joined family:${familyId} channel`);
              return;
            }

            if (data.event === "leaderboard_update") {
              console.log(`📊 FamilyScore leaderboard update:`, data);

              // Transform FamilyScore data for our client
              const transformedData = {
                type: "leaderboard_update",
                familyId: familyId,
                leaderboard: data.payload.leaderboard || [],
                updated_at: data.payload.updated_at,
                timestamp: new Date().toISOString(),
              };

              // Forward to client
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify(transformedData));
              }
            } else if (data.event === "family_broadcast") {
              console.log(`📢 FamilyScore broadcast:`, data);

              // Forward broadcasts (achievements, celebrations, etc.)
              const transformedData = {
                type: data.payload.event || "broadcast",
                familyId: familyId,
                ...data.payload,
                timestamp: new Date().toISOString(),
              };

              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify(transformedData));
              }
            }
          } catch (error) {
            console.error("Error processing FamilyScore message:", error);
          }
        });

        familyScoreSocket.addEventListener("close", (event) => {
          console.log(`❌ FamilyScore WebSocket closed for family ${familyId}`, {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            url: wsUrl
          });
          
          // If connection never established (code 0) or server error (1011), stop retrying
          if (event.code === 0 || event.code === 1011) {
            console.log(`🔴 FamilyScore WebSocket: Connection failed (${event.code}), disabling real-time sync for family ${familyId}`);
            
            // Send fallback message to client
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: "fallback_mode",
                message: "Using polling mode - real-time sync unavailable",
                familyId: familyId,
                timestamp: new Date().toISOString(),
              }));
            }
            return;
          }
          
          // For other errors, attempt reconnection after 10 seconds
          setTimeout(() => {
            if (clientSocket.readyState === WebSocket.OPEN) {
              connectToFamilyScore(familyId, clientSocket);
            }
          }, 10000);
        });

        familyScoreSocket.addEventListener("error", (error) => {
          console.error(
            `FamilyScore WebSocket error for family ${familyId}:`,
            error,
          );
        });

        // Send heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          if (familyScoreSocket?.readyState === WebSocket.OPEN) {
            const heartbeat = {
              topic: "phoenix",
              event: "heartbeat",
              payload: {},
              ref: Date.now().toString(),
            };
            familyScoreSocket.send(JSON.stringify(heartbeat));
          } else {
            clearInterval(heartbeatInterval);
          }
        }, 30000); // Every 30 seconds
      } catch (error) {
        console.error(
          `Failed to connect to FamilyScore for family ${familyId}:`,
          error,
        );

        // Send error to client
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({
            type: "error",
            message: "Failed to connect to FamilyScore",
            familyId: familyId,
          }));
        }
      }
    }

    return response;
  },
};
