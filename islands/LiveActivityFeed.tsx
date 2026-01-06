/**
 * Live Activity Feed Component
 * Shows real-time family chore completions and activities
 */

import { useEffect, useState } from "preact/hooks";

interface ActivityItem {
  id: string;
  chore_template?: {
    name: string;
    icon?: string;
  };
  assigned_to_profile?: {
    id: string;
    name: string;
  };
  completed_by_profile?: {
    id: string;
    name: string;
  };
  point_value: number;
  completed_at: string;
}

interface Props {
  initialActivity: ActivityItem[];
  familyId: string;
}

export default function LiveActivityFeed({ initialActivity, familyId }: Props) {
  const [activities, setActivities] = useState(initialActivity);
  const [isLive, setIsLive] = useState(false);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const completed = new Date(timestamp);
    const diffMs = now.getTime() - completed.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getChoreIcon = (chore?: { name: string; icon?: string }) => {
    if (chore?.icon) return chore.icon;

    const name = chore?.name?.toLowerCase() || "";
    if (name.includes("dish")) return "🍽️";
    if (name.includes("trash")) return "🗑️";
    if (name.includes("bed")) return "🛏️";
    if (name.includes("dog") || name.includes("pet")) return "🐕";
    if (name.includes("room") || name.includes("clean")) return "🧹";
    if (name.includes("homework")) return "📚";
    if (name.includes("vacuum")) return "🔌";
    if (name.includes("laundry")) return "👕";
    return "✅";
  };

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // This will connect to our Fresh WebSocket proxy route
        const ws = new WebSocket(
          `wss://${window.location.host}/api/familyscore/live/${familyId}`,
        );

        ws.onopen = () => {
          console.log("🔗 Activity feed connected to WebSocket");
          setIsLive(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "chore_completed") {
              console.log("🎉 New activity received", data);

              // Add new activity to the front of the list
              const newActivity = {
                id: data.chore_id || `activity_${Date.now()}`,
                chore_template: {
                  name: data.chore_name || "Chore completed",
                  icon: data.icon,
                },
                assigned_to_profile: {
                  id: data.user_id,
                  name: data.user_name || "Family Member",
                },
                completed_by_profile: {
                  id: data.user_id,
                  name: data.user_name || "Family Member",
                },
                point_value: data.points || 0,
                completed_at: new Date().toISOString(),
              };

              setActivities((prev) => [newActivity, ...prev.slice(0, 9)]); // Keep only 10 most recent
            }
          } catch (error) {
            console.error("Error parsing activity WebSocket message:", error);
          }
        };

        ws.onclose = () => {
          console.log("❌ Activity WebSocket connection closed");
          setIsLive(false);
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error("Activity WebSocket error:", error);
          setIsLive(false);
        };

        return ws;
      } catch (error) {
        console.error("Failed to connect activity WebSocket:", error);
        setIsLive(false);
        return null;
      }
    };

    // Only connect WebSocket if FamilyScore is enabled
    if (familyId) {
      const ws = connectWebSocket();
      return () => {
        if (ws) {
          ws.close();
        }
      };
    }
  }, [familyId]);

  return (
    <div class="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3 style={{ fontSize: "1.125rem", fontWeight: "600" }}>
          Recent Activity
        </h3>
        {isLive && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-success)",
            }}
          >
            🟢 live
          </span>
        )}
      </div>

      <div class="activity-feed">
        {activities.map((activity, index) => (
          <div
            key={`${activity.id}_${index}`}
            class="activity-item"
            style={{
              animation: index === 0 && isLive
                ? "fadeInSlide 0.5s ease-out"
                : undefined,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <span style={{ fontSize: "1.25rem" }}>
                {getChoreIcon(activity.chore_template)}
              </span>
              <div>
                <div class="activity-text">
                  <strong>
                    {activity.assigned_to_profile?.name || "Someone"}
                  </strong>{" "}
                  completed{" "}
                  <em>"{activity.chore_template?.name || "a chore"}"</em>
                </div>
                <div class="activity-time">
                  +{activity.point_value} pts •{" "}
                  {formatTimeAgo(activity.completed_at)}
                  {isLive && index === 0 && (
                    <span
                      style={{
                        color: "var(--color-success)",
                        marginLeft: "0.5rem",
                      }}
                    >
                      🟢
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--color-text-light)",
              padding: "2rem",
            }}
          >
            <span
              style={{
                fontSize: "2rem",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              🏁
            </span>
            No recent activity yet.
            <br />
            Be the first to complete a chore!
          </div>
        )}
      </div>

      <style jsx>
        {`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}
      </style>
    </div>
  );
}
