import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/** Create a signed JWT for Google service account */
async function createGoogleJWT(
  serviceAccount: { client_email: string; private_key: string },
  scopes: string[]
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${enc(header)}.${enc(payload)}`;

  // Import PEM private key
  const pem = serviceAccount.private_key;
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${unsignedToken}.${sigB64}`;
}

/** Exchange JWT for access token */
async function getAccessToken(
  serviceAccount: { client_email: string; private_key: string }
): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccount, [
    "https://www.googleapis.com/auth/analytics.readonly",
  ]);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

/** Run a GA4 report */
async function runReport(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  dimensions: string[],
  metrics: string[]
) {
  // propertyId might be "G-XXXXX" (measurement ID) or numeric property ID
  // GA4 Data API needs the numeric property ID (e.g., "properties/123456789")
  const propPath = propertyId.startsWith("properties/")
    ? propertyId
    : `properties/${propertyId}`;

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensions.map((d) => ({ name: d })),
    metrics: metrics.map((m) => ({ name: m })),
  };

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${propPath}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 runReport failed (${res.status}): ${text}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = claimsData.claims.sub;

    // Get club_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("club_id")
      .eq("id", userId)
      .single();

    if (!profile?.club_id) {
      return new Response(JSON.stringify({ error: "No club found" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get club settings
    const { data: club } = await supabase
      .from("clubs")
      .select("settings")
      .eq("id", profile.club_id)
      .single();

    const settings = club?.settings ?? {};
    const ga4PropertyId = settings.ga4PropertyId;
    const serviceAccountJson = settings.ga4ServiceAccountJson;

    if (!ga4PropertyId || !serviceAccountJson) {
      return new Response(
        JSON.stringify({
          error:
            "GA4 Property ID and Service Account JSON are required. Configure them in Settings → Integrations.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let serviceAccount: { client_email: string; private_key: string };
    try {
      serviceAccount =
        typeof serviceAccountJson === "string"
          ? JSON.parse(serviceAccountJson)
          : serviceAccountJson;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid service account JSON format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { days = 30 } = await req.json().catch(() => ({}));
    const endDate = "today";
    const startDate = `${days}daysAgo`;

    const accessToken = await getAccessToken(serviceAccount);

    // Run multiple reports in parallel
    const [summaryReport, dailyReport, sourcesReport, devicesReport, countriesReport, pagesReport] =
      await Promise.all([
        // Summary: users, sessions, avg engagement, bounce rate, pageviews
        runReport(accessToken, ga4PropertyId, startDate, endDate, [], [
          "totalUsers",
          "sessions",
          "averageSessionDuration",
          "bounceRate",
          "screenPageViews",
        ]),
        // Daily breakdown
        runReport(accessToken, ga4PropertyId, startDate, endDate, ["date"], [
          "totalUsers",
          "sessions",
          "screenPageViews",
        ]),
        // Top sources
        runReport(accessToken, ga4PropertyId, startDate, endDate, ["sessionSource"], [
          "sessions",
        ]),
        // Devices
        runReport(accessToken, ga4PropertyId, startDate, endDate, ["deviceCategory"], [
          "sessions",
        ]),
        // Countries
        runReport(accessToken, ga4PropertyId, startDate, endDate, ["country"], [
          "sessions",
        ]),
        // Top pages
        runReport(accessToken, ga4PropertyId, startDate, endDate, ["pagePath"], [
          "screenPageViews",
        ]),
      ]);

    // Parse summary
    const summaryRow = summaryReport.rows?.[0]?.metricValues ?? [];
    const summary = {
      totalUsers: parseInt(summaryRow[0]?.value ?? "0"),
      sessions: parseInt(summaryRow[1]?.value ?? "0"),
      avgSessionDuration: parseFloat(summaryRow[2]?.value ?? "0"),
      bounceRate: parseFloat(summaryRow[3]?.value ?? "0"),
      pageviews: parseInt(summaryRow[4]?.value ?? "0"),
    };

    // Parse daily
    const daily = (dailyReport.rows ?? [])
      .map((row: any) => ({
        date: row.dimensionValues[0].value,
        visitors: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
        pageviews: parseInt(row.metricValues[2].value),
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Parse sources (top 8)
    const sources = (sourcesReport.rows ?? [])
      .map((row: any) => ({
        name: row.dimensionValues[0].value || "(direct)",
        value: parseInt(row.metricValues[0].value),
      }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 8);

    // Parse devices
    const devices = (devicesReport.rows ?? []).map((row: any) => ({
      name: row.dimensionValues[0].value,
      value: parseInt(row.metricValues[0].value),
    }));

    // Parse countries (top 10)
    const countries = (countriesReport.rows ?? [])
      .map((row: any) => ({
        name: row.dimensionValues[0].value,
        value: parseInt(row.metricValues[0].value),
      }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10);

    // Parse pages (top 10)
    const pages = (pagesReport.rows ?? [])
      .map((row: any) => ({
        path: row.dimensionValues[0].value,
        views: parseInt(row.metricValues[0].value),
      }))
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 10);

    return new Response(
      JSON.stringify({ summary, daily, sources, devices, countries, pages }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-ga4-reports error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
