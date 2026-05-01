import Image from "next/image";

const STAGE_KEYS = [
  "FORMATION",
  "TRACTION",
  "STRUCTURE",
  "MOMENTUM",
  "SCALE_READY",
  "ACCELERATE_EXIT",
] as const;

type StageKey = (typeof STAGE_KEYS)[number];

const PILL_LEFT_PCT: Record<StageKey, string> = {
  FORMATION: "4%",
  TRACTION: "18%",
  STRUCTURE: "35%",
  MOMENTUM: "51%",
  SCALE_READY: "68%",
  ACCELERATE_EXIT: "85%",
};

function normalizeStage(input: string): StageKey {
  const v = input.trim().toLowerCase().replace(/[\s+_-]+/g, "_");
  if (v.startsWith("formation")) return "FORMATION";
  if (v.startsWith("traction")) return "TRACTION";
  if (v.startsWith("structure")) return "STRUCTURE";
  if (v.startsWith("momentum")) return "MOMENTUM";
  if (v.startsWith("scale")) return "SCALE_READY";
  if (v.startsWith("accelerate")) return "ACCELERATE_EXIT";
  return "TRACTION";
}

export default function GrowthLifecycle({
  currentStage,
}: {
  currentStage: string;
}) {
  const stage = normalizeStage(currentStage);

  return (
    <div className="relative w-full max-w-[1200px] mx-auto aspect-[1920/1080]">
      <Image
        src="/images/growth-lifecycle.png"
        alt="OTM Professional Services Firm Growth Lifecycle"
        fill
        priority
        sizes="(max-width: 1200px) 100vw, 1200px"
        className="object-contain"
      />
      <div
        className="absolute pointer-events-none"
        style={{
          left: PILL_LEFT_PCT[stage],
          top: "30%",
          transform: "translateX(-50%)",
        }}
      >
        <span
          className="font-outfit font-bold uppercase text-white text-[11px] tracking-[0.05em] px-[10px] py-1 rounded-full"
          style={{
            backgroundColor: "#e7a923",
            boxShadow: "0 2px 4px rgba(13,53,79,0.15)",
          }}
        >
          You are here
        </span>
      </div>
    </div>
  );
}
