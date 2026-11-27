function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").replace(/[^a-z0-9]/gi, "");

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
          imageUrl = item.image_url;
        }
      }
    } catch {
      // Gunakan fallback meta default jika gagal fetch
    }
  }

  const sharePageUrl = `${url.origin}/s/${id}`;
  const isJpeg = imageUrl.toLowerCase().endsWith(".jpg") || imageUrl.toLowerCase().endsWith(".jpeg");
  const mimeType = isJpeg ? "image/jpeg" : "image/png";

  const metaTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Project Running Map" />
    <meta property="og:url" content="${escapeHtml(sharePageUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${
      imageUrl
        ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:type" content="${mimeType}" />
    <meta property="og:image:width" content="660" />
    <meta property="og:image:height" content="660" />`
        : ""
    }
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ""}
  `;

  // Suntikkan meta tags ke index.html agar URL tetap /s/:id tanpa redirect
  try {
    const indexRes = await fetch(`${url.origin}/index.html`);
    if (indexRes.ok) {
      let indexHtml = await indexRes.text();
      indexHtml = indexHtml.replace(/<title>[\s\S]*?<\/title>/i, "");
      indexHtml = indexHtml.replace("</head>", `${metaTags}\n  </head>`);

      return new Response(indexHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    }
  } catch {
    // Lanjut ke fallback HTML di bawah
  }

  return new Response(
    `<!doctype html><html lang="id"><head><meta charset="utf-8" />${metaTags}<script>window.location.replace(${JSON.stringify(`/?s=${encodeURIComponent(id)}`)});</script></head><body></body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}