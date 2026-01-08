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
      const familyScoreWsUrl = Deno.env.get("FAMILYSCORE_WEBSOCKET_URL");
      const familyScoreApiKey = Deno.env.get("FAMILYSCORE_API_KEY");

      if (!familyScoreWsUrl || !familyScoreApiKey) {
        console.warn("FamilyScore WebSocket URL or API key not configured", {
          hasUrl: !!familyScoreWsUrl,
          hasKey: !!familyScoreApiKey,
        });
        return;
      }

      try {
        // Connect to FamilyScore Phoenix Channel with authentication
        // Try multiple authentication approaches
        let wsUrl = `${familyScoreWsUrl}/websocket?vsn=2.0.0`;
        
        familyScoreSocket = new WebSocket(wsUrl, {
          headers: {
            "Origin": "http://localhost:8001",
            "Authorization": `Bearer ${familyScoreApiKey}`,
            "x-api-key": familyScoreApiKey,
          },
        });

        familyScoreSocket.addEventListener("open", () => {
          console.log(`🚀 Connected to FamilyScore for family ${familyId}`);

          // Join the family channel with authentication
          const joinMessage = {
            topic: `family:${familyId}`,
            event: "phx_join",
            payload: {
              api_key: familyScoreApiKey,
              family_id: familyId,
            },
            ref: "1",
          };

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
          
          // If error code 1011 (internal server error), stop retrying
          if (event.code === 1011) {
            console.log(`🔴 FamilyScore WebSocket: Server error 1011, disabling reconnection for family ${familyId}`);
            
            // Send fallback message to client
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(JSON.stringify({
                type: "error",
                message: "Real-time sync temporarily unavailable",
                fallback: true,
                familyId: familyId,
              }));
            }
            return;
          }
          
          // For other errors, attempt reconnection after 5 seconds
          setTimeout(() => {
            if (clientSocket.readyState === WebSocket.OPEN) {
              connectToFamilyScore(familyId, clientSocket);
            }
          }, 5000);
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
