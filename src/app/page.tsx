import { redirect } from "next/navigation";
import { getSessionMember } from "@/lib/session";

export default async function Home() {
  const member = await getSessionMember();
  redirect(member ? "/dashboard" : "/login");
}
