/* ===========================================================
   Cloudflare Pages Function — POST /api/estimate

   Receives the "Request a consultation / estimate" form,
   runs spam protection (honeypot + Turnstile), then emails the
   lead to the business inbox by sending through Google
   Workspace's SMTP server with an app password.

   No third-party form service. Email is delivered by your own
   Google Workspace account. Secrets (SMTP password + Turnstile
   secret) are stored as encrypted Cloudflare secrets, never here.
   =========================================================== */

import { WorkerMailer } from "worker-mailer";

var TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/* collapse input to a single line so a visitor can't inject email headers */
function clean(v) {
  return String(v || "").replace(/[\r\n]+/g, " ").trim();
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json" },
  });
}

function bad(message, status) {
  return json({ ok: false, error: message }, status || 400);
}

export async function onRequestPost(context) {
  var request = context.request;
  var env = context.env;
  console.log("[estimate] Form submission received");

  var form;
  try {
    form = await request.formData();
  } catch (e) {
    console.log("[estimate] Failed to read form:", e);
    return bad("Could not read your submission. Please try again.", 400);
  }

  /* 1) Honeypot — a hidden field real people never fill. If it's filled,
        it's almost certainly a bot, so we quietly accept and drop it.
        Named "hp_field" (not "company") so browser autofill won't trip it. */
  if (clean(form.get("hp_field"))) {
    console.log("[estimate] Honeypot triggered, dropping submission");
    return json({ ok: true });
  }

  /* 2) Turnstile — Cloudflare's native spam check, verified on the server. */
  var token = form.get("cf-turnstile-response");
  if (!token) return bad("Spam check missing. Please reload the page and try again.", 400);

  var verifyRes = await fetch(TURNSTILE_VERIFY, {
    method: "POST",
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: request.headers.get("CF-Connecting-IP") || "",
    }),
  });
  var verify = await verifyRes.json();
  console.log("[estimate] Turnstile verification:", verify.success);
  if (!verify.success) return bad("Spam check failed. Please try again.", 400);

  /* 3) Validate the real fields (never trust the browser alone). */
  var name = clean(form.get("name"));
  var phone = clean(form.get("phone"));
  var email = clean(form.get("email"));
  var service = clean(form.get("service"));
  var address = clean(form.get("address"));        // hero form only
  var details = String(form.get("details") || "").trim(); // contact form only

  if (!name) return bad("Please enter your name.");
  if (phone.replace(/[^0-9]/g, "").length < 10) return bad("Please enter a valid phone number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Please enter a valid email.");
  if (!service) return bad("Please choose a project type.");

  console.log("[estimate] All validations passed. From:", email, "Service:", service);

  /* 4) Build the notification email. */
  var subject = clean("New estimate request - " + name + " (" + service + ")");

  var lines = [
    "New consultation / estimate request from the website:",
    "",
    "Name:    " + name,
    "Phone:   " + phone,
    "Email:   " + email,
    "Project: " + service,
  ];
  if (address) lines.push("Address: " + address);
  lines.push("");
  lines.push("Details:");
  lines.push(details || "(none provided)");
  var body = lines.join("\n");

  /* 5) Send it through Google Workspace SMTP (app-password auth). */
  try {
    console.log("[estimate] Sending email to", env.LEAD_TO, "via SMTP user", env.SMTP_USER);
    await WorkerMailer.send(
      {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        startTls: true,
        authType: "plain",
        credentials: {
          username: env.SMTP_USER,
          password: env.SMTP_PASSWORD,
        },
      },
      {
        from: { name: "Herrera Website", email: env.LEAD_FROM },
        to: { email: env.LEAD_TO },
        reply: { email: email },
        subject: subject,
        text: body,
      }
    );
    console.log("[estimate] Email sent successfully");
  } catch (e) {
    console.log("[estimate] Email send failed:", e.message, e.stack);
    return bad("We couldn't send your request right now. Please call us or try again shortly.", 502);
  }

  return json({ ok: true });
}
