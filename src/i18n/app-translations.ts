// App-shell translation namespace (sidebar, header, common buttons, page headers).
// Keys not present in a given language fall back to English via i18next.
// Languages without an entry below inherit English entirely for the `app` keys.

export type AppDict = {
  common: {
    save: string; cancel: string; delete: string; loading: string; saving: string;
    create: string; edit: string; close: string; add: string; remove: string;
    search: string; askAi: string; signOut: string; yes: string; no: string;
    name: string; email: string; back: string; next: string; finish: string;
    today: string; week: string; month: string; minutes: string; hours: string;
    askPlaceholder: string; viewAll: string; tryAgain: string;
  };
  sidebar: {
    main: string; tools: string;
    dashboard: string; now: string; assistant: string; study: string;
    finance: string; nutrition: string; calendar: string; focus: string;
    habits: string; analytics: string; settings: string;
  };
  pages: {
    dashboardSubtitle: string; greetingMorning: string; greetingAfternoon: string; greetingEvening: string;
    planMyDay: string; planning: string; focusBtn: string;
    focusScore: string; budgetLeft: string; caloriesToday: string; streak: string;
    todaysPlan: string; nextUp: string; nothingOnDeck: string; createFirstTask: string;
    blankCanvas: string; blankCanvasDesc: string; planWithAi: string; addEvent: string; openTask: string;
    assistantTitle: string; assistantSubtitle: string; assistantHi: string; assistantPrompt: string;
    studyTitle: string; studySubtitle: string;
    financeTitle: string; financeSubtitle: string;
    nutritionTitle: string; nutritionSubtitle: string;
    calendarTitle: string;
    focusTitle: string; focusSubtitle: string; start: string; pause: string; inFlow: string; paused: string;
    analyticsTitle: string; analyticsSubtitle: string;
    settingsTitle: string; settingsSubtitle: string;
    habitsTitle: string; habitsSubtitle: string; newHabit: string; noHabits: string;
  };
};

const en: AppDict = {
  common: {
    save: "Save", cancel: "Cancel", delete: "Delete", loading: "Loading…", saving: "Saving…",
    create: "Create", edit: "Edit", close: "Close", add: "Add", remove: "Remove",
    search: "Search anything...", askAi: "Ask AI", signOut: "Sign out", yes: "Yes", no: "No",
    name: "Name", email: "Email", back: "Back", next: "Next", finish: "Finish",
    today: "Today", week: "Week", month: "Month", minutes: "min", hours: "h",
    askPlaceholder: "Ask Zentryx anything...", viewAll: "View all", tryAgain: "Try again",
  },
  sidebar: {
    main: "Main", tools: "Tools",
    dashboard: "Dashboard", now: "Now", assistant: "AI Assistant", study: "Study Planner",
    finance: "Finance", nutrition: "Nutrition", calendar: "Calendar", focus: "Focus Mode",
    habits: "Habits", analytics: "Analytics", settings: "Settings",
  },
  pages: {
    dashboardSubtitle: "Your command center",
    greetingMorning: "Good morning", greetingAfternoon: "Good afternoon", greetingEvening: "Good evening",
    planMyDay: "Plan my day", planning: "Planning…", focusBtn: "Focus",
    focusScore: "Focus Score", budgetLeft: "Budget Left", caloriesToday: "Calories Today", streak: "Streak",
    todaysPlan: "Today's Plan", nextUp: "Next Up", nothingOnDeck: "Nothing on deck",
    createFirstTask: "Create your first task",
    blankCanvas: "A blank canvas", blankCanvasDesc: "Plan your day with AI or add an event manually to begin.",
    planWithAi: "Plan with AI", addEvent: "Add event", openTask: "Open task",
    assistantTitle: "AI Assistant", assistantSubtitle: "Your 24/7 chief-of-staff.",
    assistantHi: "Hi", assistantPrompt: "Ask me anything about your study plan, finances, meals, or focus.",
    studyTitle: "Study Planner", studySubtitle: "Tasks, exams and revision in one calm plan.",
    financeTitle: "Finance", financeSubtitle: "Track spending and stay on budget.",
    nutritionTitle: "Nutrition", nutritionSubtitle: "Plan meals, hit macros, save money.",
    calendarTitle: "Calendar",
    focusTitle: "Focus Mode", focusSubtitle: "One block at a time. Distractions silenced.",
    start: "Start", pause: "Pause", inFlow: "In flow", paused: "Paused",
    analyticsTitle: "Analytics", analyticsSubtitle: "Insights on focus, tasks, study, spending and meals.",
    settingsTitle: "Settings", settingsSubtitle: "Customize how Zentryx works for you.",
    habitsTitle: "Habits", habitsSubtitle: "Build streaks. One day at a time.",
    newHabit: "New habit", noHabits: "No habits yet — start building one.",
  },
};

