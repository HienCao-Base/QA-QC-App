import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  redirect({ admin: "/admin", qa: "/qa", cht: "/cht", nv: "/nv" }[user.role]);
}
