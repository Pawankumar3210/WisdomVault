const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function loadEnvFile(fileName) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    const key = match[1];
    const value = match[2].replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const siteUrl = (process.env.REACT_APP_SITE_URL || "https://wisdomvaultnext.vercel.app").replace(/\/$/, "");
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(location, lastmod, priority = "0.7") {
  const lastmodTag = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : "";
  return `  <url><loc>${escapeXml(location)}</loc>${lastmodTag}<priority>${priority}</priority></url>`;
}

async function fetchRows(table, select) {
  if (!supabaseUrl || !supabaseKey || typeof fetch !== "function") return [];

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
  return response.json();
}

async function buildSitemap() {
  const entries = [urlEntry(`${siteUrl}/`, null, "1.0")];

  try {
    const contents = await fetchRows("content", "id,created_at");
    for (const item of contents) {
      entries.push(urlEntry(`${siteUrl}/pdf/${item.id}`, item.created_at?.slice(0, 10), "0.6"));
    }
  } catch (error) {
    console.warn(`[sitemap] Content URLs skipped: ${error.message}`);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  const outputPath = path.join(root, "public", "sitemap.xml");
  fs.writeFileSync(outputPath, xml);

  const generatedCount = entries.length;
  console.log(`[sitemap] Wrote ${generatedCount} URL${generatedCount === 1 ? "" : "s"}.`);
}

buildSitemap().catch(error => {
  console.warn(`[sitemap] Failed: ${error.message}`);
  const fallback = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntry(`${siteUrl}/`, null, "1.0"),
    "</urlset>",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(root, "public", "sitemap.xml"), fallback);
});
