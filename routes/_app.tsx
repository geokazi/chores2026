import { type PageProps } from "$fresh/server.ts";
import ThemeInitializer from "../islands/ThemeInitializer.tsx";
import ConfettiTrigger from "../islands/ConfettiTrigger.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html data-theme="meadow">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ChoreGami</title>
        <link rel="stylesheet" href="/styles.css" />
        {/* canvas-confetti library for celebration animations */}
        <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
      </head>
      <body>
        <ThemeInitializer />
        <ConfettiTrigger />
        <Component />
      </body>
    </html>
  );
}
