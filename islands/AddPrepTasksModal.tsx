/**
 * Add Prep Tasks Modal
 * Batch add lightweight prep tasks for events (stored in event metadata)
 * No points - just simple done/not done checklist items
 */

import { useState, useEffect } from "preact/hooks";

interface PrepTask {
  id: string;
  text: string;
  assignee_id?: string;
  done: boolean;
}

interface FamilyEvent {
  id: string;
  title: string;
  participants?: string[];
  metadata?: {
    emoji?: string;
    prep_tasks?: PrepTask[];
  };
}

interface FamilyMember {
  id: string;
  name: string;
  role: "parent" | "child";
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: FamilyEvent | null;
  familyMembers: FamilyMember[];
  onSuccess?: () => void;
}

interface TaskRow {
  id: string;
  text: string;
  assignee_id: string;
  isExisting?: boolean; // Track if this is an existing task
  done?: boolean; // Preserve done status for existing tasks
}

export default function AddPrepTasksModal({ isOpen, onClose, event, familyMembers, onSuccess }: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get participants or all family members as assignable
  const assignableMembers = event?.participants?.length
    ? familyMembers.filter(m => event.participants!.includes(m.id))
    : familyMembers;

  const defaultAssignee = assignableMembers[0]?.id || "";

  // Initialize with existing tasks + one empty row when modal opens
  useEffect(() => {
    if (isOpen && event) {
      const existingTasks = (event.metadata?.prep_tasks || []).map((task: PrepTask) => ({
        id: task.id,
        text: task.text,
        assignee_id: task.assignee_id || defaultAssignee,
        isExisting: true,
        done: task.done,
      }));

      // Add one empty row for new tasks
      const emptyRow = { id: crypto.randomUUID(), text: "", assignee_id: defaultAssignee };
      setTasks([...existingTasks, emptyRow]);
      setError(null);
    }
  }, [isOpen, event?.id]);

  const addRow = () => {
    setTasks([...tasks, { id: crypto.randomUUID(), text: "", assignee_id: defaultAssignee }]);
  };

  const updateTask = (id: string, field: "text" | "assignee_id", value: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeRow = (id: string) => {
    // Always allow removing any task (existing or new)
    const remaining = tasks.filter(t => t.id !== id);
    // Ensure at least one empty row exists
    if (remaining.length === 0 || remaining.every(t => t.text.trim())) {
      remaining.push({ id: crypto.randomUUID(), text: "", assignee_id: defaultAssignee });
    }
    setTasks(remaining);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    // Filter out empty tasks
    const validTasks = tasks.filter(t => t.text.trim());

    // Allow saving with zero tasks (clears all prep tasks)
    if (!event) {
      setError("No event selected");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert form tasks to prep tasks (preserving done status for existing)
      const allTasks: PrepTask[] = validTasks.map(t => ({
        id: t.id,
        text: t.text.trim(),
        assignee_id: t.assignee_id || undefined,
        done: t.done || false, // Preserve done status for existing tasks
      }));

      // Update event metadata
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            ...event.metadata,
            prep_tasks: allTasks,
          },
        }),
      });

      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        const result = await response.json();
        setError(result.error || "Failed to save prep tasks");
      }
    } catch (err) {
      console.error("Error saving prep tasks:", err);
      setError("Failed to save prep tasks");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !event) return null;

  const emoji = event.metadata?.emoji || "📅";

  return (
    <div
      onClick={() => onClose()}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "0.75rem",
          padding: "1.5rem",
          width: "90%",
          maxWidth: "450px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0 }}>
            Prep Tasks
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.25rem",
              color: "var(--color-text-light)",
            }}
          >
            ×
          </button>
        </div>

        {/* Event info */}
        <div
          style={{
            backgroundColor: "var(--color-bg)",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {emoji} {event.title}
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                color: "var(--color-warning)",
                fontSize: "0.875rem",
                padding: "0.5rem",
                backgroundColor: "#fef2f2",
                borderRadius: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Task rows */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "500",
                marginBottom: "0.5rem",
              }}
            >
              Tasks to prepare
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    padding: task.done ? "0.25rem" : "0",
                    backgroundColor: task.done ? "#f0fdf4" : "transparent",
                    borderRadius: task.done ? "0.375rem" : "0",
                  }}
                >
                  {task.done && (
                    <span style={{ fontSize: "1rem", marginLeft: "0.25rem" }}>✅</span>
                  )}
                  <input
                    type="text"
                    value={task.text}
                    onChange={(e) => updateTask(task.id, "text", e.currentTarget.value)}
                    placeholder={index === 0 ? "e.g., Pack sports bag" : "Another task..."}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      backgroundColor: task.done ? "#f0fdf4" : "white",
                      color: task.done ? "var(--color-text-light)" : "var(--color-text)",
                    }}
                    autoFocus={index === 0 && !task.done}
                  />
                  <select
                    value={task.assignee_id}
                    onChange={(e) => updateTask(task.id, "assignee_id", e.currentTarget.value)}
                    style={{
                      padding: "0.5rem",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      minWidth: "80px",
                    }}
                  >
                    {assignableMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(task.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-warning)",
                        cursor: "pointer",
                        padding: "0.25rem",
                        fontSize: "1.25rem",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 0.75rem",
                border: "1px dashed var(--color-border)",
                background: "none",
                cursor: "pointer",
                color: "var(--color-text-light)",
                fontSize: "0.875rem",
                borderRadius: "0.375rem",
                width: "100%",
              }}
            >
              + Add another task
            </button>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
            Prep tasks are simple to-dos without points. Kids can mark them done.
          </div>

          {/* Buttons */}
          <div class="modal-footer" style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              class="btn btn-secondary"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
                color: "var(--color-text)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "none",
                backgroundColor: "var(--color-primary)",
                color: "white",
                fontWeight: "600",
              }}
            >
              {isSubmitting ? "Saving..." : "Save Tasks"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
