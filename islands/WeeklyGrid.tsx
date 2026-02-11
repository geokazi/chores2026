/**
 * Weekly Grid Island Component
 * Displays printable/shareable weekly chore completion grid
 *
 * Features:
 * - Expandable rows showing individual chores
 * - Mobile day tabs/swipe view
 * - Print via browser print dialog (always expanded)
 * - Share via Web Share API or copy link
 */

import { useState, useMemo } from "preact/hooks";
import type { WeeklyGridData, GridKid, GridDay, GridChore } from "../lib/services/grid-service.ts";

interface Props {
  gridData: WeeklyGridData;
  familyName: string;
}

export default function WeeklyGrid({ gridData, familyName }: Props) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared" | "error">("idle");
  const [expandedKids, setExpandedKids] = useState<Set<string>>(new Set());
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    // Default to today if within range, otherwise last day
    const today = new Date().toISOString().split("T")[0];
    const idx = gridData.kids[0]?.days.findIndex(d => d.date === today) ?? -1;
    return idx >= 0 ? idx : (gridData.kids[0]?.days.length ?? 1) - 1;
  });

  // Check if all are expanded
  const allExpanded = useMemo(() => {
    return gridData.kids.length > 0 && gridData.kids.every(kid => expandedKids.has(kid.id));
  }, [expandedKids, gridData.kids]);

  const toggleKid = (kidId: string) => {
    setExpandedKids(prev => {
      const next = new Set(prev);
      if (next.has(kidId)) {
        next.delete(kidId);
      } else {
        next.add(kidId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedKids(new Set());
    } else {
      setExpandedKids(new Set(gridData.kids.map(k => k.id)));
    }
  };

  const handlePrint = () => {
    // Expand all for print
    setExpandedKids(new Set(gridData.kids.map(k => k.id)));
    setTimeout(() => window.print(), 100);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${familyName} Weekly Chore Grid - ${gridData.weekLabel}`;
    const shareText = `Check out our family's weekly chore progress!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        setShareStatus("shared");
        setTimeout(() => setShareStatus("idle"), 2000);
        return;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.warn("Share failed, falling back to clipboard:", err);
        }
      }
    }

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
      case "copied": return "Link Copied!";
      case "shared": return "Shared!";
      case "error": return "Failed";
      default: return "Share";
    }
  };

  const renderChoreStatus = (chore: GridChore) => {
    if (chore.status === "completed") {
      return <span class="chore-status completed">✅</span>;
    }
    return <span class="chore-status pending">☐</span>;
  };

  const renderDayCell = (day: GridDay, isExpanded: boolean) => {
    const hasChores = day.chores.length > 0;
    const allComplete = hasChores && day.chores.every(c => c.status === "completed");

    return (
      <td class={`grid-cell-day ${allComplete ? "all-complete" : hasChores ? "has-chores" : "no-chores"}`}>
        {/* Summary row */}
        <div class="day-summary">
          <span class="day-indicator">
            {!hasChores ? "—" : allComplete ? "✅" : `${day.chores.filter(c => c.status === "completed").length}/${day.chores.length}`}
          </span>
          <span class="day-points">
            {hasChores ? `${day.points}/${day.totalPoints}` : "—"}
          </span>
        </div>
        {/* Expanded chore details */}
        {isExpanded && hasChores && (
          <div class="day-chores">
            {day.chores.map(chore => (
              <div key={chore.id} class={`chore-item ${chore.status}`}>
                {renderChoreStatus(chore)}
                <span class="chore-name">{chore.icon || ""} {chore.name}</span>
                <span class="chore-points">{chore.points}pt</span>
              </div>
            ))}
          </div>
        )}
      </td>
    );
  };

  // Mobile: Single day view
  const renderMobileDayView = () => {
    const days = gridData.kids[0]?.days || [];
    const selectedDay = days[selectedDayIndex];

    return (
      <div class="mobile-day-view">
        {/* Day selector tabs */}
        <div class="day-tabs">
          {days.map((day, idx) => (
            <button
              key={day.date}
              class={`day-tab ${idx === selectedDayIndex ? "active" : ""}`}
              onClick={() => setSelectedDayIndex(idx)}
            >
              {day.dayName}
            </button>
          ))}
        </div>

        {/* Selected day content */}
        {selectedDay && (
          <div class="day-content">
            <div class="day-header">
              {new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric"
              })}
            </div>

            {gridData.kids.map(kid => {
              const kidDay = kid.days[selectedDayIndex];
              const hasChores = kidDay.chores.length > 0;
              const completedCount = kidDay.chores.filter(c => c.status === "completed").length;

              return (
                <div key={kid.id} class="mobile-kid-card">
                  <div class="kid-header">
                    <span class="kid-avatar">{kid.avatar}</span>
                    <span class="kid-name">{kid.name}</span>
                    <span class="kid-day-stats">
                      {hasChores
                        ? `${kidDay.points} pts (${completedCount}/${kidDay.chores.length})`
                        : "No chores"}
                    </span>
                  </div>
                  {hasChores && (
                    <div class="mobile-chores">
                      {kidDay.chores.map(chore => (
                        <div key={chore.id} class={`mobile-chore ${chore.status}`}>
                          {renderChoreStatus(chore)}
                          <span class="chore-name">{chore.icon || ""} {chore.name}</span>
                          <span class="chore-points">{chore.points} pt</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!hasChores && (
                    <div class="no-chores-msg">— No chores assigned —</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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

      {/* Mobile view (day tabs) */}
      <div class="mobile-only">
        {renderMobileDayView()}
      </div>

      {/* Desktop/Tablet view (full grid) */}
      <div class="desktop-only">
        <div class="weekly-grid-content card" id="weekly-grid-printable">
          {/* Print header */}
          <div class="print-header print-only">
            <h1>{familyName} Weekly Chore Grid</h1>
            <p>{gridData.weekLabel}</p>
          </div>

          {/* Expand/Collapse button */}
          <div class="expand-controls no-print">
            <button onClick={toggleAll} class="expand-btn">
              {allExpanded ? "▼ Collapse All" : "▶ Expand All"}
            </button>
          </div>

          {/* Grid table */}
          <div class="grid-table-wrapper">
            <table class="grid-table">
              <thead>
                <tr>
                  <th class="grid-cell-name">Kid</th>
                  {gridData.kids[0]?.days.map((day: GridDay) => (
                    <th key={day.date} class="grid-cell-day">{day.dayName}</th>
                  ))}
                  <th class="grid-cell-total">Total</th>
                  <th class="grid-cell-streak">Streak</th>
                </tr>
              </thead>
              <tbody>
                {gridData.kids.map((kid: GridKid) => {
                  const isExpanded = expandedKids.has(kid.id);
                  return (
                    <tr key={kid.id} class={isExpanded ? "expanded" : ""}>
                      <td class="grid-cell-name">
                        <button
                          class="expand-toggle no-print"
                          onClick={() => toggleKid(kid.id)}
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                        <span class="print-only">•</span>
                        <span class="kid-avatar">{kid.avatar}</span>
                        <span class="kid-name">{kid.name}</span>
                      </td>
                      {kid.days.map((day: GridDay) => renderDayCell(day, isExpanded))}
                      <td class="grid-cell-total">
                        <span class="total-points">{kid.weeklyTotal}</span>
                        <span class="total-label">/{kid.weeklyPossible} pts</span>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div class="grid-legend">
            <span class="legend-item"><span>✅</span> Completed</span>
            <span class="legend-item"><span>☐</span> Pending</span>
            <span class="legend-item"><span>—</span> No chore</span>
            <span class="legend-item"><span>🔥</span> Streak</span>
          </div>

          {/* Print footer */}
          <div class="print-footer print-only">
            <p>Generated by ChoreGami on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Styles */}
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

        /* Mobile/Desktop visibility */
        .mobile-only { display: block; }
        .desktop-only { display: none; }

        @media (min-width: 768px) {
          .mobile-only { display: none; }
          .desktop-only { display: block; }
        }

        /* ===== MOBILE DAY VIEW ===== */
        .day-tabs {
          display: flex;
          gap: 0.25rem;
          overflow-x: auto;
          padding: 0.5rem 0;
          margin-bottom: 0.5rem;
          -webkit-overflow-scrolling: touch;
        }

        .day-tab {
          flex: 0 0 auto;
          padding: 0.5rem 0.75rem;
          border: none;
          background: var(--color-bg, #f1f5f9);
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--color-text-light, #64748b);
          cursor: pointer;
        }

        .day-tab.active {
          background: var(--color-primary, #10b981);
          color: white;
        }

        .day-content {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .day-header {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 1rem;
          color: var(--color-text, #1e293b);
        }

        .mobile-kid-card {
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
        }

        .mobile-kid-card:last-child {
          border-bottom: none;
        }

        .kid-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .kid-avatar {
          font-size: 1.25rem;
        }

        .kid-name {
          font-weight: 600;
          flex: 1;
        }

        .kid-day-stats {
          font-size: 0.8rem;
          color: var(--color-primary, #10b981);
          font-weight: 500;
        }

        .mobile-chores {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-left: 2rem;
        }

        .mobile-chore {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .mobile-chore.completed {
          color: var(--color-text-light, #64748b);
        }

        .mobile-chore .chore-name {
          flex: 1;
        }

        .mobile-chore .chore-points {
          font-size: 0.75rem;
          color: var(--color-text-light, #64748b);
        }

        .no-chores-msg {
          padding-left: 2rem;
          font-size: 0.8rem;
          color: var(--color-text-light, #94a3b8);
          font-style: italic;
        }

        /* ===== DESKTOP GRID ===== */
        .expand-controls {
          margin-bottom: 0.75rem;
        }

        .expand-btn {
          background: none;
          border: 1px solid var(--color-border, #e5e7eb);
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          color: var(--color-text-light, #64748b);
        }

        .expand-btn:hover {
          background: var(--color-bg, #f8fafc);
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
          min-width: 600px;
        }

        .grid-table th,
        .grid-table td {
          padding: 0.75rem 0.5rem;
          text-align: center;
          border-bottom: 1px solid var(--color-border, #e5e7eb);
          vertical-align: top;
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
          min-width: 140px;
          white-space: nowrap;
        }

        .expand-toggle {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.7rem;
          color: var(--color-text-light, #94a3b8);
          padding: 0.25rem;
          margin-right: 0.25rem;
        }

        .grid-cell-day {
          min-width: 70px;
        }

        .day-summary {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
        }

        .day-indicator {
          font-size: 0.9rem;
        }

        .day-points {
          font-size: 0.7rem;
          color: var(--color-text-light, #6b7280);
        }

        .grid-cell-day.all-complete {
          background: rgba(16, 185, 129, 0.1);
        }

        .grid-cell-day.has-chores {
          background: rgba(59, 130, 246, 0.05);
        }

        /* Expanded chore details */
        .day-chores {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px dashed var(--color-border, #e5e7eb);
          text-align: left;
        }

        .chore-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.7rem;
          padding: 0.125rem 0;
          white-space: nowrap;
        }

        .chore-item.completed {
          color: var(--color-text-light, #94a3b8);
        }

        .chore-item.pending {
          color: var(--color-text, #334155);
        }

        .chore-status {
          font-size: 0.65rem;
        }

        .chore-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chore-points {
          color: var(--color-text-light, #94a3b8);
          font-size: 0.65rem;
        }

        .grid-cell-total {
          min-width: 70px;
        }

        .total-points {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-primary, #10b981);
        }

        .total-label {
          font-size: 0.6rem;
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

        /* Print styles */
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

        @media print {
          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .mobile-only {
            display: none !important;
          }

          .desktop-only {
            display: block !important;
          }

          /* Force all rows expanded in print */
          .day-chores {
            display: block !important;
          }

          .grid-table {
            min-width: 100%;
            font-size: 10pt;
          }

          .grid-cell-day {
            min-width: auto;
            padding: 0.5rem 0.25rem;
          }

          .chore-item {
            font-size: 8pt;
          }

          .weekly-grid-content {
            box-shadow: none;
            border: 1px solid #ccc;
          }
        }
      `}</style>
    </div>
  );
}