const es: AppDict = {
  common: {
    save: "Guardar", cancel: "Cancelar", delete: "Eliminar", loading: "Cargando…", saving: "Guardando…",
    create: "Crear", edit: "Editar", close: "Cerrar", add: "Añadir", remove: "Quitar",
    search: "Busca cualquier cosa...", askAi: "Pregunta a la IA", signOut: "Cerrar sesión", yes: "Sí", no: "No",
    name: "Nombre", email: "Correo", back: "Atrás", next: "Siguiente", finish: "Terminar",
    today: "Hoy", week: "Semana", month: "Mes", minutes: "min", hours: "h",
    askPlaceholder: "Pregúntale lo que quieras a Zentryx...", viewAll: "Ver todo", tryAgain: "Reintentar",
  },
  sidebar: {
    main: "Principal", tools: "Herramientas",
    dashboard: "Panel", now: "Ahora", assistant: "Asistente IA", study: "Planificador de estudio",
    finance: "Finanzas", nutrition: "Nutrición", calendar: "Calendario", focus: "Modo enfoque",
    habits: "Hábitos", analytics: "Analítica", settings: "Ajustes",
  },
  pages: {
    dashboardSubtitle: "Tu centro de mando",
    greetingMorning: "Buenos días", greetingAfternoon: "Buenas tardes", greetingEvening: "Buenas noches",
    planMyDay: "Planificar mi día", planning: "Planificando…", focusBtn: "Enfoque",
    focusScore: "Puntuación de enfoque", budgetLeft: "Presupuesto restante", caloriesToday: "Calorías hoy", streak: "Racha",
    todaysPlan: "Plan de hoy", nextUp: "Siguiente", nothingOnDeck: "Nada pendiente",
    createFirstTask: "Crea tu primera tarea",
    blankCanvas: "Un lienzo en blanco", blankCanvasDesc: "Planifica tu día con IA o añade un evento manualmente.",
    planWithAi: "Planificar con IA", addEvent: "Añadir evento", openTask: "Abrir tarea",
    assistantTitle: "Asistente IA", assistantSubtitle: "Tu jefe de gabinete 24/7.",
    assistantHi: "Hola", assistantPrompt: "Pregúntame sobre estudio, finanzas, comidas o enfoque.",
    studyTitle: "Planificador de estudio", studySubtitle: "Tareas, exámenes y repaso en un plan claro.",
    financeTitle: "Finanzas", financeSubtitle: "Controla tus gastos y mantén el presupuesto.",
    nutritionTitle: "Nutrición", nutritionSubtitle: "Planifica comidas, alcanza tus macros, ahorra.",
    calendarTitle: "Calendario",
    focusTitle: "Modo enfoque", focusSubtitle: "Un bloque a la vez. Sin distracciones.",
    start: "Iniciar", pause: "Pausar", inFlow: "En flujo", paused: "Pausado",
    analyticsTitle: "Analítica", analyticsSubtitle: "Insights sobre enfoque, tareas, estudio, gasto y comidas.",
    settingsTitle: "Ajustes", settingsSubtitle: "Personaliza cómo funciona Zentryx para ti.",
    habitsTitle: "Hábitos", habitsSubtitle: "Construye rachas. Un día a la vez.",
    newHabit: "Nuevo hábito", noHabits: "Sin hábitos aún — empieza a construir uno.",
  },
};

