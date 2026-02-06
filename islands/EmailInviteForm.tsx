/**
 * EmailInviteForm - Reusable email invite form component
 * Used on Share page for referral sharing via email
 */

import { useSignal } from "@preact/signals";

interface EmailInviteFormProps {
  shareUrl: string;
  message: string;
  senderName?: string;
  onClose?: () => void;
}

export default function EmailInviteForm({ shareUrl, message, senderName, onClose }: EmailInviteFormProps) {
  const emailAddress = useSignal("");
  const recipientName = useSignal("");
  const sending = useSignal(false);
  const sent = useSignal(false);
  const error = useSignal("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!emailAddress.value || !emailAddress.value.includes("@")) {
      error.value = "Please enter a valid email";
      return;
    }

    sending.value = true;
    error.value = "";

    try {
      const res = await fetch("/api/share/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: emailAddress.value,
          name: recipientName.value || undefined,
          shareUrl,
          message,
          senderName: senderName || "A friend",
        }),
      });

      const data = await res.json();
      if (data.success) {
        sent.value = true;
        // Reset after 3s
        setTimeout(() => {
          sent.value = false;
          emailAddress.value = "";
          recipientName.value = "";
          onClose?.();
        }, 3000);
      } else {
        error.value = data.error || "Failed to send";
      }
    } catch {
      error.value = "Failed to send email";
    } finally {
      sending.value = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} class="email-invite-form">
      {sent.value ? (
        <div class="email-success">✓ Sent! They'll get your invite shortly.</div>
      ) : (
        <>
          <input
            type="email"
            placeholder="friend@example.com"
            value={emailAddress.value}
            onInput={(e) => { emailAddress.value = (e.target as HTMLInputElement).value; }}
            class="email-input"
            required
            disabled={sending.value}
          />
          <input
            type="text"
            placeholder="Their name (optional)"
            value={recipientName.value}
            onInput={(e) => { recipientName.value = (e.target as HTMLInputElement).value; }}
            class="email-input email-name"
            disabled={sending.value}
          />
          {error.value && <p class="email-error">{error.value}</p>}
          <button type="submit" class="email-send-btn" disabled={sending.value}>
            {sending.value ? "Sending..." : "Send invite"}
          </button>
        </>
      )}

      <style>{`
        .email-invite-form {
          margin-top: 12px;
          padding: 16px;
          background: rgba(var(--color-primary-rgb, 16, 185, 129), 0.04);
          border-radius: 12px;
          border: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.15);
        }
        .email-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(var(--color-primary-rgb, 16, 185, 129), 0.2);
          border-radius: 8px;
          font-size: 0.9rem;
          background: white;
          color: var(--color-text);
          margin-bottom: 10px;
        }
        .email-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb, 16, 185, 129), 0.1);
        }
        .email-input:disabled {
          opacity: 0.6;
        }
        .email-name {
          margin-bottom: 12px;
        }
        .email-error {
          margin: 0 0 10px 0;
          font-size: 0.85rem;
          color: #ef4444;
        }
        .email-send-btn {
          width: 100%;
          padding: 12px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
        }
        .email-send-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .email-send-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .email-success {
          text-align: center;
          color: var(--color-primary);
          font-weight: 600;
          padding: 8px 0;
        }
      `}</style>
    </form>
  );
}
