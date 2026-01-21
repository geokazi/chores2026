/**
 * Live Activity Feed Component
 * Shows real-time family activities - chore completions, events, prep tasks
 * Supports both legacy chore_assignments format and new family_activity format
 */

import { useEffect, useState } from "preact/hooks";

// New activity format from ActivityService (family_activity table)
interface NewActivityData {
  v: number;
  type: string;
  actor_id: string;
  actor_name: string;
  icon: string;
  title: string;
  target?: {
    type: string;
    id: string;
    name: string;
  };
  points?: number;
  meta?: Record<string, unknown>;
}

interface NewActivity {
  id: string;
  family_id: string;
  created_at: string;
  data: NewActivityData;
}

// Legacy format from ChoreService.getRecentActivity (chore_assignments)
interface LegacyActivity {
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

// Union type for activity items
type ActivityItem = NewActivity | LegacyActivity;

interface Props {
  initialActivity: ActivityItem[];
  familyId: string;
}

// Check if activity is new format
function isNewActivity(activity: ActivityItem): activity is NewActivity {
  return "data" in activity && typeof activity.data === "object";
}

export default function LiveActivityFeed({ initialActivity, familyId }: Props) {
  const [activities, setActivities] = useState(initialActivity);
  const [isLive, setIsLive] = useState(false);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Get icon for legacy chore format
  const getLegacyChoreIcon = (chore?: { name: string; icon?: string }) => {
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

  // Render new activity format
  const renderNewActivity = (activity: NewActivity, index: number) => {
    const { data, created_at } = activity;
    const hasPoints = data.points !== undefined && data.points > 0;

    return (
      <div
        key={`${activity.id}_${index}`}
        class="activity-item"
        style={{
          animation:
            index === 0 && isLive ? "fadeInSlide 0.5s ease-out" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.25rem" }}>{data.icon}</span>
          <div>
            <div class="activity-text">{data.title}</div>
            <div class="activity-time">
              {hasPoints && <span>+{data.points} pts • </span>}
              {formatTimeAgo(created_at)}
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
    );
  };

  // Render legacy activity format (chore completion from chore_assignments)
  const renderLegacyActivity = (activity: LegacyActivity, index: number) => {
    return (
      <div
        key={`${activity.id}_${index}`}
        class="activity-item"
        style={{
          animation:
            index === 0 && isLive ? "fadeInSlide 0.5s ease-out" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.25rem" }}>
            {getLegacyChoreIcon(activity.chore_template)}
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
    );
  };

  // TODO: Temporarily disabled to prevent duplicate WebSocket connections
  // WebSocket connection will be handled by LiveLeaderboard component
  useEffect(() => {
    // Disabled to prevent duplicate connections
    console.log("🔕 ActivityFeed WebSocket disabled - using shared connection");
    return;

    const connectWebSocket = () => {
      try {
        // This will connect to our Fresh WebSocket proxy route
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(
          `${protocol}//${window.location.host}/api/familyscore/live/${familyId}`
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

              // Add new activity in new format
              const newActivity: NewActivity = {
                id: data.chore_id || `activity_${Date.now()}`,
                family_id: familyId,
                created_at: new Date().toISOString(),
                data: {
                  v: 1,
                  type: "chore_completed",
                  actor_id: data.user_id,
                  actor_name: data.user_name || "Family Member",
                  icon: data.icon || "✅",
                  title: `${data.user_name || "Someone"} completed "${data.chore_name || "chore"}"`,
                  points: data.points || 0,
                },
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
        {activities.map((activity, index) =>
          isNewActivity(activity)
            ? renderNewActivity(activity, index)
            : renderLegacyActivity(activity, index)
        )}

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
