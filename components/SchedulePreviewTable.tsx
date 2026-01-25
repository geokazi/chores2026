/**
 * Schedule Preview Table Component
 * Shows what chores each kid gets each day with empty-day warnings
 */

import type { SchedulePreview } from "../lib/services/rotation-service.ts";

interface Props {
  previews: SchedulePreview[];
  childNames: string[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function SchedulePreviewTable({
  previews,
  childNames,
  collapsed = true,
  onToggleCollapse
}: Props) {
  if (previews.length === 0) return null;

  // Check if any week has empty days
  const hasAnyEmptyDays = previews.some(p => p.hasEmptyDays);

  return (
    <div class="schedule-preview">
      <button
        class="schedule-preview-toggle"
        onClick={onToggleCollapse}
        type="button"
      >
        <span class="toggle-icon">{collapsed ? '▶' : '▼'}</span>
        <span class="toggle-label">
          📅 Schedule Preview
          {hasAnyEmptyDays && <span class="warning-badge">⚠️</span>}
        </span>
      </button>

      {!collapsed && (
        <div class="schedule-preview-content">
          {previews.map(preview => (
            <div key={preview.weekType} class="week-preview">
              <h5 class="week-label">{preview.weekLabel}</h5>

              <div class="schedule-table-wrapper">
                <table class="schedule-table">
                  <thead>
                    <tr>
                      <th class="day-col">Day</th>
                      {childNames.map(name => (
                        <th key={name} class="kid-col">{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.days.map(dayData => (
                      <tr key={dayData.day} class={`${dayData.hasEmptySlots ? 'has-empty' : ''} ${dayData.isRestDay ? 'rest-day' : ''}`}>
                        <td class="day-cell">
                          {dayData.dayLabel}
                          {dayData.isRestDay && <span class="rest-badge">🛋️</span>}
                          {dayData.hasEmptySlots && !dayData.isRestDay && <span class="day-warning">⚠️</span>}
                        </td>
                        {dayData.isRestDay ? (
                          <td colSpan={childNames.length} class="rest-day-cell">
                            Rest Day — No chores
                          </td>
                        ) : (
                          childNames.map(name => {
                            const slotData = dayData.slots[name];
                            const isEmpty = slotData?.isEmpty;
                            const chores = slotData?.chores || [];
                            return (
                              <td key={name} class={`chore-cell ${isEmpty ? 'empty' : ''}`}>
                                {isEmpty ? (
                                  <span class="no-chores">—</span>
                                ) : (
                                  <span class="chore-list">
                                    {chores.join(', ')}
                                  </span>
                                )}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.hasEmptyDays && (
                <div class="empty-days-summary">
                  <span class="warning-icon">⚠️</span>
                  <span class="warning-text">
                    Empty days: {preview.emptyDays.map(d =>
                      `${d.day} (${d.slots.join(', ')})`
                    ).join('; ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .schedule-preview {
          margin-top: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .schedule-preview-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: left;
        }
        .schedule-preview-toggle:hover {
          background: #f3f4f6;
        }
        .toggle-icon {
          font-size: 0.75rem;
          color: var(--color-text-light);
        }
        .warning-badge {
          margin-left: 0.5rem;
        }
        .schedule-preview-content {
          padding: 1rem;
          background: white;
        }
        .week-preview {
          margin-bottom: 1rem;
        }
        .week-preview:last-child {
          margin-bottom: 0;
        }
        .week-label {
          margin: 0 0 0.5rem;
          font-size: 0.85rem;
          color: var(--color-text-light);
          font-weight: 600;
        }
        .schedule-table-wrapper {
          overflow-x: auto;
        }
        .schedule-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }
        .schedule-table th,
        .schedule-table td {
          padding: 0.4rem 0.5rem;
          border: 1px solid #e5e7eb;
          text-align: left;
        }
        .schedule-table th {
          background: #f9fafb;
          font-weight: 600;
          font-size: 0.75rem;
        }
        .day-col {
          width: 50px;
        }
        .kid-col {
          min-width: 80px;
        }
        .day-cell {
          font-weight: 500;
          white-space: nowrap;
        }
        .day-warning {
          margin-left: 0.25rem;
          font-size: 0.7rem;
        }
        .chore-cell {
          font-size: 0.75rem;
          color: var(--color-text);
        }
        .chore-cell.empty {
          background: #fef3c7;
        }
        .no-chores {
          color: var(--color-text-light);
        }
        .chore-list {
          display: block;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .has-empty td.day-cell {
          background: #fef3c7;
        }
        .empty-days-summary {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: #fef3c7;
          border-radius: 6px;
          font-size: 0.8rem;
        }
        .warning-icon {
          flex-shrink: 0;
        }
        .warning-text {
          color: #92400e;
        }
        .rest-day td {
          background: #f5f3ff !important;
        }
        .rest-badge {
          margin-left: 0.25rem;
          font-size: 0.7rem;
        }
        .rest-day-cell {
          text-align: center;
          color: #6d28d9;
          font-style: italic;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
