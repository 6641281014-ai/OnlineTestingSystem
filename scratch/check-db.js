const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkDatabaseState() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  console.log("Current Users in DB:", users.length);
  users.forEach((u) => console.log(` - ${u.role}: ${u.name} (${u.email}) [Active: ${u.isActive}]`));
}

checkDatabaseState()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
