/**
 * Parent Activity Tab - Real-time activity monitoring
 * Supports both legacy chore_assignments format and new family_activity format
 */

import { useEffect, useState } from "preact/hooks";

// Check if activity is new format (from family_activity table)
function isNewActivity(activity: any): boolean {
  return "data" in activity && typeof activity.data === "object";
}

// Icon mapping for new activity types
const ACTIVITY_ICONS: Record<string, string> = {
  chore_completed: "✅",
  chore_created: "📋",
  event_created: "📅",
  event_updated: "✏️",
  event_deleted: "🗑️",
  prep_task_added: "📝",
  prep_task_completed: "☑️",
  linked_chore_created: "🔗",
  point_adjustment: "⚙️",
};

// Color mapping for activity types
const ACTIVITY_COLORS: Record<string, string> = {
  chore_completed: "var(--color-success)",
  chore_created: "var(--color-primary)",
  event_created: "var(--color-secondary)",
  event_updated: "var(--color-secondary)",
  event_deleted: "var(--color-warning)",
  prep_task_added: "var(--color-primary)",
  prep_task_completed: "var(--color-success)",
  linked_chore_created: "var(--color-primary)",
  point_adjustment: "var(--color-accent)",
};

interface ParentActivityTabProps {
  family: any;
  recentActivity: any[];
}

export default function ParentActivityTab({ family, recentActivity }: ParentActivityTabProps) {
  const [activities, setActivities] = useState(recentActivity);

  const renderNewActivity = (activity: any) => {
    const { data, created_at } = activity;
    const hasPoints = data.points !== undefined && data.points > 0;
    const borderColor = ACTIVITY_COLORS[data.type] || "var(--color-primary)";

    return (
      <div
        key={activity.id}
        class="activity-item"
        style={{ borderLeftColor: borderColor }}
      >
        <div class="activity-content">
          <div class="activity-main">
            <span style={{ fontSize: "1.25rem" }}>{data.icon}</span>
            <span class="activity-text">{data.title}</span>
          </div>
          <div class="activity-meta">
            {hasPoints && <span class="points">+{data.points} points</span>}
            <span class="timestamp">
              {formatTimeAgo(created_at)}
            </span>
          </div>
        </div>
        {data.type === "chore_completed" && (
          <div class="activity-actions">
            <button
              class="btn-adjust"
              title="Adjust points"
              onClick={() => handleAdjustment(activity)}
            >
              ⚙️
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderLegacyActivity = (activity: any) => {
    return (
      <div key={activity.id} class="activity-item">
        <div class="activity-content">
          <div class="activity-main">
            <span class="child-name">
              {activity.assigned_to_profile?.name || "Unknown"}
            </span>
            <span class="activity-text">completed</span>
            <span class="chore-name">
              {activity.chore_template?.name ||
                activity.description ||
                "Unnamed chore"}
            </span>
          </div>
          <div class="activity-meta">
            <span class="points">+{activity.point_value} points</span>
            <span class="timestamp">
              {activity.completed_at
                ? formatTimeAgo(activity.completed_at)
                : "Recently"}
            </span>
          </div>
        </div>
        <div class="activity-actions">
          <button
            class="btn-adjust"
            title="Adjust points"
            onClick={() => handleAdjustment(activity)}
          >
            ⚙️
          </button>
        </div>
      </div>
    );
  };

  return (
    <div class="activity-container">
      <div class="activity-header">
        <h2>Recent Family Activity</h2>
        <div class="live-indicator">
          <span class="live-dot"></span>
          Live
        </div>
      </div>

      {activities.length === 0 ? (
        <div class="empty-state">
          <h3>No recent activity</h3>
          <p>Family activities will appear here in real-time.</p>
        </div>
      ) : (
        <div class="activity-list">
          {activities.map((activity) =>
            isNewActivity(activity)
              ? renderNewActivity(activity)
              : renderLegacyActivity(activity)
          )}
        </div>
      )}

      <style jsx>{`
        .activity-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }

        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--color-primary);
        }

        .activity-header h2 {
          margin: 0;
          color: var(--color-text);
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-success);
          font-weight: 600;
          font-size: 0.875rem;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background-color: var(--color-success);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--color-text);
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0;
          opacity: 0.7;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--color-card);
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border-left: 4px solid var(--color-success);
        }

        .activity-content {
          flex: 1;
        }

        .activity-main {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
        }

        .child-name {
          font-weight: 600;
          color: var(--color-primary);
          background: var(--color-bg);
          padding: 0.25rem 0.75rem;
          border-radius: 16px;
          font-size: 0.875rem;
        }

        .activity-text {
          color: var(--color-text);
          font-size: 0.875rem;
        }

        .chore-name {
          font-weight: 500;
          color: var(--color-text);
          font-size: 0.875rem;
        }

        .activity-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
        }

        .points {
          color: var(--color-success);
          font-weight: 600;
        }

        .timestamp {
          color: var(--color-text);
          opacity: 0.6;
        }

        .activity-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-adjust {
          background: var(--color-bg);
          border: 1px solid var(--color-primary);
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .btn-adjust:hover {
          background: var(--color-primary);
          color: white;
        }

        @media (max-width: 600px) {
          .activity-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .activity-item {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .activity-actions {
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function handleAdjustment(activity: any) {
  // TODO: Open point adjustment modal
  console.log("Adjust points for activity:", activity.id);
}
