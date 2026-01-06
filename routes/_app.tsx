import { type PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  return (
    <html data-theme="meadow">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ChoreGami 2026</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <Component />
        <script src="/websocket-client.js"></script>
      </body>
    </html>
  );
}
