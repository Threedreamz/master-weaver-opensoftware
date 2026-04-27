import { notFound } from "next/navigation";
import { Download, Film } from "lucide-react";
import { getJob } from "@/lib/jobs";

export default async function ReelSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job || job.status !== "complete" || !job.outputPath) notFound();

  const ext = job.outputMimeType?.includes("mp4") ? "mp4" : "webm";
  const outputUrl = `/api/jobs/${id}/output`;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 p-6"
      style={{ background: "hsl(240 8% 4%)" }}
    >
      <header className="flex items-center gap-2">
        <Film className="w-5 h-5" style={{ color: "hsl(43 99% 62%)" }} />
        <span className="font-semibold" style={{ color: "hsl(0 0% 95%)" }}>
          Open3DReel
        </span>
      </header>

      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ maxWidth: 540, width: "100%" }}>
        <video
          src={outputUrl}
          autoPlay
          loop
          muted
          playsInline
          controls
          className="w-full"
          style={{ display: "block" }}
        />
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm" style={{ color: "hsl(240 5% 52%)" }}>
          {job.modelFilename} · {job.durationS}s · {job.aspect}
        </p>
        <a
          href={outputUrl}
          download={`open3dreel-${id}.${ext}`}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm"
          style={{ background: "hsl(43 99% 62%)", color: "hsl(240 6% 5%)" }}
        >
          <Download className="w-4 h-4" />
          Download Reel
        </a>
      </div>

      <p className="text-xs" style={{ color: "hsl(240 4% 28%)" }}>
        Created with{" "}
        <a href="https://3dreel.app" className="underline">
          3dreel.app
        </a>
      </p>
    </div>
  );
}
