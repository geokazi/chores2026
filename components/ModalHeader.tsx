/**
 * ModalHeader - Shared header component for modal dialogs
 * Action buttons positioned in header row (Back + Primary + Close)
 *
 * Layout: [Title] ... [← Back] [Primary Action] [×]
 */

interface ModalHeaderProps {
  title: string;
  onBack: () => void;
  onSubmit?: () => void;
  submitLabel: string;
  backLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  /** If true, renders submit as <a> link instead of button */
  submitHref?: string;
  /** Form ID to associate submit button with (for buttons outside <form>) */
  formId?: string;
}

export default function ModalHeader({
  title,
  onBack,
  onSubmit,
  submitLabel,
  backLabel = "← Back",
  isSubmitting = false,
  submitDisabled = false,
  submitHref,
  formId,
}: ModalHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
        gap: "0.5rem",
      }}
    >
      {/* Title */}
      <h2 style={{ fontSize: "1.25rem", fontWeight: "600", margin: 0, flex: "1" }}>
        {title}
      </h2>

      {/* Action buttons group */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        {/* Back/Cancel button */}
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid var(--color-border)",
            borderRadius: "0.375rem",
            backgroundColor: "white",
            color: "var(--color-text)",
            fontSize: "0.875rem",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          {backLabel}
        </button>

        {/* Primary action button or link */}
        {submitHref ? (
          <a
            href={submitHref}
            style={{
              padding: "0.5rem 0.75rem",
              border: "none",
              borderRadius: "0.375rem",
              backgroundColor: "var(--color-primary)",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            {submitLabel}
          </a>
        ) : (
          <button
            type={onSubmit ? "button" : "submit"}
            form={formId}
            onClick={onSubmit}
            disabled={isSubmitting || submitDisabled}
            style={{
              padding: "0.5rem 0.75rem",
              border: "none",
              borderRadius: "0.375rem",
              backgroundColor: "var(--color-primary)",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: isSubmitting || submitDisabled ? "not-allowed" : "pointer",
              opacity: isSubmitting || submitDisabled ? 0.7 : 1,
            }}
          >
            {submitLabel}
          </button>
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.25rem",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            padding: "0.25rem 0.5rem",
            color: "var(--color-text-light)",
            opacity: isSubmitting ? 0.5 : 1,
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
