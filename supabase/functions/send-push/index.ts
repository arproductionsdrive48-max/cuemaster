import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIREBASE_SERVER_KEY = Deno.env.get("FIREBASE_SERVER_KEY");
    if (!FIREBASE_SERVER_KEY) {
      return new Response(
        JSON.stringify({
          error: "FIREBASE_SERVER_KEY not configured. Add it as a Cloud secret.",
          setup_instructions: [
            "1. Go to Firebase Console → Project Settings → Cloud Messaging",
            "2. Copy the Server Key (legacy) or use Firebase Admin SDK service account",
            "3. Add FIREBASE_SERVER_KEY as a secret in Lovable Cloud",
          ],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsErr } = await supabase.auth.getUser();
    if (claimsErr || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, message, audience, club_id } = await req.json();

    if (!title || !message || !club_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, message, club_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch FCM tokens for the club
    const adminClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: tokens, error: tokensErr } = await adminClient
      .from("fcm_tokens")
      .select("token")
      .eq("club_id", club_id);

    if (tokensErr) {
      console.error("Error fetching FCM tokens:", tokensErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch FCM tokens", details: tokensErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          message: "No FCM tokens registered. Users need to enable push notifications in their browser." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send to FCM (legacy HTTP API)
    const fcmUrl = "https://fcm.googleapis.com/fcm/send";
    const tokenList = tokens.map((t: any) => t.token);
    
    const fcmPayload = {
      registration_ids: tokenList,
      notification: {
        title,
        body: message,
        icon: "/pwa-192x192.png",
        click_action: "/",
      },
      data: {
        audience: audience || "All Members",
        type: "promotion",
      },
    };

    const fcmResponse = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        Authorization: `key=${FIREBASE_SERVER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmResult = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error("FCM send failed:", fcmResult);
      return new Response(
        JSON.stringify({ error: "FCM send failed", details: fcmResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: fcmResult.success || tokenList.length,
        failed: fcmResult.failure || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-push error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
