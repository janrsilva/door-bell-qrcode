// Para desenvolvimento, vamos armazenar as subscriptions em memória global
// Em produção, salve no banco de dados
if (!(global as any).subscriptionsStore) {
  (global as any).subscriptionsStore = new Map<string, any>();
}
const subscriptions = (global as any).subscriptionsStore;

export function getActiveSubscriptions(addressId?: number) {
  console.log(`🔍 getActiveSubscriptions chamada com addressId: ${addressId}`);
  console.log(`📊 Total subscriptions no store: ${subscriptions.size}`);
  
  const result = [];

  for (const [id, data] of subscriptions.entries()) {
    console.log(`🔍 Verificando subscription ${id}:`, {
      addressId: data.addressId,
      isActive: data.isActive,
      matches: !addressId || data.addressId === addressId
    });
    
    if (data.isActive && (!addressId || data.addressId === addressId)) {
      result.push(data.subscription);
      console.log(`✅ Subscription ${id} incluída no resultado`);
    } else {
      console.log(`❌ Subscription ${id} rejeitada:`, {
        isActive: data.isActive,
        addressMatch: !addressId || data.addressId === addressId
      });
    }
  }

  console.log(`📊 Resultado final: ${result.length} subscriptions`);
  return result;
}

export function getSubscriptionsStore() {
  return subscriptions;
}
