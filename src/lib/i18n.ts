export type Lang = "en" | "it" | "es" | "pt";

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
];

type Translations = Record<string, Record<Lang, string>>;

const translations: Translations = {
  "nav.home": { en: "Home", it: "Home", es: "Inicio", pt: "Início" },
  "nav.fantasy": { en: "Fantasy", it: "Fantasy", es: "Fantasy", pt: "Fantasy" },
  "nav.draft": { en: "Draft", it: "Draft", es: "Draft", pt: "Draft" },
  "nav.leagues": { en: "Leagues", it: "Leghe", es: "Ligas", pt: "Ligas" },
  "nav.leaderboard": { en: "Leaderboard", it: "Classifica", es: "Clasificación", pt: "Classificação" },
  "nav.events": { en: "Events", it: "Eventi", es: "Eventos", pt: "Eventos" },
  "nav.teams": { en: "Teams", it: "Team", es: "Equipos", pt: "Times" },
  "nav.players": { en: "Players", it: "Giocatori", es: "Jugadores", pt: "Jogadores" },
  "nav.matches": { en: "Matches", it: "Partite", es: "Partidos", pt: "Partidas" },
  "nav.social": { en: "Social", it: "Social", es: "Social", pt: "Social" },
  "nav.tournaments": { en: "Tournaments", it: "Tornei", es: "Torneos", pt: "Torneios" },
  "nav.login": { en: "Login with Discord", it: "Accedi con Discord", es: "Entrar con Discord", pt: "Entrar com Discord" },
  "nav.logout": { en: "Logout", it: "Esci", es: "Salir", pt: "Sair" },
  "nav.profile": { en: "Profile", it: "Profilo", es: "Perfil", pt: "Perfil" },
  "fantasy.myTeam": { en: "My Team", it: "La Mia Squadra", es: "Mi Equipo", pt: "Meu Time" },
  "fantasy.budget": { en: "Budget", it: "Budget", es: "Presupuesto", pt: "Orçamento" },
  "fantasy.draft": { en: "Draft Players", it: "Seleziona Giocatori", es: "Elegir Jugadores", pt: "Escolher Jogadores" },
  "fantasy.addPlayer": { en: "Add", it: "Aggiungi", es: "Añadir", pt: "Adicionar" },
  "fantasy.removePlayer": { en: "Remove", it: "Rimuovi", es: "Quitar", pt: "Remover" },
  "fantasy.saveRoster": { en: "Save Roster", it: "Salva Rosa", es: "Guardar Plantilla", pt: "Salvar Escalação" },
  "fantasy.points": { en: "pts", it: "pt", es: "pts", pt: "pts" },
  "fantasy.weeklyPts": { en: "Weekly pts", it: "Punti settimanali", es: "Pts semanales", pt: "Pts semanais" },
  "fantasy.totalPts": { en: "Total pts", it: "Punti totali", es: "Pts totales", pt: "Pts totais" },
  "fantasy.rank": { en: "Rank", it: "Classifica", es: "Rango", pt: "Ranking" },
  "fantasy.noBudget": { en: "Not enough budget", it: "Budget insufficiente", es: "Presupuesto insuficiente", pt: "Orçamento insuficiente" },
  "fantasy.rosterFull": { en: "Roster full (5/5)", it: "Rosa completa (5/5)", es: "Plantilla completa (5/5)", pt: "Escalação completa (5/5)" },
  "fantasy.emptySlot": { en: "Empty slot", it: "Slot vuoto", es: "Slot vacío", pt: "Slot vazio" },
  "fantasy.autoPick": { en: "Auto Pick", it: "Selezione Auto", es: "Selección Auto", pt: "Seleção Auto" },
  "fantasy.lockMsg": { en: "Draft locks 1h before event", it: "Draft bloccato 1h prima dell'evento", es: "Draft bloqueado 1h antes del evento", pt: "Draft bloqueado 1h antes do evento" },
  "leagues.create": { en: "Create League", it: "Crea Lega", es: "Crear Liga", pt: "Criar Liga" },
  "leagues.join": { en: "Join League", it: "Entra in Lega", es: "Unirse a Liga", pt: "Entrar na Liga" },
  "leagues.global": { en: "Global", it: "Globale", es: "Global", pt: "Global" },
  "leagues.regional": { en: "Regional", it: "Regionale", es: "Regional", pt: "Regional" },
  "leagues.inviteCode": { en: "Invite Code", it: "Codice Invito", es: "Código de Invitación", pt: "Código de Convite" },
  "leagues.members": { en: "Members", it: "Membri", es: "Miembros", pt: "Membros" },
  "leagues.yourRank": { en: "Your Rank", it: "Il tuo Rank", es: "Tu Rango", pt: "Seu Ranking" },
  "events.upcoming": { en: "Upcoming", it: "Prossimi", es: "Próximos", pt: "Próximos" },
  "events.live": { en: "Live", it: "In Diretta", es: "En Vivo", pt: "Ao Vivo" },
  "events.completed": { en: "Completed", it: "Completati", es: "Completados", pt: "Concluídos" },
  "events.prizePool": { en: "Prize Pool", it: "Montepremi", es: "Premio", pt: "Premiação" },
  "matches.live": { en: "Live", it: "In Diretta", es: "En Vivo", pt: "Ao Vivo" },
  "matches.upcoming": { en: "Upcoming", it: "Prossimi", es: "Próximos", pt: "Próximos" },
  "matches.results": { en: "Results", it: "Risultati", es: "Resultados", pt: "Resultados" },
  "matches.vs": { en: "vs", it: "vs", es: "vs", pt: "vs" },
  "players.rating": { en: "Rating", it: "Rating", es: "Rating", pt: "Rating" },
  "players.acs": { en: "ACS", it: "ACS", es: "ACS", pt: "ACS" },
  "players.kd": { en: "K/D", it: "K/D", es: "K/D", pt: "K/D" },
  "players.price": { en: "Price", it: "Prezzo", es: "Precio", pt: "Preço" },
  "social.friends": { en: "Friends", it: "Amici", es: "Amigos", pt: "Amigos" },
  "social.addFriend": { en: "Add Friend", it: "Aggiungi Amico", es: "Añadir Amigo", pt: "Adicionar Amigo" },
  "social.pending": { en: "Pending", it: "In attesa", es: "Pendiente", pt: "Pendente" },
  "social.accept": { en: "Accept", it: "Accetta", es: "Aceptar", pt: "Aceitar" },
  "social.decline": { en: "Decline", it: "Rifiuta", es: "Rechazar", pt: "Recusar" },
  "social.activityFeed": { en: "Activity Feed", it: "Feed Attività", es: "Feed de Actividad", pt: "Feed de Atividade" },
  "tournaments.create": { en: "Create Tournament", it: "Crea Torneo", es: "Crear Torneo", pt: "Criar Torneio" },
  "tournaments.join": { en: "Join", it: "Partecipa", es: "Unirse", pt: "Participar" },
  "tournaments.discover": { en: "Discover", it: "Scopri", es: "Descubrir", pt: "Descobrir" },
  "tournaments.myTournaments": { en: "My Tournaments", it: "I Miei Tornei", es: "Mis Torneos", pt: "Meus Torneios" },
  "common.loading": { en: "Loading...", it: "Caricamento...", es: "Cargando...", pt: "Carregando..." },
  "common.error": { en: "Error loading data", it: "Errore nel caricamento", es: "Error al cargar", pt: "Erro ao carregar" },
  "common.viewAll": { en: "View all", it: "Vedi tutti", es: "Ver todo", pt: "Ver tudo" },
  "common.search": { en: "Search", it: "Cerca", es: "Buscar", pt: "Buscar" },
  "common.filter": { en: "Filter", it: "Filtra", es: "Filtrar", pt: "Filtrar" },
  "common.share": { en: "Share", it: "Condividi", es: "Compartir", pt: "Compartilhar" },
  "common.save": { en: "Save", it: "Salva", es: "Guardar", pt: "Salvar" },
  "common.cancel": { en: "Cancel", it: "Annulla", es: "Cancelar", pt: "Cancelar" },
  "common.confirm": { en: "Confirm", it: "Conferma", es: "Confirmar", pt: "Confirmar" },
  "common.region": { en: "Region", it: "Regione", es: "Región", pt: "Região" },
  "common.tier": { en: "Tier", it: "Tier", es: "Tier", pt: "Tier" },
  "common.team": { en: "Team", it: "Team", es: "Equipo", pt: "Time" },
  "common.player": { en: "Player", it: "Giocatore", es: "Jugador", pt: "Jogador" },
  "common.noData": { en: "No data available", it: "Nessun dato disponibile", es: "Sin datos disponibles", pt: "Sem dados disponíveis" },
  "home.hero.title": { en: "Valorant Fantasy League", it: "Fantasy League di Valorant", es: "Fantasy League de Valorant", pt: "Fantasy League de Valorant" },
  "home.hero.sub": { en: "Draft your squad. Compete globally. Dominate.", it: "Costruisci la tua squadra. Compete globalmente. Domina.", es: "Forma tu equipo. Compite globalmente. Domina.", pt: "Monte seu time. Compita globalmente. Domine." },
  "home.liveMatches": { en: "Live Matches", it: "Partite Live", es: "Partidos en Vivo", pt: "Partidas Ao Vivo" },
  "home.featuredEvents": { en: "Featured Events", it: "Eventi in Evidenza", es: "Eventos Destacados", pt: "Eventos em Destaque" },
  "home.topPicks": { en: "Top Fantasy Picks", it: "Top Pick Fantasy", es: "Mejores Picks Fantasy", pt: "Melhores Picks Fantasy" },
};

export function t(key: string, lang: Lang): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] ?? entry["en"] ?? key;
}

export function formatK(amount: number): string {
  const k = amount / 1000;
  if (Number.isInteger(k)) return `${k}k`;
  return `${parseFloat(k.toFixed(1))}k`;
}
