#!/usr/bin/env node

/**
 * 🔍 Script para verificar configuração de variáveis de ambiente
 * Uso: node check-env.js
 */

// Carregar variáveis de ambiente do .env.local
require("dotenv").config({ path: ".env.local" });

console.log("🔍 Verificando configuração de variáveis de ambiente...\n");

const requiredVars = {
  // NextAuth (obrigatórias)
  NEXTAUTH_URL: {
    required: true,
    description: "URL base da aplicação para NextAuth",
  },
  NEXTAUTH_SECRET: {
    required: true,
    description: "Secret para criptografia NextAuth",
    sensitive: true,
  },

  // Push Notifications (obrigatórias)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: {
    required: true,
    description: "Chave pública VAPID para push notifications",
  },
  VAPID_PRIVATE_KEY: {
    required: true,
    description: "Chave privada VAPID para push notifications",
    sensitive: true,
  },

  // Database (obrigatória)
  DATABASE_URL: {
    required: true,
    description: "String de conexão PostgreSQL",
    sensitive: true,
  },

  // Legado (opcional)
  JWT_SECRET: {
    required: false,
    description: "Secret JWT customizado (legado - será removido)",
    sensitive: true,
  },
};

let allConfigured = true;
let hasWarnings = false;

Object.entries(requiredVars).forEach(([varName, config]) => {
  const value = process.env[varName];
  const isConfigured = !!value;

  if (config.required && !isConfigured) {
    console.log(`❌ ${varName}: NÃO CONFIGURADA`);
    console.log(`   📝 ${config.description}`);
    allConfigured = false;
  } else if (config.required && isConfigured) {
    const displayValue = config.sensitive
      ? `${value.substring(0, 8)}...`
      : value;
    console.log(`✅ ${varName}: CONFIGURADA (${displayValue})`);
  } else if (!config.required && isConfigured) {
    const displayValue = config.sensitive
      ? `${value.substring(0, 8)}...`
      : value;
    console.log(`⚠️  ${varName}: CONFIGURADA (${displayValue}) - LEGADO`);
    hasWarnings = true;
  } else {
    console.log(`⚪ ${varName}: NÃO CONFIGURADA (opcional)`);
  }

  console.log();
});

// Verificações específicas
console.log("🔧 Verificações específicas:\n");

// NEXTAUTH_URL deve ser HTTPS em produção
const nextAuthUrl = process.env.NEXTAUTH_URL;
if (nextAuthUrl) {
  if (
    nextAuthUrl.startsWith("http://localhost") ||
    nextAuthUrl.startsWith("http://127.0.0.1")
  ) {
    console.log("🟡 NEXTAUTH_URL: Usando HTTP local (OK para desenvolvimento)");
  } else if (nextAuthUrl.startsWith("http://")) {
    console.log(
      "⚠️  NEXTAUTH_URL: Usando HTTP em produção (recomenda-se HTTPS)"
    );
    hasWarnings = true;
  } else if (nextAuthUrl.startsWith("https://")) {
    console.log("✅ NEXTAUTH_URL: Usando HTTPS (seguro para produção)");
  }
}

// NEXTAUTH_SECRET deve ter tamanho adequado
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (nextAuthSecret && nextAuthSecret.length < 32) {
  console.log(
    "⚠️  NEXTAUTH_SECRET: Muito curto (recomenda-se pelo menos 32 caracteres)"
  );
  hasWarnings = true;
} else if (nextAuthSecret) {
  console.log("✅ NEXTAUTH_SECRET: Tamanho adequado");
}

// VAPID keys devem ter formato correto
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && !vapidPublic.startsWith("B") && vapidPublic.length !== 88) {
  console.log("⚠️  VAPID_PUBLIC_KEY: Formato pode estar incorreto");
  hasWarnings = true;
} else if (vapidPublic) {
  console.log("✅ VAPID_PUBLIC_KEY: Formato aparenta estar correto");
}

if (vapidPrivate && vapidPrivate.length < 40) {
  console.log("⚠️  VAPID_PRIVATE_KEY: Muito curto");
  hasWarnings = true;
} else if (vapidPrivate) {
  console.log("✅ VAPID_PRIVATE_KEY: Tamanho adequado");
}

console.log("\n" + "=".repeat(50));

if (allConfigured && !hasWarnings) {
  console.log("🎉 TODAS as variáveis estão configuradas corretamente!");
  console.log("✅ Sistema pronto para usar NextAuth");
  process.exit(0);
} else if (allConfigured && hasWarnings) {
  console.log("⚠️  Configuração FUNCIONAL mas com avisos");
  console.log("💡 Revise os avisos acima para otimizar a configuração");
  process.exit(0);
} else {
  console.log("❌ Configuração INCOMPLETA");
  console.log("📋 Configure as variáveis obrigatórias antes de prosseguir");
  console.log("\n💡 Para gerar secrets:");
  console.log("   NEXTAUTH_SECRET: openssl rand -base64 32");
  console.log("   VAPID Keys: npx web-push generate-vapid-keys");
  process.exit(1);
}
