# Campainha Eletrônica por QR Code

## Visão Geral
O projeto propõe uma campainha eletrônica simples e acessível que dispensa hardware físico.
Ao colar um papel ou placa com QR code no portão, qualquer visitante pode escanear e acessar uma página que permite tocar a campainha virtual. O morador recebe a notificação em seu dispositivo e pode iniciar uma conversa em tempo real.

---

## Problema
- **Entregadores e visitantes** chegam em casas ou pequenos comércios e não são atendidos por falta de campainha ou porque o morador está ausente.
- **Campainhas eletrônicas físicas** são caras, exigem instalação e podem ser roubadas.
- **Aluguéis** dificultam modificações na infraestrutura do imóvel.

---

## Proposta de Valor
- **Baixo custo**: basta imprimir e colar um QR code.
- **Rápido de adotar**: cadastro simples → geração do QR → já funciona.
- **Acessível**: qualquer visitante com celular pode usar.
- **Seguro**: registros de tentativa, gravações opcionais, requisitos de localização, vídeo e rosto para reduzir fraudes.
- **Escalável**: ideal para residências, pequenos comércios, imóveis alugados, repúblicas e até pontos temporários.

---

## Regras de Negócio
1. **Unicidade por imóvel**: apenas um cadastro principal por endereço. Outros moradores entram via convite.
2. **Fluxo visitante simplificado**: ao abrir a página, deve haver apenas:
   - Um botão claro e grande para “TOCAR CAMPANHA”.
   - Uma breve explicação.
3. **Segurança mínima**:
   - Captcha contra spam.
   - Validação de geolocalização dentro de raio do imóvel.
   - Registro de horário e tentativa.
4. **Fluxos avançados (versões futuras)**:
   - Conversa em tempo real (áudio/vídeo).
   - Registro de rosto antes da chamada.
   - Gravação das conversas.
   - Cadastro de imóvel com vídeo da fachada + prova de acesso.

---

## Público-Alvo
- **Moradores de imóveis alugados** (sem campainha física).
- **Pequenos comerciantes**.
- **Repúblicas/hostels**.
- **Eventos temporários** (food trucks, feiras, barracas).

---

## Monetização (etapas futuras)
- **Freemium**: básico gratuito (campainha simples).
- **Premium**:
  - Histórico estendido de chamadas.
  - Placas físicas resistentes com QR/NFC.
  - Gravações e conversas armazenadas por mais tempo.