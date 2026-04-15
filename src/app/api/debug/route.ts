export async function GET() {
  return Response.json({
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID || "MISSING",
    LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI || "MISSING",
    LINKEDIN_SECRET_SET: Boolean(process.env.LINKEDIN_CLIENT_SECRET),
    APP_URL: process.env.APP_URL || "MISSING",
  });
}
