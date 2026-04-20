export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">OpenPortal</h1>
      <p className="mt-2 text-gray-600">
        Generic team and organization portal for the OpenSoftware ecosystem.
      </p>
      <ul className="mt-6 space-y-1 text-sm">
        <li>/teams — organization management</li>
        <li>/members — member roles &amp; invitations</li>
        <li>/channels — real-time messaging</li>
        <li>/meetings — AI-recorded meetings</li>
        <li>/audit — audit log &amp; GDPR exports</li>
      </ul>
    </main>
  );
}
