# 📞 Funcionalidade de Chamada de Voz

A funcionalidade de chamada de voz permite que visitantes e moradores se comuniquem diretamente através de uma chamada de áudio usando WebRTC.

## 🚀 Funcionalidades

### Para Visitantes
- **Botão de Chamada de Voz**: Localizado abaixo do botão de campainha
- **Verificação de Volume**: Detecta automaticamente se o volume está baixo
- **Localização Sob Demanda**: Solicita localização apenas quando necessário (ao clicar nos botões)
- **Botão de Ativação Manual**: Opção para ativar localização antecipadamente
- **Verificação de Proximidade**: Garante que o visitante está próximo (máximo 50m)
- **Toque da Campainha**: Automaticamente toca a campainha ao iniciar a chamada
- **Controles da Chamada**:
  - Mute/Unmute do microfone
  - Alternar entre alto-falante e fone
  - Encerrar chamada
- **Viva-voz por Padrão**: Chamadas iniciam em modo viva-voz

### Para Moradores
- **Recebimento Automático**: Polling automático para chamadas recebidas
- **Dialog de Chamada**: Interface para aceitar ou rejeitar chamadas
- **Som de Notificação**: Toca o som da campainha ao receber chamada
- **Controles da Chamada**:
  - Mute/Unmute do microfone
  - Alternar entre alto-falante e fone
  - Encerrar chamada
- **Duração da Chamada**: Mostra tempo decorrido da chamada

## 🔧 Implementação Técnica

### WebRTC Service (`webrtc-service.ts`)
- Gerencia conexões peer-to-peer
- Configuração de ICE servers (STUN)
- Detecção de volume baixo
- Polling para sinalização (fallback para ambientes sem WebSocket)

### Componentes
- **`voice-call.tsx`**: Interface do visitante
- **`resident-voice-call.tsx`**: Interface do morador

### Endpoints da API
- **`/api/webrtc/signaling`**: Sinalização WebRTC (offer, answer, ICE candidates)
- **`/api/webrtc/resident-calls`**: Polling específico para moradores

### Sinalização
- Usa HTTP polling em vez de WebSocket para compatibilidade
- Messages são armazenadas temporariamente em memória
- Cleanup automático de mensagens antigas (5 minutos)

## 🎯 Fluxo da Chamada

### Iniciação pelo Visitante
1. Visitante acessa a página e vê interface informativa
2. (Opcional) Clica em "📍 Ativar localização agora" para ativar antecipadamente
3. Clica no botão "📞 CHAMADA DE VOZ"
4. Sistema solicita localização (se ainda não ativada) COM contexto
5. Verifica proximidade e volume
6. Solicita permissão para microfone
7. Toca a campainha automaticamente
8. Cria oferta WebRTC e envia para o morador
9. Aguarda resposta do morador

### Recebimento pelo Morador
1. Sistema detecta oferta de chamada via polling
2. Exibe dialog de chamada recebida
3. Toca som de notificação
4. Morador pode aceitar ou rejeitar
5. Se aceitar, estabelece conexão WebRTC
6. Chamada fica ativa com controles disponíveis

## ⚙️ Configurações

### Volume
- Detecção automática de volume baixo
- Alerta visual quando volume está baixo
- Opção de prosseguir mesmo com volume baixo

### Áudio
- **Echo Cancellation**: Habilitado
- **Noise Suppression**: Habilitado
- **Auto Gain Control**: Habilitado
- **Sample Rate**: 48kHz
- **Channels**: Mono (1 canal)

### Segurança
- Verificação de proximidade (máximo 50m)
- Permissão de microfone obrigatória
- Timeout de 5 minutos para mensagens

## 🔊 Experiência do Usuário

### Indicadores Visuais
- **🔔**: Campainha normal
- **📞**: Chamada de voz
- **🎙️**: Em chamada
- **🔇**: Mutado
- **🔊**: Alto-falante ativo

### Estados da Chamada
- **idle**: Aguardando
- **calling**: Chamando (visitante)
- **ringing**: Tocando (morador)
- **connected**: Conectado
- **ended**: Encerrada
- **error**: Erro

### Controles de Áudio
- **Mute/Unmute**: Silenciar microfone
- **Speaker/Earpiece**: Alternar saída de áudio
- **End Call**: Encerrar chamada

## 🛠️ Requisitos Técnicos

### Navegador
- Suporte a WebRTC
- Permissão para microfone
- MediaDevices API

### Rede
- Conexão com a internet
- Acesso aos servidores STUN do Google

### Dispositivo
- Microfone funcional
- Alto-falante ou fones de ouvido
- Volume adequado

## 🐛 Troubleshooting

### Chamada não conecta
- Verificar permissões de microfone
- Verificar conexão com internet
- Verificar se ambos os lados têm navegadores compatíveis

### Áudio não funciona
- Verificar volume do dispositivo
- Verificar se microfone não está mutado
- Tentar alternar entre alto-falante e fone

### Volume baixo detectado
- Aumentar volume do dispositivo
- Desativar modo silencioso
- Usar fones de ouvido para melhor qualidade

## 🔄 Melhorias Futuras

- [ ] Notificações push para chamadas recebidas
- [ ] Gravação de chamadas (se permitido)
- [ ] Qualidade de áudio adaptativa
- [ ] Suporte a vídeo chamadas
- [ ] Integração com WebSocket real-time
- [ ] Métricas de qualidade da chamada