const fr: AppDict = {
  common: {
    save: "Enregistrer", cancel: "Annuler", delete: "Supprimer", loading: "Chargement…", saving: "Enregistrement…",
    create: "Créer", edit: "Modifier", close: "Fermer", add: "Ajouter", remove: "Retirer",
    search: "Rechercher...", askAi: "Demander à l'IA", signOut: "Déconnexion", yes: "Oui", no: "Non",
    name: "Nom", email: "E-mail", back: "Retour", next: "Suivant", finish: "Terminer",
    today: "Aujourd'hui", week: "Semaine", month: "Mois", minutes: "min", hours: "h",
    askPlaceholder: "Demandez n'importe quoi à Zentryx...", viewAll: "Voir tout", tryAgain: "Réessayer",
  },
  sidebar: {
    main: "Principal", tools: "Outils",
    dashboard: "Tableau de bord", now: "Maintenant", assistant: "Assistant IA", study: "Planificateur d'études",
    finance: "Finances", nutrition: "Nutrition", calendar: "Calendrier", focus: "Mode focus",
    habits: "Habitudes", analytics: "Analyses", settings: "Paramètres",
  },
  pages: {
    dashboardSubtitle: "Votre centre de commande",
    greetingMorning: "Bonjour", greetingAfternoon: "Bon après-midi", greetingEvening: "Bonsoir",
    planMyDay: "Planifier ma journée", planning: "Planification…", focusBtn: "Focus",
    focusScore: "Score de focus", budgetLeft: "Budget restant", caloriesToday: "Calories aujourd'hui", streak: "Série",
    todaysPlan: "Plan du jour", nextUp: "Prochain", nothingOnDeck: "Rien au programme",
    createFirstTask: "Créez votre première tâche",
    blankCanvas: "Une page blanche", blankCanvasDesc: "Planifiez votre journée avec l'IA ou ajoutez un événement.",
    planWithAi: "Planifier avec l'IA", addEvent: "Ajouter un événement", openTask: "Ouvrir la tâche",
    assistantTitle: "Assistant IA", assistantSubtitle: "Votre chef de cabinet 24/7.",
    assistantHi: "Bonjour", assistantPrompt: "Demandez-moi tout sur études, finances, repas ou focus.",
    studyTitle: "Planificateur d'études", studySubtitle: "Devoirs, examens et révisions en un plan calme.",
    financeTitle: "Finances", financeSubtitle: "Suivez les dépenses et restez dans le budget.",
    nutritionTitle: "Nutrition", nutritionSubtitle: "Planifiez les repas, atteignez vos macros.",
    calendarTitle: "Calendrier",
    focusTitle: "Mode focus", focusSubtitle: "Un bloc à la fois. Sans distractions.",
    start: "Démarrer", pause: "Pause", inFlow: "En flux", paused: "En pause",
    analyticsTitle: "Analyses", analyticsSubtitle: "Insights sur focus, tâches, études, dépenses et repas.",
    settingsTitle: "Paramètres", settingsSubtitle: "Personnalisez Zentryx selon vos besoins.",
    habitsTitle: "Habitudes", habitsSubtitle: "Construisez des séries. Un jour à la fois.",
    newHabit: "Nouvelle habitude", noHabits: "Pas encore d'habitude — commencez-en une.",
  },
};

