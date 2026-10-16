# Calculadora 3D Markah

Sistema moderno de cálculo de custo e precificação para impressão 3D (FDM / Resina), otimizado para produção diária, geração de orçamentos e hospedagem instantânea na **Vercel**.

---

## 🚀 Funcionalidades

1. **Cálculo Preciso de Custos**:
   - **Filamento**: Proporção exata do peso da peça sobre o peso do carretel (`(peso / pesoRolo) * precoRolo`).
   - **Energia Elétrica**: Consumo real em kWh baseado na potência em watts da impressora e tempo de trabalho (`(potencia / 1000) * horas * tarifa`).
   - **Depreciação de Máquina**: Rateio do valor do equipamento ao longo de sua vida útil (100%, 75%, 50%, 25% ou valor fixo em R$).
   - **Taxa de Falhas e Retrabalho**: Margem de contingência percentual para perdas naturais de filamento e testes.
   - **Embalagem e Insumos**: Custo unitário direto por peça.

2. **Formação de Preço e Lucro**:
   - Margens de Markup rápidas (50%, 75%, 100% ou personalizada).
   - Cálculo por unidade e cálculo consolidado para **lotes e múltiplas quantidades**.
   - Barra visual empilhada demonstrando a fatia de cada componente no preço.

3. **Exportação e Compartilhamento**:
   - **Gerar PDF**: Folha de orçamento diagramada em formato A4, limpa e profissional, pronta para impressão ou envio digital.
   - **Copiar para WhatsApp**: Formatação automática de orçamento com resumo em 1 clique para enviar direto ao cliente.
   - **Leitura de Print do Maker World / Fatiador**: Extração automática de gramas e tempo a partir de capturas de tela via OCR local ou IA (Gemini/Claude/OpenAI).

4. **Persistência Local**:
   - Os valores fixos (preço de insumos, máquina, tarifa) ficam salvos automaticamente no navegador (`localStorage`).

---

## 📦 Como Hospedar na Vercel

O projeto foi estruturado com arquivos estáticos e serverless prontos para a Vercel com **zero configuração necessária**:

### Opção 1: Direto pelo painel da Vercel (Recomendado)
1. Suba este projeto para um repositório no **GitHub**, **GitLab** ou **Bitbucket**.
2. Acesse [vercel.com](https://vercel.com/) e clique em **Add New Project**.
3. Importe o repositório.
4. Clique em **Deploy** (a Vercel detectará automaticamente o `index.html` e a pasta `/api`).

### Opção 2: Pelo Vercel CLI no terminal
```bash
npx vercel
```

### (Opcional) Leitura com IA na Vercel:
Para utilizar reconhecimento de imagem via IA em vez do OCR padrão no navegador, adicione uma das seguintes variáveis de ambiente no painel da Vercel (**Settings > Environment Variables**):
- `GEMINI_API_KEY`: Chave do Google Gemini (Google AI Studio)
- `ANTHROPIC_API_KEY`: Chave da Anthropic
- `OPENAI_API_KEY`: Chave da OpenAI

---

## 💻 Como Rodar Localmente

Caso queira testar ou rodar localmente no seu computador:

```bash
# Iniciar o servidor local
npm run dev
```

Abra no navegador em: `http://localhost:3000`

---

## 🎨 Identidade Visual e Tecnologia
- HTML5 semântico
- CSS3 puro com estética editorial moderna e alta legibilidade
- JavaScript Vanilla modular, rápido e sem dependências pesadas
- Totalmente responsivo para celulares, tablets e desktops
