import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleName } from '../src/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const roles: Array<{ name: RoleName; description: string }> = [
    { name: 'ADMIN', description: 'Administracion completa del sistema.' },
    { name: 'SUPERVISOR', description: 'Supervision de la operacion del sistema.' },
    { name: 'TI', description: 'Personal del departamento de TI.' },
    { name: 'USUARIO', description: 'Usuario general del sistema.' },
  ];

  await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        create: role,
        update: {
          description: role.description,
        },
        where: {
          name: role.name,
        },
      }),
    ),
  );

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: {
      name: 'ADMIN',
    },
  });

  const admin = await prisma.user.upsert({
    create: {
      email: 'admin@gesti.local',
      name: 'Administrador GESTI',
      passwordHash: await argon2.hash('Admin123!'),
      mustChangePassword: false,
    },
    update: {
      mustChangePassword: false,
    },
    where: {
      email: 'admin@gesti.local',
    },
  });

  await prisma.userRole.upsert({
    create: {
      roleId: adminRole.id,
      userId: admin.id,
    },
    update: {},
    where: {
      userId_roleId: {
        roleId: adminRole.id,
        userId: admin.id,
      },
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
