"use server";

import { signOut } from "@/authConfig";

export async function logout() {
  await signOut({ redirectTo: "/login" });
}