const de: AppDict = {
  common: {
    save: "Speichern", cancel: "Abbrechen", delete: "Löschen", loading: "Lädt…", saving: "Speichern…",
    create: "Erstellen", edit: "Bearbeiten", close: "Schließen", add: "Hinzufügen", remove: "Entfernen",
    search: "Alles suchen...", askAi: "KI fragen", signOut: "Abmelden", yes: "Ja", no: "Nein",
    name: "Name", email: "E-Mail", back: "Zurück", next: "Weiter", finish: "Fertig",
    today: "Heute", week: "Woche", month: "Monat", minutes: "Min", hours: "Std",
    askPlaceholder: "Frag Zentryx alles...", viewAll: "Alle anzeigen", tryAgain: "Erneut versuchen",
  },
  sidebar: {
    main: "Hauptmenü", tools: "Tools",
    dashboard: "Dashboard", now: "Jetzt", assistant: "KI-Assistent", study: "Studienplaner",
    finance: "Finanzen", nutrition: "Ernährung", calendar: "Kalender", focus: "Fokus-Modus",
    habits: "Gewohnheiten", analytics: "Analysen", settings: "Einstellungen",
  },
  pages: {
    dashboardSubtitle: "Deine Kommandozentrale",
    greetingMorning: "Guten Morgen", greetingAfternoon: "Guten Tag", greetingEvening: "Guten Abend",
    planMyDay: "Tag planen", planning: "Plane…", focusBtn: "Fokus",
    focusScore: "Fokus-Score", budgetLeft: "Restbudget", caloriesToday: "Kalorien heute", streak: "Serie",
    todaysPlan: "Tagesplan", nextUp: "Als Nächstes", nothingOnDeck: "Nichts ansteht",
    createFirstTask: "Erstelle deine erste Aufgabe",
    blankCanvas: "Eine leere Leinwand", blankCanvasDesc: "Plane mit KI oder füge ein Ereignis hinzu.",
    planWithAi: "Mit KI planen", addEvent: "Ereignis hinzufügen", openTask: "Aufgabe öffnen",
    assistantTitle: "KI-Assistent", assistantSubtitle: "Dein 24/7-Stabschef.",
    assistantHi: "Hi", assistantPrompt: "Frag mich alles über Studium, Finanzen, Essen oder Fokus.",
    studyTitle: "Studienplaner", studySubtitle: "Aufgaben, Prüfungen und Wiederholung in einem Plan.",
    financeTitle: "Finanzen", financeSubtitle: "Ausgaben verfolgen, Budget halten.",
    nutritionTitle: "Ernährung", nutritionSubtitle: "Mahlzeiten planen, Makros erreichen, sparen.",
    calendarTitle: "Kalender",
    focusTitle: "Fokus-Modus", focusSubtitle: "Ein Block nach dem anderen.",
    start: "Start", pause: "Pause", inFlow: "Im Flow", paused: "Pausiert",
    analyticsTitle: "Analysen", analyticsSubtitle: "Insights zu Fokus, Aufgaben, Studium, Ausgaben und Essen.",
    settingsTitle: "Einstellungen", settingsSubtitle: "Passe Zentryx an dich an.",
    habitsTitle: "Gewohnheiten", habitsSubtitle: "Baue Serien auf. Tag für Tag.",
    newHabit: "Neue Gewohnheit", noHabits: "Noch keine Gewohnheiten — starte eine.",
  },
};

const pt: AppDict = {
  common: {
    save: "Salvar", cancel: "Cancelar", delete: "Excluir", loading: "Carregando…", saving: "Salvando…",
    create: "Criar", edit: "Editar", close: "Fechar", add: "Adicionar", remove: "Remover",
    search: "Buscar qualquer coisa...", askAi: "Perguntar à IA", signOut: "Sair", yes: "Sim", no: "Não",
    name: "Nome", email: "E-mail", back: "Voltar", next: "Próximo", finish: "Concluir",
    today: "Hoje", week: "Semana", month: "Mês", minutes: "min", hours: "h",
    askPlaceholder: "Pergunte qualquer coisa ao Zentryx...", viewAll: "Ver tudo", tryAgain: "Tentar novamente",
  },
  sidebar: {
    main: "Principal", tools: "Ferramentas",
    dashboard: "Painel", now: "Agora", assistant: "Assistente IA", study: "Planejador de estudos",
    finance: "Finanças", nutrition: "Nutrição", calendar: "Calendário", focus: "Modo foco",
    habits: "Hábitos", analytics: "Análises", settings: "Configurações",
  },
  pages: {
    dashboardSubtitle: "Seu centro de comando",
    greetingMorning: "Bom dia", greetingAfternoon: "Boa tarde", greetingEvening: "Boa noite",
    planMyDay: "Planejar meu dia", planning: "Planejando…", focusBtn: "Foco",
    focusScore: "Pontuação de foco", budgetLeft: "Orçamento restante", caloriesToday: "Calorias hoje", streak: "Sequência",
    todaysPlan: "Plano de hoje", nextUp: "Próximo", nothingOnDeck: "Nada pendente",
    createFirstTask: "Crie sua primeira tarefa",
    blankCanvas: "Uma tela em branco", blankCanvasDesc: "Planeje com IA ou adicione um evento manualmente.",
    planWithAi: "Planejar com IA", addEvent: "Adicionar evento", openTask: "Abrir tarefa",
    assistantTitle: "Assistente IA", assistantSubtitle: "Seu chefe de gabinete 24/7.",
    assistantHi: "Olá", assistantPrompt: "Me pergunte sobre estudos, finanças, refeições ou foco.",
    studyTitle: "Planejador de estudos", studySubtitle: "Tarefas, provas e revisão em um plano calmo.",
    financeTitle: "Finanças", financeSubtitle: "Acompanhe gastos e mantenha o orçamento.",
    nutritionTitle: "Nutrição", nutritionSubtitle: "Planeje refeições, atinja macros, economize.",
    calendarTitle: "Calendário",
    focusTitle: "Modo foco", focusSubtitle: "Um bloco por vez. Sem distrações.",
    start: "Iniciar", pause: "Pausar", inFlow: "Em fluxo", paused: "Pausado",
    analyticsTitle: "Análises", analyticsSubtitle: "Insights sobre foco, tarefas, estudo, gastos e refeições.",
    settingsTitle: "Configurações", settingsSubtitle: "Personalize como o Zentryx funciona.",
    habitsTitle: "Hábitos", habitsSubtitle: "Construa sequências. Um dia de cada vez.",
    newHabit: "Novo hábito", noHabits: "Sem hábitos ainda — comece um.",
  },
};

