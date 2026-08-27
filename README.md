# GESTI

Sistema de gestion del departamento de TI del Hospital Angeles Queretaro.

## Stack base

- Frontend: Next.js 16, React, Tailwind CSS, shadcn/ui, Lucide React, TanStack Query, Recharts, React Hook Form y Zod.
- Backend: NestJS, REST, Swagger/OpenAPI, class-validator, class-transformer, Prisma y PostgreSQL 18.
- Seguridad: JWT, refresh tokens, Argon2, RBAC, Helmet y CORS.
- Desarrollo: TypeScript, npm workspaces, Docker Compose, ESLint, Prettier y VS Code.

## Programas necesarios

1. Node.js 24 LTS y npm 11.
2. Git.
3. Visual Studio Code.
4. Docker Desktop para Windows con backend WSL 2.
5. DBeaver para administrar PostgreSQL.
6. Bruno o Postman para probar la API REST.
7. Navegador moderno, por ejemplo Chrome, Edge o Firefox.

Ya se detecto localmente:

- Node.js `v24.12.0`
- npm `11.6.2`
- Git `2.52.0.windows.1`
- Docker Engine `29.7.2`
- Docker Compose `v5.4.0`
- WSL 2 con la distribucion `docker-desktop`

## Estructura

```text
apps/
  api/   NestJS + Prisma + Swagger
  web/   Next.js + React + Tailwind + shadcn/ui
packages/
  shared/ Tipos y esquemas compartidos
```

## Comandos

```bash
npm install
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

En los siguientes arranques normalmente basta con:

```bash
npm run db:up
npm run dev
```

Servicios locales:

- Web: http://localhost:3000
- API: http://localhost:3001/api
- Swagger: http://localhost:3001/docs
- PostgreSQL: `localhost:5432`

Credenciales de desarrollo de PostgreSQL:

- Usuario: `gesti`
- Password: `gesti_dev_password`
- Base de datos: `gesti`

Usuario administrador inicial:

- Email: `admin@gesti.local`
- Password: `Admin123!`

Estas credenciales son solo para desarrollo local y deben cambiarse antes de publicar el sistema.

## Seguridad de sesion

- JWT de acceso con vigencia de 10 minutos.
- Refresh token rotativo almacenado en una cookie `HttpOnly` y `SameSite=Strict`.
- Sesiones registradas en PostgreSQL y vinculadas a un identificador exclusivo de la pestana.
- Cierre de sesion despues de 2 horas sin actividad y caducidad absoluta a los 7 dias.
- RBAC validado en NestJS para los roles `ADMIN`, `SUPERVISOR`, `TI` y `USUARIO`.
- Gestion de usuarios permitida solo a `ADMIN` y `SUPERVISOR`.
- El usuario `admin@gesti.local` no puede editarse ni eliminarse.
- Limite de 5 intentos de login por minuto.
- Las cuentas nuevas reciben una contrasena temporal por correo y deben reemplazarla al ingresar.
- La contrasena personal requiere mas de 8 caracteres, una mayuscula, al menos 2 numeros y un simbolo.

`JWT_ACCESS_SECRET` debe contener al menos 32 caracteres aleatorios. En produccion tambien se debe
usar HTTPS para que la cookie se marque como `Secure`, cambiar la contrasena inicial y restringir
`CORS_ORIGIN` al dominio definitivo.

En desarrollo, los correos se capturan con Mailpit:

- Bandeja local: http://localhost:8025
- SMTP local: `localhost:1025`

Para enviar correos reales se deben reemplazar `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_FROM`, `SMTP_USER` y `SMTP_PASSWORD` en `apps/api/.env` con los datos del proveedor SMTP.
