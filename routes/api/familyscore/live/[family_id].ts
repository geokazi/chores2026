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
      const familyScoreWsUrl = Deno.env.get("FAMILYSCORE_WS_URL");
      const familyScoreApiKey = Deno.env.get("FAMILYSCORE_API_KEY");

      if (!familyScoreWsUrl || !familyScoreApiKey) {
        console.warn("FamilyScore WebSocket URL or API key not configured");
        return;
      }

      try {
        // Connect to FamilyScore Phoenix Channel
        familyScoreSocket = new WebSocket(
          `${familyScoreWsUrl}/socket/websocket?vsn=2.0.0`,
        );

        familyScoreSocket.addEventListener("open", () => {
          console.log(`🚀 Connected to FamilyScore for family ${familyId}`);

          // Join the family channel
          const joinMessage = {
            topic: `family:${familyId}`,
            event: "phx_join",
            payload: {
              api_key: familyScoreApiKey,
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

            if (
              data.event === "point_update" || data.event === "chore_completed"
            ) {
              console.log(`📊 FamilyScore event received:`, data);

              // Transform FamilyScore data for our client
              const transformedData = {
                type: data.event === "point_update"
                  ? "leaderboard_update"
                  : "chore_completed",
                familyId: familyId,
                userId: data.payload.user_id,
                userName: data.payload.user_name,
                points: data.payload.points,
                choreName: data.payload.chore_name,
                choreId: data.payload.chore_id,
                timestamp: new Date().toISOString(),
                leaderboard: data.payload.leaderboard || [],
              };

              // Forward to client
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify(transformedData));
              }
            }
          } catch (error) {
            console.error("Error processing FamilyScore message:", error);
          }
        });

        familyScoreSocket.addEventListener("close", () => {
          console.log(`❌ FamilyScore WebSocket closed for family ${familyId}`);
          // Attempt reconnection after 3 seconds
          setTimeout(() => {
            if (clientSocket.readyState === WebSocket.OPEN) {
              connectToFamilyScore(familyId, clientSocket);
            }
          }, 3000);
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
