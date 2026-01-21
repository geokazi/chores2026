/**
 * Secure Kid Dashboard Component (Client-Side Active Kid Loading)
 * Based on original repo's simple session pattern - under 200 lines
 */

import { useEffect, useState } from "preact/hooks";
import { ActiveKidSessionManager } from "../lib/active-kid-session.ts";
import KidDashboard from "./KidDashboard.tsx";
import WebSocketManager from "./WebSocketManager.tsx";
import AppHeader from "./AppHeader.tsx";

interface GoalStatus {
  enabled: boolean;
  target: number;
  progress: number;
  bonus: number;
  achieved: boolean;
}

interface Props {
  family: any;
  familyMembers: any[];
  recentActivity: any[];
  goalStatus?: GoalStatus | null;
}

export default function SecureKidDashboard({ family, familyMembers, recentActivity, goalStatus }: Props) {
  const [activeKid, setActiveKid] = useState<any>(null);
  const [todaysChores, setTodaysChores] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // SECURITY: Clear parent session when kid dashboard is accessed
    // This ensures parent must re-enter PIN when switching back to parent features
    clearParentSessionOnKidDashboardAccess();
    
    loadActiveKid();
  }, [familyMembers]);

  const clearParentSessionOnKidDashboardAccess = async () => {
    try {
      const { clearParentSessionOnKidAccess } = await import("../lib/auth/parent-session.ts");
      clearParentSessionOnKidAccess("kid dashboard accessed");
    } catch (error) {
      console.error("Failed to clear parent session on kid dashboard access:", error);
    }
  };

  // Handle real-time points updates via WebSocketManager
  const handleLeaderboardUpdate = (leaderboard: any[]) => {
    if (!activeKid) return;
    
    console.log('🏆 Live points update for kid:', leaderboard);
    
    // Update active kid's points if they're in the leaderboard update
    const kidUpdate = leaderboard.find(p => p.user_id === activeKid.id);
    if (kidUpdate) {
      setActiveKid((current: any) => ({
        ...current,
        current_points: kidUpdate.points
      }));
    }
  };

  const handleWebSocketMessage = (message: any) => {
    if (message.type === "leaderboard_update") {
      setWsConnected(true);
    } else if (message.type === "feature_disabled" || message.type === "fallback_mode") {
      setWsConnected(false);
    }
  };

  const loadActiveKid = async () => {
    try {
      // Get active kid from session
      const activeKidId = ActiveKidSessionManager.getActiveKidId();
      
      if (!activeKidId) {
        // No active kid - redirect to selector
        window.location.href = "/";
        return;
      }

      // Find kid in family members
      const kid = familyMembers.find(member => member.id === activeKidId);
      if (!kid) {
        // Kid not in family - clear session and redirect
        ActiveKidSessionManager.clearActiveKid();
        window.location.href = "/";
        return;
      }

      setActiveKid(kid);

      // Load kid's chores and events
      await Promise.all([
        loadKidChores(activeKidId),
        loadKidEvents(activeKidId),
      ]);
      
    } catch (err) {
      console.error("Error loading active kid:", err);
      setError("Failed to load kid information");
    } finally {
      setLoading(false);
    }
  };

  const loadKidChores = async (kidId: string) => {
    try {
      // Get local date in YYYY-MM-DD format (avoids UTC timezone issues)
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Secure API call - kid ID in request body, not URL
      const response = await fetch('/api/kids/chores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kidId, localDate }),
      });
      
      if (response.ok) {
        const chores = await response.json();
        setTodaysChores(chores);
      } else {
        console.error("Failed to load chores");
        setTodaysChores([]);
      }
    } catch (err) {
      console.error("Error loading chores:", err);
      setTodaysChores([]);
    }
  };

  const loadKidEvents = async (kidId: string) => {
    try {
      // Pass local date to avoid timezone issues
      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const response = await fetch(`/api/events?localDate=${localDate}`);

      if (response.ok) {
        const data = await response.json();
        const events = data.events || [];

        // Filter events where kid is a participant (or show all if no participants specified)
        const kidEvents = events.filter((event: any) => {
          // If no participants specified, show to everyone
          if (!event.participants || event.participants.length === 0) {
            return true;
          }
          // Otherwise, check if kid is in participants list
          const isParticipant = event.participants.includes(kidId);
          if (!isParticipant) {
            console.log("📅 Event filtered out (not participant):", {
              event: event.title,
              participants: event.participants,
              kidId,
            });
          }
          return isParticipant;
        });

        // Only show events from today through next 7 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        const upcomingKidEvents = kidEvents.filter((event: any) => {
          const eventDate = new Date(event.event_date + "T00:00:00");
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= today && eventDate <= weekFromNow;
        });

        console.log("📅 Kid events loaded:", {
          total: events.length,
          forKid: kidEvents.length,
          upcoming: upcomingKidEvents.length,
          kidId,
        });

        // Fetch chores linked to these events (Fix 0b)
        if (upcomingKidEvents.length > 0) {
          const eventIds = upcomingKidEvents.map((e: any) => e.id);
          try {
            const choresResponse = await fetch("/api/chores/by-events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ eventIds, memberId: kidId }),
            });
            if (choresResponse.ok) {
              const { chores } = await choresResponse.json();
              console.log("📋 Event-linked chores loaded:", chores.length);

              // Merge chores into events
              const eventsWithChores = upcomingKidEvents.map((event: any) => ({
                ...event,
                linked_chores: chores.filter((c: any) => c.family_event_id === event.id),
              }));
              setUpcomingEvents(eventsWithChores);
            } else {
              setUpcomingEvents(upcomingKidEvents);
            }
          } catch (err) {
            console.error("Error loading event chores:", err);
            setUpcomingEvents(upcomingKidEvents);
          }
        } else {
          setUpcomingEvents(upcomingKidEvents);
        }
      } else {
        console.error("Failed to load events");
        setUpcomingEvents([]);
      }
    } catch (err) {
      console.error("Error loading events:", err);
      setUpcomingEvents([]);
    }
  };

  if (loading) {
    return (
      <div class="container">
        <div style={{ 
          textAlign: "center", 
          padding: "3rem",
          color: "var(--color-text-light)" 
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !activeKid) {
    return (
      <div class="container">
        <div class="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--color-warning)" }}>
            {error || "No active kid session found"}
          </p>
          <a href="/" class="btn btn-primary" style={{ marginTop: "1rem" }}>
            Back to Kid Selection
          </a>
        </div>
      </div>
    );
  }

  return (
    <WebSocketManager 
      familyId={family.id}
      onLeaderboardUpdate={handleLeaderboardUpdate}
      onMessage={handleWebSocketMessage}
    >
      {/* Mobile-friendly header */}
      <AppHeader
        currentPage="dashboard"
        pageTitle={`${activeKid.name}'s Board`}
        familyMembers={familyMembers}
        currentUser={activeKid}
        userRole="child"
      />

      {/* Family Goal Progress - Motivational display for kids */}
      {goalStatus?.enabled && (
        <div class="card" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🎯</span>
            <span style={{ fontWeight: "600" }}>Family Goal This Week</span>
          </div>

          {/* Progress Header */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
            <span style={{ fontWeight: "500" }}>${goalStatus.progress} of ${goalStatus.target}</span>
            <span style={{ color: "var(--color-text-light)" }}>
              {Math.min(Math.round((goalStatus.progress / goalStatus.target) * 100), 100)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            height: "16px",
            background: "#e5e7eb",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              width: `${Math.min((goalStatus.progress / goalStatus.target) * 100, 100)}%`,
              background: goalStatus.achieved
                ? "var(--color-success)"
                : "var(--color-primary)",
              borderRadius: "8px",
              transition: "width 0.3s ease"
            }} />
          </div>

          {/* Motivational Message */}
          <p style={{
            textAlign: "center",
            marginTop: "0.75rem",
            marginBottom: "0",
            fontWeight: "500",
            fontSize: "0.9rem",
            color: goalStatus.achieved ? "var(--color-success)" : "var(--color-text)"
          }}>
            {goalStatus.achieved
              ? `🎉 Goal reached! Everyone gets +$${goalStatus.bonus}!`
              : `💪 $${goalStatus.target - goalStatus.progress} more together → everyone gets +$${goalStatus.bonus}!`
            }
          </p>
        </div>
      )}

      {/* Kid Dashboard */}
      <KidDashboard
        kid={activeKid}
        family={family}
        familyMembers={familyMembers}
        todaysChores={todaysChores}
        upcomingEvents={upcomingEvents}
        recentActivity={recentActivity}
        onChoreComplete={() => {
          // Refresh chores after completion to get updated data
          if (activeKid) {
            loadKidChores(activeKid.id);
          }
        }}
        onPrepTaskToggle={async (eventId, taskId, done) => {
          try {
            // Optimistic update
            setUpcomingEvents(prev => prev.map(event => {
              if (event.id !== eventId) return event;
              const prepTasks = event.metadata?.prep_tasks || [];
              return {
                ...event,
                metadata: {
                  ...event.metadata,
                  prep_tasks: prepTasks.map((t: any) =>
                    t.id === taskId ? { ...t, done } : t
                  ),
                },
              };
            }));

            // Send to API
            const response = await fetch(`/api/events/${eventId}/prep-task`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ taskId, done }),
            });

            if (!response.ok) {
              // Revert on failure
              loadKidEvents(activeKid.id);
            }
          } catch (error) {
            console.error("Failed to toggle prep task:", error);
            loadKidEvents(activeKid.id);
          }
        }}
      />
    </WebSocketManager>
  );
}