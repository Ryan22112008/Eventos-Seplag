import { hash } from "argon2";
import { PerfilUsuario, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const nome = process.env.SEED_ADMIN_NAME?.trim();
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.SEED_ADMIN_PASSWORD;
  if (!nome || !email || !senha) throw new Error("Defina SEED_ADMIN_NAME, SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD para executar o seed.");
  if (senha.length < 12) throw new Error("SEED_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.");

  const senhaHash = await hash(senha);
  await prisma.usuario.upsert({
    where: { email },
    create: { nome, email, senhaHash, perfil: PerfilUsuario.ADMIN, ativo: true },
    update: { nome, senhaHash, perfil: PerfilUsuario.ADMIN, ativo: true },
  });
  console.info(`Administrador inicial assegurado para ${email}.`);
}

main()
  .catch((error: unknown) => {
    console.error("Falha ao executar o seed do administrador.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
