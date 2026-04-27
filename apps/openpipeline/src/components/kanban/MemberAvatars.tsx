"use client";

interface MemberAvatarsProps {
  mitglieder: { userId: string; rolle: string }[];
  maxVisible?: number;
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function MemberAvatars({ mitglieder, maxVisible = 3 }: MemberAvatarsProps) {
  if (mitglieder.length === 0) return null;

  const visible = mitglieder.slice(0, maxVisible);
  const overflow = mitglieder.length - maxVisible;

  return (
    <div className="flex -space-x-1.5">
      {visible.map((m, i) => (
        <div
          key={m.userId}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-medium ring-2 ring-zinc-900"
          style={{ backgroundColor: COLORS[i % COLORS.length] }}
          title={m.userId}
        >
          {m.userId.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-zinc-300 font-medium bg-zinc-700 ring-2 ring-zinc-900">
          +{overflow}
        </div>
      )}
    </div>
  );
}
