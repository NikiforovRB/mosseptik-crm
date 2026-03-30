import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const username = "timur";
  const password = "1vn824mb89";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        username,
        passwordHash,
        firstName: "Timur",
        lastName: "",
        role: UserRole.ADMIN,
      },
    });
  }

  const funnelsCount = await prisma.funnel.count();
  if (funnelsCount === 0) {
    const defaultHeaderColor = "#ccd0e1";
    const funnels = [
      {
        name: "Монтаж",
        stages: [
          { name: "Новая", order: 1, headerColor: defaultHeaderColor },
          { name: "В работе", order: 2, headerColor: defaultHeaderColor },
          { name: "Согласование", order: 3, headerColor: defaultHeaderColor },
          { name: "Закрыта", order: 4, headerColor: defaultHeaderColor },
        ],
      },
      {
        name: "Сервис",
        stages: [
          { name: "Новая", order: 1, headerColor: defaultHeaderColor },
          { name: "Диагностика", order: 2, headerColor: defaultHeaderColor },
          { name: "Ремонт", order: 3, headerColor: defaultHeaderColor },
          { name: "Закрыта", order: 4, headerColor: defaultHeaderColor },
        ],
      },
    ];

    for (const f of funnels) {
      await prisma.funnel.create({
        data: {
          name: f.name,
          stages: { create: f.stages },
        },
      });
    }
  }

  const septicCount = await prisma.septicModel.count();
  if (septicCount === 0) {
    await prisma.septicModel.createMany({
      data: [{ name: "Топас 5" }, { name: "Топас 8" }, { name: "Астра 5" }],
      skipDuplicates: true,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

