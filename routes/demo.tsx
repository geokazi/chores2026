/**
 * Demo Mode Route
 * Lets users experience ChoreGami before creating an account
 * No authentication required - uses static demo data
 */

import { Handlers, PageProps } from "$fresh/server.ts";
import DemoKidDashboard from "../islands/DemoKidDashboard.tsx";

interface DemoData {
  family: { id: string; name: string };
  members: Array<{
    id: string;
    name: string;
    role: "child" | "parent";
    current_points: number;
    avatar: string;
  }>;
  chores: Record<string, Array<{
    id: string;
    name: string;
    icon: string;
    points: number;
    status: "pending" | "completed";
  }>>;
  recentActivity: Array<{
    id: string;
    text: string;
    points: number;
    time: string;
  }>;
}

// Static demo data embedded to avoid fetch on every request
const DEMO_DATA: DemoData = {
  family: {
    id: "demo-family",
    name: "The Johnson Family",
  },
  members: [
    {
      id: "demo-emma",
      name: "Emma",
      role: "child",
      current_points: 245,
      avatar: "girl",
    },
    {
      id: "demo-jake",
      name: "Jake",
      role: "child",
      current_points: 198,
      avatar: "boy",
    },
    {
      id: "demo-parent",
      name: "Mom",
      role: "parent",
      current_points: 0,
      avatar: "parent",
    },
  ],
  chores: {
    emma: [
      {
        id: "demo-chore-1",
        name: "Make Your Bed",
        icon: "bed",
        points: 10,
        status: "completed",
      },
      {
        id: "demo-chore-2",
        name: "Feed the Dog",
        icon: "dog",
        points: 15,
        status: "pending",
      },
      {
        id: "demo-chore-3",
        name: "Do Homework",
        icon: "homework",
        points: 20,
        status: "pending",
      },
    ],
    jake: [
      {
        id: "demo-chore-4",
        name: "Make Your Bed",
        icon: "bed",
        points: 10,
        status: "completed",
      },
      {
        id: "demo-chore-5",
        name: "Take Out Trash",
        icon: "trash",
        points: 15,
        status: "pending",
      },
    ],
  },
  recentActivity: [
    {
      id: "activity-1",
      text: "Emma completed \"Make Your Bed\"",
      points: 10,
      time: "2 min ago",
    },
    {
      id: "activity-2",
      text: "Jake completed \"Make Your Bed\"",
      points: 10,
      time: "5 min ago",
    },
    {
      id: "activity-3",
      text: "Mom awarded Jake bonus points",
      points: 25,
      time: "Yesterday",
    },
  ],
};

export const handler: Handlers<DemoData> = {
  GET(_req, ctx) {
    return ctx.render(DEMO_DATA);
  },
};

export default function DemoPage({ data }: PageProps<DemoData>) {
  return (
    <div class="container">
      {/* Demo Mode Header */}
      <div class="header" style={{ position: "relative" }}>
        <div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.25rem"
          }}>
            <span style={{
              background: "rgba(255,255,255,0.2)",
              padding: "0.125rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.7rem",
              fontWeight: "600",
              letterSpacing: "0.05em"
            }}>
              DEMO
            </span>
          </div>
          <h1>ChoreGami</h1>
        </div>
        <div class="user-info">
          <a
            href="/login"
            style={{
              padding: "0.5rem 1rem",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "white",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: "600",
              transition: "background 0.2s ease",
            }}
          >
            Exit Demo
          </a>
        </div>
      </div>

      {/* Welcome Message */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          Welcome to {data.family.name}!
        </div>
        <div style={{ fontSize: "0.875rem", color: "var(--color-text-light)" }}>
          This is a demo of how ChoreGami helps families track chores and earn points.
        </div>
      </div>

      {/* Demo Dashboard */}
      <DemoKidDashboard
        familyName={data.family.name}
        members={data.members}
        initialChores={data.chores}
        initialActivity={data.recentActivity}
      />

      {/* Call to Action */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          background: "var(--color-card)",
          borderRadius: "16px",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "700",
            marginBottom: "0.75rem",
            color: "var(--color-text)",
          }}
        >
          Ready to get started?
        </h3>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-light)",
            marginBottom: "1rem",
          }}
        >
          Create your free account and set up your family in under 2 minutes.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/register"
            class="btn btn-primary"
            style={{ textDecoration: "none" }}
          >
            Create Free Account
          </a>
          <a
            href="/login"
            class="btn btn-secondary"
            style={{ textDecoration: "none" }}
          >
            Sign In
          </a>
        </div>
      </div>

      {/* Footer note */}
      <div
        style={{
          marginTop: "1.5rem",
          textAlign: "center",
          fontSize: "0.75rem",
          color: "var(--color-text-light)",
        }}
      >
        Demo data resets on page refresh. Your real data stays private and secure.
      </div>
    </div>
  );
}
