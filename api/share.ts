function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req: any, res: any) {
  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const id = String(rawId || "").replace(/[^a-z0-9]/gi, "");

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  const host = req.headers?.["x-forwarded-host"] || req.headers?.host || "localhost";
  const proto = req.headers?.["x-forwarded-proto"] || "https";
  const origin = `${proto}://${host}`;
  const shareUrl = `${origin}/s/${id}`;

  let title = "Project Running Map — Aktivitas Lari & Sepeda";
  let description = "Lihat perjalanan avatar interaktif di peta 3D!";
  let image = "";

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

      if (response.ok) {
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
          image = item.image_url;
        }
      }
    } catch {
      // Gunakan fallback meta default jika gagal fetch dari Supabase
    }
  }

  const targetAppUrl = `/?s=${encodeURIComponent(id)}`;

  const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Primary Meta Tags -->
    <title>${escapeHtml(title)}</title>
    <meta name="title" content="${escapeHtml(title)}" />
    <meta name="description" content="${escapeHtml(description)}" />

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ""}

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${escapeHtml(shareUrl)}" />
    <meta property="twitter:title" content="${escapeHtml(title)}" />
    <meta property="twitter:description" content="${escapeHtml(description)}" />
    ${image ? `<meta property="twitter:image" content="${escapeHtml(image)}" />` : ""}

    <script>
      window.location.replace(${JSON.stringify(targetAppUrl)});
    </script>
  </head>
  <body>
    <p>Membuka rute interaktif...</p>
  </body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.status(200).send(html);
}