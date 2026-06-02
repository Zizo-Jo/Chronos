import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "chronos.focusRewards.v1";
const BASE_POINTS = 25;
const CLEAN_BONUS = 20;
const POINTS_PER_FIVE_MINUTES = 2;
const MAX_STREAK_BONUS = 25;
const MAX_TRACKED_TASK_IDS = 300;

export interface FocusRewardState {
  totalPoints: number;
  sessionsCompleted: number;
  cleanSessions: number;
  currentCleanStreak: number;
  bestCleanStreak: number;
  lastSessionAt?: string;
  awardedTaskIds: string[];
}

export interface FocusRewardBadge {
  id: string;
  title: string;
  description: string;
  goal: number;
  getValue: (stats: FocusRewardState) => number;
}

export interface FocusRewardBadgeProgress {
  badge: FocusRewardBadge;
  value: number;
  progress: number;
  unlocked: boolean;
}

export interface FocusRewardAward {
  points: number;
  clean: boolean;
  distractionCount: number;
  unlockedBadges: FocusRewardBadge[];
  currentCleanStreak: number;
}

interface AwardFocusSessionInput {
  taskId: string;
  durationMinutes: number;
  clean: boolean;
  distractionCount: number;
}

const EMPTY_STATS: FocusRewardState = {
  totalPoints: 0,
  sessionsCompleted: 0,
  cleanSessions: 0,
  currentCleanStreak: 0,
  bestCleanStreak: 0,
  awardedTaskIds: [],
};

const BADGES: FocusRewardBadge[] = [
  {
    id: "first-session",
    title: "First Focus",
    description: "Complete your first focus session.",
    goal: 1,
    getValue: (stats) => stats.sessionsCompleted,
  },
  {
    id: "clean-start",
    title: "Clean Start",
    description: "Finish one session without leaving Chronos.",
    goal: 1,
    getValue: (stats) => stats.cleanSessions,
  },
  {
    id: "three-clean",
    title: "Triple Lock-In",
    description: "Build a 3-session clean streak.",
    goal: 3,
    getValue: (stats) => stats.bestCleanStreak,
  },
  {
    id: "five-sessions",
    title: "Momentum",
    description: "Complete 5 focus sessions.",
    goal: 5,
    getValue: (stats) => stats.sessionsCompleted,
  },
  {
    id: "ten-clean",
    title: "Deep Work",
    description: "Finish 10 clean sessions.",
    goal: 10,
    getValue: (stats) => stats.cleanSessions,
  },
  {
    id: "thousand-points",
    title: "Point Hunter",
    description: "Earn 1,000 Focus Points.",
    goal: 1000,
    getValue: (stats) => stats.totalPoints,
  },
];

let memoryStats: FocusRewardState | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function clampInt(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function sanitizeStats(value: unknown): FocusRewardState {
  if (!value || typeof value !== "object") return { ...EMPTY_STATS };
  const stats = value as Partial<FocusRewardState>;
  const awardedTaskIds = Array.isArray(stats.awardedTaskIds)
    ? Array.from(new Set(stats.awardedTaskIds.filter((id): id is string => typeof id === "string")))
    : [];

  return {
    totalPoints: clampInt(stats.totalPoints),
    sessionsCompleted: clampInt(stats.sessionsCompleted),
    cleanSessions: clampInt(stats.cleanSessions),
    currentCleanStreak: clampInt(stats.currentCleanStreak),
    bestCleanStreak: clampInt(stats.bestCleanStreak),
    lastSessionAt: typeof stats.lastSessionAt === "string" ? stats.lastSessionAt : undefined,
    awardedTaskIds: awardedTaskIds.slice(0, MAX_TRACKED_TASK_IDS),
  };
}

function read(): FocusRewardState {
  if (typeof window === "undefined") return memoryStats ?? { ...EMPTY_STATS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      memoryStats = { ...EMPTY_STATS };
      return memoryStats;
    }
    memoryStats = sanitizeStats(JSON.parse(raw));
    return memoryStats;
  } catch {
    return memoryStats ?? { ...EMPTY_STATS };
  }
}

function persist(next: FocusRewardState) {
  memoryStats = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* keep the in-memory rewards session usable when browser storage is unavailable */
  }
  notify();
}

function getUnlockedBadgeIds(stats: FocusRewardState) {
  return new Set(
    BADGES.filter((badge) => badge.getValue(stats) >= badge.goal).map((badge) => badge.id),
  );
}

function getBadgeProgress(stats: FocusRewardState): FocusRewardBadgeProgress[] {
  return BADGES.map((badge) => {
    const value = badge.getValue(stats);
    return {
      badge,
      value,
      progress: Math.min(1, value / badge.goal),
      unlocked: value >= badge.goal,
    };
  });
}

function calculatePoints(durationMinutes: number, clean: boolean, nextCleanStreak: number) {
  const durationPoints = Math.max(5, Math.round((durationMinutes / 5) * POINTS_PER_FIVE_MINUTES));
  const cleanBonus = clean ? CLEAN_BONUS : 0;
  const streakBonus = clean ? Math.min(nextCleanStreak * 5, MAX_STREAK_BONUS) : 0;
  return BASE_POINTS + durationPoints + cleanBonus + streakBonus;
}

export function useFocusRewards() {
  const [stats, setStats] = useState<FocusRewardState>(() => read());

  useEffect(() => {
    const sync = () => setStats(read());
    listeners.add(sync);
    sync();

    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) sync();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const awardFocusSession = useCallback((input: AwardFocusSessionInput) => {
    const current = read();
    if (current.awardedTaskIds.includes(input.taskId)) return null;

    const nextCleanStreak = input.clean ? current.currentCleanStreak + 1 : 0;
    const points = calculatePoints(input.durationMinutes, input.clean, nextCleanStreak);
    const previousBadgeIds = getUnlockedBadgeIds(current);
    const next: FocusRewardState = {
      totalPoints: current.totalPoints + points,
      sessionsCompleted: current.sessionsCompleted + 1,
      cleanSessions: current.cleanSessions + (input.clean ? 1 : 0),
      currentCleanStreak: nextCleanStreak,
      bestCleanStreak: Math.max(current.bestCleanStreak, nextCleanStreak),
      lastSessionAt: new Date().toISOString(),
      awardedTaskIds: [input.taskId, ...current.awardedTaskIds].slice(0, MAX_TRACKED_TASK_IDS),
    };

    const unlockedBadges = BADGES.filter(
      (badge) => badge.getValue(next) >= badge.goal && !previousBadgeIds.has(badge.id),
    );
    persist(next);

    return {
      points,
      clean: input.clean,
      distractionCount: input.distractionCount,
      unlockedBadges,
      currentCleanStreak: next.currentCleanStreak,
    } satisfies FocusRewardAward;
  }, []);

  const badgeProgress = useMemo(() => getBadgeProgress(stats), [stats]);
  const unlockedBadges = useMemo(
    () => badgeProgress.filter((progress) => progress.unlocked).map((progress) => progress.badge),
    [badgeProgress],
  );
  const nextBadge = useMemo(
    () =>
      badgeProgress
        .filter((progress) => !progress.unlocked)
        .sort((a, b) => b.progress - a.progress)[0] ?? null,
    [badgeProgress],
  );

  return {
    stats,
    badgeProgress,
    unlockedBadges,
    nextBadge,
    awardFocusSession,
  };
}
