// Deploy with Supabase CLI. Configure RESEND_API_KEY and RESEND_FROM in Edge Function secrets.
// Database inserts are performed by the caller first; notification failure never rolls them back.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");
  if (!apiKey || !from) return Response.json({ sent: false, reason: "Email provider is not configured" }, { status: 503 });
  try {
    const body = await req.json();
    const subject = `[BLACK WIDOW ARCHIVE] ${String(body.kind || "新投稿").slice(0, 80)}`;
    const safe = JSON.stringify(body, null, 2).slice(0, 12000);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: ["cayyee6@gmail.com"], subject, text: safe }),
    });
    if (!response.ok) return Response.json({ sent: false, reason: "Email provider rejected the request" }, { status: 502 });
    return Response.json({ sent: true });
  } catch { return Response.json({ sent: false, reason: "Invalid notification payload" }, { status: 400 }); }
});
