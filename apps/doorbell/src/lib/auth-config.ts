import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "CPF e Senha",
      credentials: {
        cpf: { 
          label: "CPF", 
          type: "text", 
          placeholder: "000.000.000-00" 
        },
        password: { 
          label: "Senha", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        if (!credentials?.cpf || !credentials?.password) {
          console.log("❌ Credenciais incompletas");
          return null;
        }

        try {
          // Limpar CPF (remover pontos e traços)
          const cleanCpf = credentials.cpf.replace(/[.-]/g, "");
          
          console.log(`🔍 Procurando usuário com CPF: ${cleanCpf}`);

          // Buscar usuário no banco
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { cpf: cleanCpf },
                { cpf: credentials.cpf }, // Tentar também com máscara
              ],
            },
            include: {
              address: true,
            },
          });

          if (!user) {
            console.log(`❌ Usuário não encontrado para CPF: ${cleanCpf}`);
            return null;
          }

          // Verificar senha
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            console.log(`❌ Senha inválida para usuário: ${user.id}`);
            return null;
          }

          console.log(`✅ Login bem-sucedido para usuário: ${user.id}`);

          // Retornar dados do usuário para a sessão
          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            phone: user.phone,
            addressId: user.addressId,
            address: user.address,
          };
        } catch (error: any) {
          console.error("❌ Erro na autenticação:", error.message);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 365 * 24 * 60 * 60, // 1 ano
  },
  jwt: {
    maxAge: 365 * 24 * 60 * 60, // 1 ano
  },
  callbacks: {
    async jwt({ token, user }) {
      // Incluir dados customizados no token
      if (user) {
        token.userId = parseInt(user.id);
        token.cpf = user.cpf;
        token.phone = user.phone;
        token.addressId = user.addressId;
        token.address = user.address;
      }
      return token;
    },
    async session({ session, token }) {
      // Incluir dados customizados na sessão
      if (token) {
        session.user.id = token.userId as number;
        session.user.cpf = token.cpf as string;
        session.user.phone = token.phone as string;
        session.user.addressId = token.addressId as number;
        session.user.address = token.address as any;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET || "seu-nextauth-secret-super-seguro",
  debug: process.env.NODE_ENV === "development",
};

