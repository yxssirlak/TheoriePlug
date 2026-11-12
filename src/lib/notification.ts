export type NotificationType = "error" | "success" | "warning" | "deleted";

export function scheduleNotification(
  type: NotificationType,
  fade: () => void,
  dismiss: () => void,
) {
  const duration = type === "error" ? 5000 : 3000;
  const fadeTimer = setTimeout(fade, duration - 300);
  const dismissTimer = setTimeout(dismiss, duration);

  return () => {
    clearTimeout(fadeTimer);
    clearTimeout(dismissTimer);
  };
}
