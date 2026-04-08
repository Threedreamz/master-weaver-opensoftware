import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["cs", "de", "en", "es", "fr", "it", "nl", "pl", "pt", "sv"],
  defaultLocale: "de",
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
