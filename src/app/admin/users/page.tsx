import AppHeader from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";
import UsersAdmin from "./ui/UsersAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarOriginalKey: true,
      avatarWebpKey: true,
    },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <AppHeader />
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Пользователи</h1>
        <UsersAdmin initial={users as any} />
      </div>
    </div>
  );
}

