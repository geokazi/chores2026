/**
 * Weekly Grid Island Component
 * Displays printable/shareable weekly chore completion grid
 *
 * Features:
 * - Print via browser print dialog
 * - Share via Web Share API or copy link
 * - Responsive grid layout
 */

import { useState, useRef } from "preact/hooks";
import type { WeeklyGridData, GridKid, GridDay } from "../lib/services/grid-service.ts";

interface Props {
  gridData: WeeklyGridData;
  familyName: string;
}

export default function WeeklyGrid({ gridData, familyName }: Props) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared" | "error">("idle");
  const gridRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${familyName} Weekly Chore Grid - ${gridData.weekLabel}`;
    const shareText = `Check out our family's weekly chore progress!`;

    // Try Web Share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setShareStatus("shared");
        setTimeout(() => setShareStatus("idle"), 2000);
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
        if ((err as Error).name !== "AbortError") {
          console.warn("Share failed, falling back to clipboard:", err);
        }
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setShareStatus("error");
      setTimeout(() => setShareStatus("idle"), 2000);
    }
  };

  const getShareButtonText = () => {
    switch (shareStatus) {
      case "copied":
        return "Link Copied!";
      case "shared":
        return "Shared!";
      case "error":
        return "Failed";
      default:
        return "Share";
    }
  };

  return (
    <div class="weekly-grid-container">
      {/* Header with actions */}
      <div class="grid-header no-print">
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>
            Weekly Chore Grid
          </h2>
          <p style={{ color: "var(--color-text-light)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
            {gridData.weekLabel}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handlePrint}
            class="btn btn-secondary"
            style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
          >
            Print
          </button>
          <button
            onClick={handleShare}
            class="btn btn-primary"
            style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
            disabled={shareStatus !== "idle"}
          >
            {getShareButtonText()}
          </button>
        </div>
      </div>

      {/* Grid content (printable area) */}
      <div ref={gridRef} class="weekly-grid-content card" id="weekly-grid-printable">
        {/* Print header (hidden on screen) */}
        <div class="print-header print-only">
          <h1>{familyName} Weekly Chore Grid</h1>
          <p>{gridData.weekLabel}</p>
        </div>

        {/* Grid table */}
        <div class="grid-table-wrapper">
          <table class="grid-table">
            <thead>
              <tr>
                <th class="grid-cell-name">Kid</th>
                {gridData.kids[0]?.days.map((day: GridDay) => (
                  <th key={day.date} class="grid-cell-day">
                    {day.dayName}
                  </th>
                ))}
                <th class="grid-cell-total">Total</th>
                <th class="grid-cell-streak">Streak</th>
              </tr>
            </thead>
            <tbody>
              {gridData.kids.map((kid: GridKid) => (
                <tr key={kid.id}>
                  <td class="grid-cell-name">
                    <span class="kid-avatar">{kid.avatar}</span>
                    <span class="kid-name">{kid.name}</span>
                  </td>
                  {kid.days.map((day: GridDay) => (
                    <td
                      key={day.date}
                      class={`grid-cell-day ${day.complete ? "has-points" : "no-points"}`}
                    >
                      <span class="day-indicator">
                        {day.complete ? "✅" : "⬜"}
                      </span>
                      <span class="day-points">
                        {day.points > 0 ? day.points : "—"}
                      </span>
                    </td>
                  ))}
                  <td class="grid-cell-total">
                    <span class="total-points">{kid.weeklyTotal}</span>
                    <span class="total-label">pts</span>
                  </td>
                  <td class="grid-cell-streak">
                    {kid.streak > 0 && (
                      <>
                        <span class="streak-fire">🔥</span>
                        <span class="streak-count">{kid.streak}</span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div class="grid-legend">
          <span class="legend-item">
            <span>✅</span> Completed chores
          </span>
          <span class="legend-item">
            <span>⬜</span> No activity
          </span>
          <span class="legend-item">
            <span>🔥</span> Active streak
          </span>
        </div>

        {/* Print footer */}
        <div class="print-footer print-only">
          <p>Generated by ChoreGami on {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Inline styles for the grid */}
      <style>{`
        .weekly-grid-container {
          margin-bottom: 1.5rem;
        }

        .grid-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .weekly-grid-content {
          overflow-x: auto;
        }

        .grid-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .grid-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 500px;
        }

        .grid-table th,
        .grid-table td {
          padding: 0.75rem 0.5rem;
          text-align: center;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .grid-table th {
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--color-text-light, #6b7280);
          background: var(--color-bg, #f9fafb);
        }

        .grid-cell-name {
          text-align: left !important;
          min-width: 120px;
        }

        .grid-cell-name .kid-avatar {
          margin-right: 0.5rem;
        }

        .grid-cell-name .kid-name {
          font-weight: 500;
        }

        .grid-cell-day {
          min-width: 50px;
        }

        .grid-cell-day .day-indicator {
          display: block;
          font-size: 1rem;
        }

        .grid-cell-day .day-points {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-light, #6b7280);
        }

        .grid-cell-day.has-points {
          background: rgba(16, 185, 129, 0.08);
        }

        .grid-cell-total {
          min-width: 60px;
          font-weight: 600;
        }

        .grid-cell-total .total-points {
          font-size: 1.125rem;
          color: var(--color-primary, #10b981);
        }

        .grid-cell-total .total-label {
          font-size: 0.625rem;
          color: var(--color-text-light, #6b7280);
          display: block;
        }

        .grid-cell-streak {
          min-width: 50px;
        }

        .streak-fire {
          margin-right: 0.25rem;
        }

        .streak-count {
          font-weight: 600;
          color: var(--color-warning, #f59e0b);
        }

        .grid-legend {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          padding: 1rem;
          font-size: 0.75rem;
          color: var(--color-text-light, #6b7280);
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        /* Print-only elements hidden on screen */
        .print-only {
          display: none;
        }

        .print-header {
          text-align: center;
          margin-bottom: 1rem;
        }

        .print-header h1 {
          font-size: 1.5rem;
          margin: 0;
        }

        .print-header p {
          color: #666;
          margin: 0.25rem 0 0;
        }

        .print-footer {
          text-align: center;
          font-size: 0.75rem;
          color: #999;
          margin-top: 1rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  );
}