const it: AppDict = {
  common: {
    save: "Salva", cancel: "Annulla", delete: "Elimina", loading: "Caricamento…", saving: "Salvataggio…",
    create: "Crea", edit: "Modifica", close: "Chiudi", add: "Aggiungi", remove: "Rimuovi",
    search: "Cerca qualsiasi cosa...", askAi: "Chiedi all'IA", signOut: "Esci", yes: "Sì", no: "No",
    name: "Nome", email: "Email", back: "Indietro", next: "Avanti", finish: "Fine",
    today: "Oggi", week: "Settimana", month: "Mese", minutes: "min", hours: "h",
    askPlaceholder: "Chiedi qualsiasi cosa a Zentryx...", viewAll: "Vedi tutto", tryAgain: "Riprova",
  },
  sidebar: {
    main: "Principale", tools: "Strumenti",
    dashboard: "Dashboard", now: "Adesso", assistant: "Assistente IA", study: "Pianificatore studio",
    finance: "Finanze", nutrition: "Nutrizione", calendar: "Calendario", focus: "Modalità focus",
    habits: "Abitudini", analytics: "Analisi", settings: "Impostazioni",
  },
  pages: {
    dashboardSubtitle: "Il tuo centro di comando",
    greetingMorning: "Buongiorno", greetingAfternoon: "Buon pomeriggio", greetingEvening: "Buonasera",
    planMyDay: "Pianifica la giornata", planning: "Pianificando…", focusBtn: "Focus",
    focusScore: "Punteggio focus", budgetLeft: "Budget rimasto", caloriesToday: "Calorie oggi", streak: "Serie",
    todaysPlan: "Piano di oggi", nextUp: "Prossimo", nothingOnDeck: "Nulla in agenda",
    createFirstTask: "Crea la tua prima attività",
    blankCanvas: "Una tela bianca", blankCanvasDesc: "Pianifica con l'IA o aggiungi un evento manualmente.",
    planWithAi: "Pianifica con l'IA", addEvent: "Aggiungi evento", openTask: "Apri attività",
    assistantTitle: "Assistente IA", assistantSubtitle: "Il tuo capo di gabinetto 24/7.",
    assistantHi: "Ciao", assistantPrompt: "Chiedimi tutto su studio, finanze, pasti o focus.",
    studyTitle: "Pianificatore studio", studySubtitle: "Compiti, esami e ripasso in un piano sereno.",
    financeTitle: "Finanze", financeSubtitle: "Traccia le spese e resta nel budget.",
    nutritionTitle: "Nutrizione", nutritionSubtitle: "Pianifica pasti, raggiungi i macro, risparmia.",
    calendarTitle: "Calendario",
    focusTitle: "Modalità focus", focusSubtitle: "Un blocco alla volta. Senza distrazioni.",
    start: "Avvia", pause: "Pausa", inFlow: "In flusso", paused: "In pausa",
    analyticsTitle: "Analisi", analyticsSubtitle: "Insight su focus, attività, studio, spese e pasti.",
    settingsTitle: "Impostazioni", settingsSubtitle: "Personalizza come funziona Zentryx.",
    habitsTitle: "Abitudini", habitsSubtitle: "Costruisci serie. Un giorno alla volta.",
    newHabit: "Nuova abitudine", noHabits: "Nessuna abitudine — iniziane una.",
  },
};

export const APP_TRANSLATIONS: Record<string, { app: AppDict }> = {
  en: { app: en },
  es: { app: es },
  fr: { app: fr },
  de: { app: de },
  pt: { app: pt },
  it: { app: it },
};

// Languages without explicit app translations get English (no mixed UI).
export const APP_FALLBACK = { app: en };