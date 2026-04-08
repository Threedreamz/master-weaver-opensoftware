import { redirect } from "next/navigation";

export default async function FlowPage({
  params,
}: {
  params: Promise<{ locale: string; flowId: string }>;
}) {
  const { locale, flowId } = await params;
  redirect(`/${locale}/flow/${flowId}/build`);
}
