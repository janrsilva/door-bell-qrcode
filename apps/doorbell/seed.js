const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Verificar se já existe usuário
  const existingUser = await prisma.user.findFirst();

  if (existingUser) {
    console.log("✅ Usuários já existem no banco");
    console.log("🔧 Atualizando senhas existentes...");

    // Atualizar senhas de todos os usuários
    const users = await prisma.user.findMany();

    for (const user of users) {
      const hashedPassword = await bcrypt.hash("123456", 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      console.log(
        `✅ Senha atualizada para usuário: ${user.name} (CPF: ${user.cpf})`
      );
    }
  } else {
    console.log("📝 Criando dados de teste...");

    // Criar endereço com coordenadas (São Paulo - Centro)
    const address = await prisma.address.create({
      data: {
        street: "Rua das Flores",
        number: "123",
        complement: "Apto 101",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567",
        houseNumber: "123A",
        latitude: -23.5505, // São Paulo - Centro
        longitude: -46.6333,
      },
    });

    // Hash da senha padrão
    const hashedPassword = await bcrypt.hash("123456", 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: "João Silva",
        email: "joao@example.com",
        phone: "(11) 99999-9999",
        cpf: "12345678900",
        password: hashedPassword,
        addressId: address.id,
      },
    });

    console.log("✅ Usuário criado:", {
      id: user.id,
      name: user.name,
      cpf: user.cpf,
      email: user.email,
    });
  }

  console.log("🎉 Seed concluído com sucesso!");
  console.log("");
  console.log("📋 Dados para login:");
  console.log("   CPF: 12345678900 (ou 123.456.789-00)");
  console.log("   Senha: 123456");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
