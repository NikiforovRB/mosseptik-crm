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
    <div style={{ minHeight: "100vh", background: "#ffffff" }}>
      <AppHeader />
      <div style={{ padding: 16 }}>
        <UsersAdmin initial={users as any} />
      </div>
    </div>
  );
}

