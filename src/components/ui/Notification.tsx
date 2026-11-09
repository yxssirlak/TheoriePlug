"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { scheduleNotification, type NotificationType } from "../../lib/notification";

type NotificationProps = {
  children: ReactNode;
  type?: NotificationType;
  onDismiss?: () => void;
};

function notificationText(node: ReactNode): string {
  return Children.toArray(node).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return notificationText(child.props.children);
    return "";
  }).join("");
}

export default function Notification({ children, type = "error", onDismiss }: NotificationProps) {
  return <TimedNotification key={`${type}:${notificationText(children)}`} type={type} onDismiss={onDismiss}>{children}</TimedNotification>;
}

function TimedNotification({ children, type = "error", onDismiss }: NotificationProps) {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const dismissRef = useRef(onDismiss);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    return scheduleNotification(type, () => setFading(true), () => {
      setHidden(true);
      dismissRef.current?.();
    });
  }, [type]);

  if (typeof document === "undefined" || hidden) return null;
  return createPortal(
    <motion.div
      role={type === "error" ? "alert" : "status"}
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
      className={`fixed bottom-4 right-4 z-[110] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-2xl backdrop-blur-xl sm:bottom-6 sm:right-6 ${
        type === "error" || type === "deleted" ? "border-red-500/50 bg-[#2a0d12]/95 text-red-300" : type === "warning" ? "border-yellow-500/50 bg-[#29210a]/95 text-yellow-200" : "border-jade/50 bg-[#0a1f1a]/95 text-jade"
      }`}
    >
      <span aria-hidden="true">{type === "success" ? "✓" : type === "deleted" ? "✕" : "⚠"}</span><div className="min-w-0 flex-1">{children}</div>
      {onDismiss && <button type="button" aria-label="Melding sluiten" onClick={onDismiss} className="text-current opacity-70 hover:opacity-100">✕</button>}
    </motion.div>, document.fullscreenElement ?? document.body,
  );
}
