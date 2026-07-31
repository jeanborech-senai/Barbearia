# ✂ Barbearia — Sistema de Agendamento Online

Página estática para agendamento via Google Calendar, hospedada no GitHub Pages.

---

## Estrutura de arquivos

```
barbearia/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js       ← suas configurações ficam aqui
│   └── app.js
└── apps-script/
    └── Code.gs         ← cole isso no Google Apps Script
```

---

## Passo a passo de configuração

### 1. Google Calendar — Chave de API (leitura pública)

> Para o site **ler** os horários ocupados.

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto (ex: *Barbearia*)
3. Menu lateral → **APIs e serviços** → **Biblioteca**
4. Busque **Google Calendar API** → Ativar
5. Vá em **Credenciais** → **+ Criar credencial** → **Chave de API**
6. Clique na chave criada → **Restrições de aplicativo**: HTTP (seu domínio do GitHub Pages)
7. **Restrições de API**: selecione "Google Calendar API"
8. Copie a chave e cole em `js/config.js` → `googleApiKey`

**Compartilhe sua agenda publicamente (só leitura):**
1. Abra [calendar.google.com](https://calendar.google.com)
2. Clique nos 3 pontos da sua agenda → **Configurações e compartilhamento**
3. Em **Permissões de acesso** → marque **Disponibilizar ao público** → Opção: *Ver apenas disponível/ocupado* ou *Ver todos os detalhes*
4. Copie o **ID da agenda** (aparece em "Integrar agenda") e cole em `js/config.js` → `calendarId`

---

### 2. Google Apps Script — Criação de eventos

> Para o site **criar** eventos quando o cliente agenda.

1. Acesse [script.google.com](https://script.google.com) → **Novo projeto**
2. Apague o código padrão e cole **todo o conteúdo** de `apps-script/Code.gs`
3. Salve (Ctrl+S)
4. Clique em **Implantar** → **Nova implantação**
5. Configure:
   - Tipo: **App da Web**
   - Descrição: `Barbearia v1`
   - Executar como: **Eu** (seu e-mail do Google Calendar)
   - Quem tem acesso: **Qualquer pessoa**
6. Clique em **Implantar** → autorize as permissões
7. Copie a **URL do app da web** e cole em `js/config.js` → `appsScriptUrl`

> ⚠️ **Importante:** A cada alteração no código do Apps Script, crie uma **nova implantação** (não edite a existente). A URL muda a cada nova implantação — atualize `config.js`.

---

### 3. Atualizar `js/config.js`

```js
const CONFIG = {
  barbershopName: "Nome da Barbearia",
  barbershopPhone: "5547999999999", // DDI + DDD + número (sem espaços)

  googleApiKey:   "AIzaSy...",          // da etapa 1
  calendarId:     "email@gmail.com",    // da etapa 1
  appsScriptUrl:  "https://script.google.com/macros/s/XXXX/exec", // da etapa 2

  // Horários de funcionamento — ajuste se necessário
  workingHours: {
    0: [],
    1: [[13, 20]],
    2: [[8, 12], [13, 20]],
    3: [[8, 12], [13, 20]],
    4: [[8, 12], [13, 20]],
    5: [[8, 12], [13, 20]],
    6: [[8, 13]],
  },

  slotDuration: 30,
  maxDaysAhead: 30,
};
```

---

### 4. Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex: `barbearia-agendamento`)
2. Faça upload de todos os arquivos (exceto `apps-script/`)
3. Vá em **Settings** → **Pages**
4. Source: **Deploy from a branch** → branch `main` → pasta `/` (root)
5. Aguarde ~1 min → seu site estará em `https://seu-usuario.github.io/barbearia-agendamento`

---

### 5. Mensagem automática do WhatsApp

Para enviar o link do site automaticamente para clientes:

**Texto sugerido para salvar como resposta rápida no WhatsApp Business:**

```
Olá! 😊 Para agendar seu horário de forma rápida, acesse nosso site:

👉 https://seu-usuario.github.io/barbearia-agendamento

Escolha o dia e horário disponível, coloque seu nome e pronto! ✂️
```

---

## Como funciona o CORS (técnico)

O Google Apps Script **não suporta o preflight `OPTIONS`** que os navegadores enviam antes de requisições `POST` cross-origin. A solução usada:

- O site envia os dados via **GET + query string** com `mode: 'no-cors'`
- Com `no-cors` o navegador não faz preflight — a requisição passa direto
- O Apps Script executa `doGet()` e cria o evento no Calendar
- Como `no-cors` retorna uma resposta "opaque" (não legível pelo JS), o site **confirma o agendamento relendo os eventos do Calendar** via API Key ~1,5s depois
- Se o evento apareceu → sucesso; se não → adiciona localmente (o evento existe, só demorou)

**Proteção contra conflito duplo:**
1. Antes de criar, o site relê o Calendar para verificar se o slot ainda está livre
2. O Apps Script também verifica conflito server-side e rejeita se já houver evento
3. Validação server-side impede horários fora do expediente mesmo via manipulação do JS

---

## Segurança — o que o cliente NÃO pode fazer

| Ação | Bloqueado? | Como |
|------|-----------|------|
| Ver dados de outros agendamentos | ✅ | API Key com campo `fields` restrito a `start,end,status` |
| Agendar fora do horário | ✅ | Validação no JS + validação server-side no Apps Script |
| Agendar horário já ocupado | ✅ | Verificação dupla (JS + Apps Script) |
| Editar ou cancelar agendamentos | ✅ | Sem endpoint de edição/deleção exposto |
| Acessar a agenda diretamente | ✅ | Só lê disponibilidade, não nomes/descrições |
