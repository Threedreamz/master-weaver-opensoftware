import { redirect } from "next/navigation";

/**
 * /admin/cam — catch-all redirect.
 *
 * The AppStore manifest references /admin/cam/* as iframe dashboard routes.
 * The hub's admin shell uses `remoteUrl` (e.g. /workbench) inside the iframe
 * rather than serving /admin/cam/* directly, but direct access to /admin/cam
 * from a browser should land on the workbench instead of 404.
 */
export default function AdminCamLanding() {
  redirect("/workbench");
}
