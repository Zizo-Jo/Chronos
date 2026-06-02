import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Task } from "./chronos-types";

const ENABLED_KEY = "chronos.taskReminders.enabled.v1";
const SENT_KEY = "chronos.taskReminders.sent.v1";
const REMINDER_MINUTES = 10;
const CHECK_INTERVAL_MS = 30_000;

type ReminderPermission = NotificationPermission | "unsupported";

function supportsNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function readStoredEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredEnabled(enabled: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, String(enabled));
  } catch {
    /* keep the current page state usable when browser storage is unavailable */
  }
}

function readSentKeys() {
  try {
    const raw = sessionStorage.getItem(SENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((key) => typeof key === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeSentKeys(keys: Set<string>) {
  try {
    sessionStorage.setItem(SENT_KEY, JSON.stringify([...keys]));
  } catch {
    /* duplicate prevention is best-effort when session storage is unavailable */
  }
}

function taskStartDate(task: Task) {
  const [year, month, day] = task.date.split("-").map(Number);
  const [hour, minute] = task.start.split(":").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, 0, 0);
}

function taskReminderKey(task: Task) {
  return `${task.id}:${task.date}:${task.start}`;
}

function pruneSentKeys(tasks: Task[], sentKeys: Set<string>) {
  const activeKeys = new Set(
    tasks.filter((task) => !task.completed && !task.autoBreak).map(taskReminderKey),
  );
  return new Set([...sentKeys].filter((key) => activeKeys.has(key)));
}

function getDueReminderTasks(tasks: Task[], now: Date, sentKeys: Set<string>) {
  const nowMs = now.getTime();
  const reminderWindowMs = REMINDER_MINUTES * 60 * 1000;

  return tasks.filter((task) => {
    if (task.completed || task.autoBreak || sentKeys.has(taskReminderKey(task))) return false;

    const msUntilStart = taskStartDate(task).getTime() - nowMs;
    return msUntilStart > 0 && msUntilStart <= reminderWindowMs;
  });
}

function showTaskReminder(task: Task) {
  const title = "Chronos reminder";
  const body = `${task.title} starts at ${task.start}.`;

  if (document.visibilityState === "visible") {
    toast.info(`Upcoming task: ${task.title}`, {
      description: `Starts at ${task.start}.`,
      id: `task-reminder-${taskReminderKey(task)}`,
    });
    return;
  }

  try {
    new Notification(title, {
      body,
      tag: `chronos-${taskReminderKey(task)}`,
    });
  } catch {
    toast.info(`Upcoming task: ${task.title}`, {
      description: `Starts at ${task.start}.`,
      id: `task-reminder-${taskReminderKey(task)}`,
    });
  }
}

export function useTaskReminders(tasks: Task[]) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<ReminderPermission>("default");

  useEffect(() => {
    if (!supportsNotifications()) {
      setPermission("unsupported");
      setEnabled(false);
      return;
    }

    const nextPermission = Notification.permission;
    setPermission(nextPermission);

    const shouldEnable = readStoredEnabled() && nextPermission === "granted";
    setEnabled(shouldEnable);
    if (!shouldEnable) writeStoredEnabled(false);
  }, []);

  const enableReminders = useCallback(async () => {
    if (!supportsNotifications()) {
      setPermission("unsupported");
      toast.error("This browser does not support task reminders.");
      return;
    }

    let nextPermission = Notification.permission;
    if (nextPermission === "default") {
      nextPermission = await Notification.requestPermission();
    }

    setPermission(nextPermission);

    if (nextPermission !== "granted") {
      setEnabled(false);
      writeStoredEnabled(false);
      toast.error(
        nextPermission === "denied"
          ? "Browser notifications are blocked. Enable them in browser settings to use reminders."
          : "Notification permission was not granted.",
      );
      return;
    }

    setEnabled(true);
    writeStoredEnabled(true);
    toast.success(`Task reminders enabled ${REMINDER_MINUTES} minutes before each task.`);
  }, []);

  const disableReminders = useCallback(() => {
    setEnabled(false);
    writeStoredEnabled(false);
    toast.info("Task reminders disabled.");
  }, []);

  const toggleReminders = useCallback(async () => {
    if (enabled) {
      disableReminders();
      return;
    }
    await enableReminders();
  }, [disableReminders, enableReminders, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (!supportsNotifications() || Notification.permission !== "granted") {
      setEnabled(false);
      writeStoredEnabled(false);
      return;
    }

    const checkReminders = () => {
      const sentKeys = readSentKeys();
      const dueTasks = getDueReminderTasks(tasks, new Date(), sentKeys);
      const nextSentKeys = pruneSentKeys(tasks, sentKeys);

      for (const task of dueTasks) {
        showTaskReminder(task);
        nextSentKeys.add(taskReminderKey(task));
      }

      writeSentKeys(nextSentKeys);
    };

    checkReminders();
    const interval = window.setInterval(checkReminders, CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled, tasks]);

  return {
    remindersEnabled: enabled,
    remindersSupported: permission !== "unsupported",
    notificationPermission: permission,
    reminderMinutes: REMINDER_MINUTES,
    toggleReminders,
  };
}
