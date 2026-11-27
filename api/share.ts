import type { VercelRequest, VercelResponse } from "@vercel/node";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id || "").replace(/[^a-z0-9]/gi, "");
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  let title = "Project Running Map — Aktivitas Lari & Sepeda";
  let description = "Lihat perjalanan avatar interaktif di peta 3D!";
  let imageUrl = "";

  if (id && supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/shared_activities?id=eq.${id}&select=title,mood_tag,activity_type,image_url,activity_data`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      const rows = (await response.json()) as Array<{
        title: string;
        mood_tag: string;
        activity_type: string;
        image_url: string;
        activity_data: {
          distanceKm: number;
          paceFormatted: string;
          speedFormatted: string;
          durationFormatted: string;
        };
      }>;

      const item = rows[0];
      if (item) {
        const stats = item.activity_data;
        const metric =
          item.activity_type === "run"
            ? `Pace ${stats.paceFormatted}/km`
            : `Speed ${stats.speedFormatted} km/j`;

        title = `${item.title} (${stats.distanceKm} km)`;
        description = `${item.mood_tag ? `"${item.mood_tag}" • ` : ""}${stats.distanceKm} km • ${metric} • Waktu ${stats.durationFormatted}`;
        imageUrl = item.image_url;
      }
    } catch {
      // Gunakan fallback meta default jika gagal fetch
    }
  }

  const targetAppUrl = `/?s=${encodeURIComponent(id)}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />

    <!-- Open Graph / WhatsApp / Facebook / Discord -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : ""}
    <meta property="og:image:width" content="880" />
    <meta property="og:image:height" content="880" />

    <!-- Twitter / X Large Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ""}

    <script>
      window.location.replace(${JSON.stringify(targetAppUrl)});
    </script>
  </head>
  <body>
    <p>Membuka rute interaktif...</p>
  </body>
</html>`);
}