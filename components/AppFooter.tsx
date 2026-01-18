/**
 * App Footer with Version Display
 * Shows deployment version on hover for debugging
 * Matches FamilyScore versioning pattern
 */

interface AppFooterProps {
  style?: "light" | "dark";
}

export default function AppFooter({ style = "light" }: AppFooterProps) {
  const version = Deno.env.get("APP_VERSION") || "dev-local";

  const textColor = style === "dark" ? "#666" : "var(--color-text-light, #666)";
  const versionColor = style === "dark" ? "#888" : "var(--color-text-light, #888)";

  return (
    <footer
      style={{
        textAlign: "center",
        padding: "1rem",
        marginTop: "2rem",
      }}
    >
      <div
        class="version-footer"
        style={{
          color: textColor,
          fontSize: "12px",
          cursor: "default",
        }}
      >
        Family Chores Made Fun
        <br />
        <span class="legal-links" style={{ fontSize: "11px", color: versionColor }}>
          <a href="/terms" style={{ color: versionColor, textDecoration: "none" }}>Terms</a>
          {" · "}
          <a href="/privacy" style={{ color: versionColor, textDecoration: "none" }}>Privacy</a>
        </span>
        <br />
        <span
          class="version-text"
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            color: versionColor,
          }}
        >
          {version}
        </span>
      </div>
      <style>
        {`
          .version-footer .version-text {
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .version-footer:hover .version-text {
            opacity: 1;
          }
        `}
      </style>
    </footer>
  );
}
