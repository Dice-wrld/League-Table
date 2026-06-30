export interface Team {
  id: number;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ("W" | "D" | "L")[];
  previousPosition?: number;
}

export interface MatchResult {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  playedAt: string;
}

export interface TournamentData {
  id: number;
  tournamentName: string;
  teams: Team[];
  matches: MatchResult[];
  tournamentLength: number | null;
  celebrationShown: boolean;
}

export interface TournamentCollection {
  currentId: number;
  tournaments: TournamentData[];
}

const STORAGE_KEY = "tournamentCollectionV1";
const LEGACY_STORAGE_KEY = "tournamentDataV2";

const createTeam = (id: number, name: string, previousPosition: number): Team => ({
  id,
  name,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
  form: [],
  previousPosition,
});

export const createInitialTeams = (): Team[] => [
  createTeam(1, "Team Alpha", 1),
  createTeam(2, "Team Beta", 2),
  createTeam(3, "Team Gamma", 3),
  createTeam(4, "Team Delta", 4),
  createTeam(5, "Team Epsilon", 5),
  createTeam(6, "Team Zeta", 6),
  createTeam(7, "Team Eta", 7),
  createTeam(8, "Team Theta", 8),
];

export const createTournamentData = (name = "Gaming Tournament", id = Date.now()): TournamentData => ({
  id,
  tournamentName: name,
  teams: createInitialTeams(),
  matches: [],
  tournamentLength: null,
  celebrationShown: false,
});

export const createDefaultTournament = (): TournamentData => createTournamentData();

export const createTournamentCollection = (): TournamentCollection => {
  const tournament = createDefaultTournament();
  return {
    currentId: tournament.id,
    tournaments: [tournament],
  };
};

const normalizeTeam = (team: Partial<Team>): Team => ({
  id: team.id ?? 0,
  name: team.name ?? "Unnamed Team",
  played: team.played ?? 0,
  won: team.won ?? 0,
  drawn: team.drawn ?? 0,
  lost: team.lost ?? 0,
  goalsFor: team.goalsFor ?? 0,
  goalsAgainst: team.goalsAgainst ?? 0,
  goalDifference: team.goalDifference ?? 0,
  points: team.points ?? 0,
  form: Array.isArray(team.form) ? team.form.filter((value): value is "W" | "D" | "L" => value === "W" || value === "D" || value === "L") : [],
  previousPosition: team.previousPosition ?? 0,
});

const normalizeTournament = (tournament: Partial<TournamentData>): TournamentData => ({
  id: tournament.id ?? Date.now(),
  tournamentName:
    typeof tournament.tournamentName === "string" && tournament.tournamentName.trim()
      ? tournament.tournamentName
      : createDefaultTournament().tournamentName,
  teams: Array.isArray(tournament.teams) && tournament.teams.length > 0 ? tournament.teams.map(normalizeTeam) : createInitialTeams(),
  matches: Array.isArray(tournament.matches) ? tournament.matches.filter(isMatchResult) : [],
  tournamentLength:
    typeof tournament.tournamentLength === "number" && tournament.tournamentLength > 0
      ? Math.floor(tournament.tournamentLength)
      : null,
  celebrationShown: tournament.celebrationShown === true,
});

export const saveTournamentCollection = (collection: TournamentCollection) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
};

export const loadTournamentCollection = (): TournamentCollection => {
  if (typeof window === "undefined") {
    return createTournamentCollection();
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy) as Partial<TournamentData>;
        const tournament = normalizeTournament(parsedLegacy);
        return {
          currentId: tournament.id,
          tournaments: [tournament],
        };
      }
      return createTournamentCollection();
    }

    const parsed = JSON.parse(saved) as Partial<TournamentCollection>;
    if (Array.isArray(parsed.tournaments) && typeof parsed.currentId === "number") {
      const tournaments = parsed.tournaments.map(normalizeTournament);
      const currentId = tournaments.some((t) => t.id === parsed.currentId)
        ? parsed.currentId
        : tournaments[0]?.id ?? Date.now();
      return {
        currentId,
        tournaments,
      };
    }

    return createTournamentCollection();
  } catch {
    return createTournamentCollection();
  }
};

const isMatchResult = (value: unknown): value is MatchResult => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const match = value as Partial<MatchResult>;
  return (
    typeof match.id === "number" &&
    typeof match.homeTeamId === "number" &&
    typeof match.awayTeamId === "number" &&
    typeof match.homeScore === "number" &&
    typeof match.awayScore === "number" &&
    typeof match.playedAt === "string"
  );
};

export const sortTeams = (teamsToSort: Team[]): Team[] => {
  return [...teamsToSort].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });
};

