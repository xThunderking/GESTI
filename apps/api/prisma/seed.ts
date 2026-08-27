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
    { name: 'IT_MANAGER', description: 'Gestion operativa del departamento de TI.' },
    { name: 'TECHNICIAN', description: 'Atencion y seguimiento de tickets.' },
    { name: 'REQUESTER', description: 'Usuario solicitante de soporte.' },
    { name: 'AUDITOR', description: 'Consulta de bitacora y reportes.' },
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

  const department = await prisma.department.upsert({
    create: {
      name: 'Tecnologias de la Informacion',
    },
    update: {},
    where: {
      name: 'Tecnologias de la Informacion',
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: {
      name: 'ADMIN',
    },
  });

  const admin = await prisma.user.upsert({
    create: {
      departmentId: department.id,
      email: 'admin@gesti.local',
      name: 'Administrador GESTI',
      passwordHash: await argon2.hash('Admin123!'),
    },
    update: {
      departmentId: department.id,
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
