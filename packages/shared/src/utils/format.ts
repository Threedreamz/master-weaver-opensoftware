import { format, formatDistanceToNow } from "date-fns";
import { de, enUS } from "date-fns/locale";

export function formatDate(date: Date | string, locale = "de") {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd.MM.yyyy", { locale: locale === "de" ? de : enUS });
}

export function formatRelative(date: Date | string, locale = "de") {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: locale === "de" ? de : enUS });
}
