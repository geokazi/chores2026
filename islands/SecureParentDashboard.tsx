/**
 * Secure Parent Dashboard Component (Client-Side Active Parent Loading)
 * Same pattern as SecureKidDashboard - reads active parent from session storage
 */

import { useEffect, useState } from "preact/hooks";
import { ActiveKidSessionManager } from "../lib/active-kid-session.ts";

interface Props {
  family: any;
  familyMembers: any[];
  recentActivity: any[];
}

export default function SecureParentDashboard({ family, familyMembers, recentActivity }: Props) {
  const [activeParent, setActiveParent] = useState<any>(null);
  const [parentChores, setParentChores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(null);

  useEffect(() => {
    loadActiveParent();
  }, [familyMembers]);

  const loadActiveParent = async () => {
    try {
      // Get active parent from session (reusing kid session manager)
      const activeParentId = ActiveKidSessionManager.getActiveKidId();
      
      if (!activeParentId) {
        // No active parent - redirect to selector
        window.location.href = "/";
        return;
      }

      // Find parent in family members
      const parent = familyMembers.find(member => 
        member.id === activeParentId && member.role === "parent"
      );
      
      if (!parent) {
        // Parent not in family or is not a parent - clear session and redirect
        ActiveKidSessionManager.clearActiveKid();
        window.location.href = "/";
        return;
      }

      setActiveParent(parent);
      
      // Load parent's chores
      await loadParentChores(activeParentId);
      
    } catch (err) {
      console.error("Error loading active parent:", err);
      setError("Failed to load parent information");
    } finally {
      setLoading(false);
    }
  };

  const loadParentChores = async (parentId: string) => {
    try {
      // Secure API call - parent ID in request body, not URL
      const response = await fetch('/api/kids/chores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kidId: parentId }), // Reusing same API
      });
      
      if (response.ok) {
        const chores = await response.json();
        setParentChores(chores);
      } else {
        console.error("Failed to load chores");
        setParentChores([]);
      }
    } catch (err) {
      console.error("Error loading chores:", err);
      setParentChores([]);
    }
  };

  const handleCompleteChore = async (choreId: string) => {
    if (!activeParent) return;
    
    setCompletingChoreId(choreId);
    
    try {
      const response = await fetch(`/api/chores/${choreId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: activeParent.id,
          family_id: family.id,
        }),
      });

      if (response.ok) {
        // Reload chores to show updated state
        await loadParentChores(activeParent.id);
      } else {
        console.error("Failed to complete chore");
        alert("Failed to complete chore");
      }
    } catch (error) {
      console.error("Error completing chore:", error);
      alert("Error completing chore");
    } finally {
      setCompletingChoreId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "3rem",
        color: "var(--color-text-light)" 
      }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <p>Loading your chores...</p>
      </div>
    );
  }

  if (error || !activeParent) {
    return (
      <div class="card" style={{ textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "var(--color-warning)" }}>
          {error || "No active parent session found"}
        </p>
        <a href="/" class="btn btn-primary" style={{ marginTop: "1rem" }}>
          Back to Family Selection
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div class="header">
        <div>
          <a href="/" style={{ color: "white", textDecoration: "none" }}>
            ← Switch User
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>👨‍💼</span>
          <span>{activeParent.name}</span>
          <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>(Parent)</span>
        </div>
        <div>
          <a
            href="/parent/dashboard"
            style={{ color: "white", textDecoration: "none" }}
          >
            👨‍👩‍👧‍👦
          </a>
        </div>
      </div>

      {/* Parent Stats */}
      <div class="card" style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏆</div>
        <div style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          color: "var(--color-primary)",
          marginBottom: "0.5rem"
        }}>
          {activeParent.current_points || 0} pts
        </div>
        <div style={{
          fontSize: "0.875rem",
          color: "var(--color-text-light)",
          marginBottom: "1rem"
        }}>
          Today's Progress: {parentChores.filter(c => c.status === "completed").length}/{parentChores.length} chores
        </div>
      </div>

      {/* My Chores Section */}
      <div class="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          marginBottom: "1rem",
        }}>
          My Chores ({parentChores.length})
        </h2>

        {parentChores.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "2rem",
            color: "var(--color-text-light)" 
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
            <p>No chores assigned today!</p>
            <p style={{ fontSize: "0.875rem" }}>Great job staying on top of things.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {parentChores.map((chore: any) => (
              <div
                key={chore.id}
                class="card"
                style={{
                  padding: "1.25rem",
                  border: "1px solid var(--color-border)",
                  backgroundColor: chore.status === "completed" ? "#f0f9ff" : "white",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "1.5rem" }}>
                        {chore.chore_template?.icon || "📋"}
                      </span>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
                        {chore.chore_template?.name || "Chore"}
                      </h3>
                    </div>
                    
                    {chore.chore_template?.description && (
                      <p style={{ 
                        fontSize: "0.875rem", 
                        color: "var(--color-text-light)", 
                        margin: "0.5rem 0",
                        lineHeight: "1.4"
                      }}>
                        {chore.chore_template.description}
                      </p>
                    )}

                    {/* Due date and time */}
                    {chore.due_date && (
                      <div style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text-light)",
                        marginBottom: "0.5rem"
                      }}>
                        📅 Due: {new Date(chore.due_date).toLocaleDateString()} at {new Date(chore.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    
                    <div style={{ 
                      fontSize: "1rem", 
                      color: "var(--color-primary)", 
                      fontWeight: "600" 
                    }}>
                      {chore.point_value} points
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: "1rem" }}>
                    <span
                      onClick={() => chore.status === "pending" && handleCompleteChore(chore.id)}
                      style={{
                        fontSize: "1.5rem",
                        color: chore.status === "completed" ? "var(--color-success)" : "var(--color-text)",
                        cursor: chore.status === "pending" ? "pointer" : "default",
                        display: "inline-block",
                        padding: "0.5rem",
                        opacity: completingChoreId === chore.id ? 0.5 : 1,
                      }}
                    >
                      {completingChoreId === chore.id ? "⏳" : (chore.status === "completed" ? "✓" : "☐")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Link to Family Dashboard */}
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <a
          href="/parent/dashboard"
          class="btn btn-secondary"
          style={{ fontSize: "0.875rem" }}
        >
          👨‍👩‍👧‍👦 View Family Dashboard
        </a>
      </div>
    </>
  );
}