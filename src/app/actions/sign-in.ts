"use server";

import { redirect } from "next/navigation";

export const providerIdProcess = async (formData: FormData) => {
  const url = new URL("https://moph.id.th/oauth/redirect");

  const clientId = process.env.HEALTH_CLIENT_ID;
  const redirectUri = process.env.HEALTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("HEALTH_CLIENT_ID or HEALTH_REDIRECT_URI is not configured");
  }

  const landing = formData.get("landing") as string;
  const is_auth = formData.get("is_auth") as string;

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");

  if (landing) {
    url.searchParams.set("landing", landing);
  }

  if (is_auth) {
    url.searchParams.set("is_auth", is_auth);
  }

  redirect(url.toString());
};









