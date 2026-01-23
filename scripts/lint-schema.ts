/**
 * Lint: Ensure all choretracker table queries use .schema("choretracker")
 *
 * Tables in choretracker schema:
 *   family_events, chore_assignments, chore_transactions,
 *   chore_templates, chore_categories
 *
 * Run: deno run --allow-read scripts/lint-schema.ts
 */

const CHORETRACKER_TABLES = [
  "family_events",
  "chore_assignments",
  "chore_transactions",
  "chore_templates",
  "chore_categories",
];

const SCAN_DIRS = ["routes", "lib", "islands"];
const SKIP_PATTERNS = [/_test\.ts$/, /\.md$/, /node_modules/];

let errors = 0;

async function scanFile(path: string) {
  const content = await Deno.readTextFile(path);
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const table of CHORETRACKER_TABLES) {
      if (line.includes(`.from("${table}")`)) {
        // Check if any of the preceding 3 lines has .schema("choretracker")
        const context = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
        if (!context.includes('.schema("choretracker")')) {
          console.error(
            `ERROR: ${path}:${i + 1} - .from("${table}") without .schema("choretracker")`
          );
          console.error(`  ${line.trim()}`);
          console.error("");
          errors++;
        }
      }
    }
  }
}

async function scanDir(dir: string) {
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      await scanDir(path);
    } else if (entry.isFile && path.endsWith(".ts") || path.endsWith(".tsx")) {
      if (SKIP_PATTERNS.some((p) => p.test(path))) continue;
      await scanFile(path);
    }
  }
}

for (const dir of SCAN_DIRS) {
  try {
    await scanDir(dir);
  } catch {
    // Directory might not exist
  }
}

if (errors > 0) {
  console.error(`\n❌ Found ${errors} missing .schema("choretracker") call(s)`);
  Deno.exit(1);
} else {
  console.log('✅ All choretracker table queries use .schema("choretracker")');
}
