import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.FROM_EMAIL || "PostPilote <noreply@postpilote.fr>";
const APP_URL = process.env.APP_URL || "https://tail-rho.vercel.app";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// ─── Draft validation email ───────────────────────────────────────────────────

export async function sendDraftValidationEmail({
  to,
  name,
  draftId,
  draftTitle,
  draftContent,
  approveToken,
  rejectToken,
}: {
  to: string;
  name: string;
  draftId: string;
  draftTitle: string;
  draftContent: string;
  approveToken: string;
  rejectToken: string;
}): Promise<void> {
  if (!resend) throw new Error("RESEND_API_KEY non configuré.");

  const approveUrl = `${APP_URL}/api/approve/${approveToken}`;
  const rejectUrl = `${APP_URL}/api/reject/${rejectToken}`;
  const workspaceUrl = `${APP_URL}/workspace#draft-${draftId}`;

  const firstName = name.split(" ")[0] || name;
  const previewText = `Votre post LinkedIn du jour est prêt — "${draftTitle}"`;
  const contentHtml = draftContent
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>` : "<br>"))
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(previewText)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f1e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="margin-bottom:24px;">
      <span style="font-size:13px;font-weight:700;letter-spacing:-0.02em;color:#13110f;">PostPilote</span>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:24px;border:1px solid rgba(0,0,0,0.08);overflow:hidden;">

      <!-- Top -->
      <div style="padding:32px 32px 24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#78716c;">Post du jour</p>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;letter-spacing:-0.04em;color:#0c0a09;line-height:1.3;">${escapeHtml(draftTitle)}</h1>
        <p style="margin:0;font-size:14px;color:#78716c;line-height:1.6;">Bonjour ${escapeHtml(firstName)}, voici le post préparé pour vous aujourd'hui.</p>
      </div>

      <!-- Separator -->
      <div style="height:1px;background:rgba(0,0,0,0.06);margin:0 32px;"></div>

      <!-- Post content -->
      <div style="padding:24px 32px;background:#fafaf9;border-radius:0;font-size:14px;line-height:1.8;color:#44403c;">
        ${contentHtml}
      </div>

      <!-- Separator -->
      <div style="height:1px;background:rgba(0,0,0,0.06);margin:0 32px;"></div>

      <!-- CTA buttons -->
      <div style="padding:28px 32px;">
        <p style="margin:0 0 16px;font-size:13px;color:#78716c;">Que souhaitez-vous faire avec ce post ?</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="${approveUrl}" style="display:inline-block;background:#c56433;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:100px;">
            ✓ Approuver et programmer
          </a>
          <a href="${rejectUrl}" style="display:inline-block;background:#f5f5f4;color:#78716c;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:100px;border:1px solid rgba(0,0,0,0.1);">
            ✕ Refuser ce post
          </a>
        </div>
        <p style="margin:16px 0 0;font-size:11px;color:#a8a29e;">
          Ce post sera annulé si vous ne répondez pas dans 48h. Vous pouvez aussi le modifier directement dans
          <a href="${workspaceUrl}" style="color:#c56433;">votre espace</a>.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <p style="margin:20px 0 0;text-align:center;font-size:11px;color:#a8a29e;">
      PostPilote · Vous pilotez, l'IA exécute · <a href="${workspaceUrl}" style="color:#a8a29e;">Gérer mes préférences</a>
    </p>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `Post LinkedIn prêt à valider — "${draftTitle}"`,
    html,
  });
}

// ─── Approval confirmation email ──────────────────────────────────────────────

export async function sendApprovalConfirmationEmail({
  to,
  name,
  draftTitle,
  publishAt,
}: {
  to: string;
  name: string;
  draftTitle: string;
  publishAt: string | null;
}): Promise<void> {
  if (!resend) return;

  const firstName = name.split(" ")[0] || name;
  const scheduled = publishAt
    ? `programmé pour le ${new Date(publishAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`
    : "en attente de publication";

  await resend.emails.send({
    from: FROM,
    to: [to],
    subject: `✓ Post approuvé — "${draftTitle}"`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Post approuvé</title></head>
<body style="margin:0;padding:32px 16px;background:#f6f1e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:24px;border:1px solid rgba(0,0,0,0.08);padding:32px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#78716c;">Confirmé</p>
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;letter-spacing:-0.03em;color:#0c0a09;">Post approuvé ✓</h1>
    <p style="margin:0;font-size:14px;color:#57534e;line-height:1.7;">
      Bonjour ${escapeHtml(firstName)}, votre post <strong>"${escapeHtml(draftTitle)}"</strong> a bien été approuvé et est ${scheduled}.
    </p>
    <div style="margin:20px 0 0;padding:16px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
      <p style="margin:0;font-size:13px;color:#166534;">PostPilote s'occupe du reste. Vous serez notifié une fois le post publié.</p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
