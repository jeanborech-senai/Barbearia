// =============================================
// CONFIGURAÇÕES DA BARBEARIA
// =============================================

const CONFIG = {
  // --- NOME DA BARBEARIA ---
  barbershopName: "Barbearia do Mestre",
  barbershopPhone: "5547988888888", // número com DDI+DDD para o link do WhatsApp

  // --- GOOGLE CALENDAR API ---
  // Passo 1: Acesse https://console.cloud.google.com
  // Passo 2: Crie um projeto > Ative "Google Calendar API"
  // Passo 3: Crie credenciais > Chave de API (restrinja ao seu domínio)
  // Passo 4: Compartilhe sua agenda do Google com acesso público de leitura
  // Passo 5: Cole os valores abaixo
  googleApiKey: "AIzaSyCEF1zfcx0qDj36aioeK4khyN31FRotF80",
  calendarId: "jeanmiguelborech@gmail.com", // ex: seuemail@gmail.com ou ID da agenda
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbyctSjXE1pfcJjifmNM5JE_2HOQqF93p1Frx6akmCVpgD-36RM7wmRsq5vCov-1nO7E/exec",
  // --- JANELAS DE HORÁRIO ---
  // Formato: { diaSemana: [[horaInicio, horaFim], ...] }
  // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  workingHours: {
    0: [],                              // Domingo - fechado
    1: [[13, 20]],                      // Segunda: 13h–20h
    2: [[8, 12], [13, 20]],             // Terça: 8h–12h e 13h–20h
    3: [[8, 12], [13, 20]],             // Quarta: 8h–12h e 13h–20h
    4: [[8, 12], [13, 20]],             // Quinta: 8h–12h e 13h–20h
    5: [[8, 12], [13, 20]],             // Sexta: 8h–12h e 13h–20h
    6: [[8, 13]],                       // Sábado: 8h–13h
  },

  // Duração de cada janela em minutos
  slotDuration: 30,

  // Quantos dias à frente o cliente pode agendar
  maxDaysAhead: 30,
};
