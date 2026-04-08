import { redirect } from "next/navigation";

export default async function SemPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/sem/organic`);
}