export const addMatchResult = (
  tournament: TournamentData,
  homeTeamId: number,
  awayTeamId: number,
  homeScore: number,
  awayScore: number
): TournamentData => {
  const updatedTeams = tournament.teams.map((team) => {
    if (team.id === homeTeamId) {
      const result: "W" | "D" | "L" = homeScore > awayScore ? "W" : homeScore < awayScore ? "L" : "D";
      return {
        ...team,
        played: team.played + 1,
        won: team.won + (homeScore > awayScore ? 1 : 0),
        drawn: team.drawn + (homeScore === awayScore ? 1 : 0),
        lost: team.lost + (homeScore < awayScore ? 1 : 0),
        goalsFor: team.goalsFor + homeScore,
        goalsAgainst: team.goalsAgainst + awayScore,
        goalDifference: team.goalDifference + (homeScore - awayScore),
        points: team.points + (homeScore > awayScore ? 3 : homeScore === awayScore ? 1 : 0),
        form: [result, ...team.form].slice(0, 5),
      };
    }

    if (team.id === awayTeamId) {
      const result: "W" | "D" | "L" = awayScore > homeScore ? "W" : awayScore < homeScore ? "L" : "D";
      return {
        ...team,
        played: team.played + 1,
        won: team.won + (awayScore > homeScore ? 1 : 0),
        drawn: team.drawn + (homeScore === awayScore ? 1 : 0),
        lost: team.lost + (awayScore < homeScore ? 1 : 0),
        goalsFor: team.goalsFor + awayScore,
        goalsAgainst: team.goalsAgainst + homeScore,
        goalDifference: team.goalDifference + (awayScore - homeScore),
        points: team.points + (awayScore > homeScore ? 3 : homeScore === awayScore ? 1 : 0),
        form: [result, ...team.form].slice(0, 5),
      };
    }

    return team;
  });

  const previousStandings = sortTeams(tournament.teams);
  const sortedTeams = sortTeams(updatedTeams).map((team) => ({
    ...team,
    previousPosition: previousStandings.findIndex((existing) => existing.id === team.id) + 1,
  }));

  const match: MatchResult = {
    id: Date.now(),
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    playedAt: new Date().toISOString(),
  };

  return {
    ...tournament,
    teams: sortedTeams,
    matches: [match, ...tournament.matches].slice(0, 25),
  };
};

export const resetTournament = (tournament: TournamentData): TournamentData => ({
  ...tournament,
  teams: tournament.teams.map((team, index) => ({
    ...team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
    previousPosition: index + 1,
  })),
  matches: [],
});

export const updateTeamName = (tournament: TournamentData, id: number, newName: string): TournamentData => ({
  ...tournament,
  teams: tournament.teams.map((team) => (team.id === id ? { ...team, name: newName } : team)),
});

export const addNewTeam = (tournament: TournamentData): TournamentData => {
  const newId = Math.max(...tournament.teams.map((team) => team.id), 0) + 1;
  const newTeam = createTeam(newId, `Team ${newId}`, tournament.teams.length + 1);

  return {
    ...tournament,
    teams: [...tournament.teams, newTeam],
  };
};

export const removeTeam = (tournament: TournamentData, id: number): TournamentData => {
  if (tournament.teams.length <= 2) {
    return tournament;
  }

  return {
    ...tournament,
    teams: tournament.teams.filter((team) => team.id !== id),
  };
};

export const importTournamentData = (json: string, id = Date.now()): TournamentData => {
  const parsed = JSON.parse(json) as Partial<TournamentData>;
  return {
    id,
    tournamentName:
      typeof parsed.tournamentName === "string" && parsed.tournamentName.trim()
        ? parsed.tournamentName
        : createDefaultTournament().tournamentName,
    teams: Array.isArray(parsed.teams) && parsed.teams.length > 0 ? parsed.teams.map(normalizeTeam) : createInitialTeams(),
    matches: Array.isArray(parsed.matches) ? parsed.matches.filter(isMatchResult) : [],
    tournamentLength:
      typeof parsed.tournamentLength === "number" && parsed.tournamentLength > 0
        ? Math.floor(parsed.tournamentLength)
        : null,
    celebrationShown: false,
  };
};

export const addTournament = (collection: TournamentCollection, name?: string): TournamentCollection => {
  const tournamentName = name ?? `Tournament ${collection.tournaments.length + 1}`;
  const tournament = createTournamentData(tournamentName, Date.now());
  return {
    ...collection,
    currentId: tournament.id,
    tournaments: [...collection.tournaments, tournament],
  };
};

export const setCurrentTournament = (collection: TournamentCollection, id: number): TournamentCollection => {
  if (collection.tournaments.some((t) => t.id === id)) {
    return { ...collection, currentId: id };
  }
  return collection;
};

export const updateTournamentInCollection = (
  collection: TournamentCollection,
  tournament: TournamentData
): TournamentCollection => ({
  ...collection,
  tournaments: collection.tournaments.map((item) => (item.id === tournament.id ? tournament : item)),
});

export const removeTournament = (collection: TournamentCollection, id: number): TournamentCollection => {
  if (collection.tournaments.length <= 1) {
    return collection;
  }

  const tournaments = collection.tournaments.filter((t) => t.id !== id);
  const currentId = tournaments.some((t) => t.id === collection.currentId) ? collection.currentId : tournaments[0].id;

  return {
    currentId,
    tournaments,
  };
};
