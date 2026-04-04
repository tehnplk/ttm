import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const landing = (formData.get("landing") as string) || "/register";
    const is_auth = (formData.get("is_auth") as string) || "no";

    const url = new URL("https://moph.id.th/oauth/redirect");

    const clientId = process.env.HEALTH_CLIENT_ID;
    const redirectUri = process.env.HEALTH_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "HEALTH_CLIENT_ID or HEALTH_REDIRECT_URI is not configured" },
        { status: 500 }
      );
    }

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");

    if (landing) {
      url.searchParams.set("landing", landing);
    }

    if (is_auth) {
      url.searchParams.set("is_auth", is_auth);
    }

    // Return JSON with redirect URL instead of actual redirect
    // This allows client-side to handle the redirect properly
    return NextResponse.json({
      redirectUrl: url.toString(),
    });
  } catch (error: any) {
    console.error("Provider ID route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate redirect URL" },
      { status: 500 }
    );
  }
}

