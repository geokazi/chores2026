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

  // Initialize with one empty row when modal opens
  useEffect(() => {
    if (isOpen && event) {
      setTasks([{ id: crypto.randomUUID(), text: "", assignee_id: defaultAssignee }]);
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
    if (tasks.length > 1) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    // Filter out empty tasks
    const validTasks = tasks.filter(t => t.text.trim());
    if (validTasks.length === 0) {
      setError("Please enter at least one task");
      return;
    }

    if (!event) {
      setError("No event selected");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get existing prep tasks
      const existingTasks = event.metadata?.prep_tasks || [];

      // Create new prep tasks
      const newPrepTasks: PrepTask[] = validTasks.map(t => ({
        id: t.id,
        text: t.text.trim(),
        assignee_id: t.assignee_id || undefined,
        done: false,
      }));

      // Merge with existing
      const allTasks = [...existingTasks, ...newPrepTasks];

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
            Add Prep Tasks
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
                  }}
                >
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
                    }}
                    autoFocus={index === 0}
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
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "1px solid var(--color-border)",
                backgroundColor: "white",
                color: "var(--color-text)",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "none",
                backgroundColor: isSubmitting ? "#ccc" : "var(--color-primary)",
                color: "white",
                borderRadius: "0.5rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontSize: "1rem",
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
