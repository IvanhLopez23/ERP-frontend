import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const store = await cookies();

  if (store.has("erp_sesion")) {
    redirect("/dashboard");
  }

  redirect("/login");
}
