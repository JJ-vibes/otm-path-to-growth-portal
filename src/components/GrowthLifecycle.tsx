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

// The bottom progression bar in the lifecycle PNG splits its full width into
// 6 equal segments. Each stage occupies 1/6 (16.667%) of the width.
const SEGMENT_WIDTH_PCT = 100 / 6; // 16.667
const STAGE_INDEX: Record<StageKey, number> = {
  FORMATION: 0,
  TRACTION: 1,
  STRUCTURE: 2,
  MOMENTUM: 3,
  SCALE_READY: 4,
  ACCELERATE_EXIT: 5,
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
  const idx = STAGE_INDEX[stage];
  const segmentCenterPct = idx * SEGMENT_WIDTH_PCT + SEGMENT_WIDTH_PCT / 2;

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-10">
      <div className="relative w-full aspect-[1920/1080]">
        <Image
          src="/images/growth-lifecycle.png"
          alt="OTM Professional Services Firm Growth Lifecycle"
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-contain"
        />

        {/* "YOU ARE HERE" pill below the active stage, with an arrow pointing up at the stage name */}
        <div
          className="absolute pointer-events-none flex flex-col items-center"
          style={{
            left: `${segmentCenterPct}%`,
            top: "100%",
            transform: "translateX(-50%)",
            paddingTop: 4,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderBottom: "5px solid #e7a923",
            }}
          />
          <span
            className="font-outfit font-bold uppercase text-white text-[9px] tracking-[0.05em] px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              backgroundColor: "#e7a923",
              boxShadow: "0 2px 4px rgba(13,53,79,0.15)",
            }}
          >
            You are here
          </span>
        </div>
      </div>
    </div>
  );
}
