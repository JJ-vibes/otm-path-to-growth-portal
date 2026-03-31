const stages = [
  { name: "Formation", desc: "Define the firm", icon: "🏗" },
  { name: "Traction", desc: "Prove the strategy", icon: "🎯" },
  { name: "Structure", desc: "Build the engine", icon: "⚙️" },
  { name: "Momentum", desc: "Scale what works", icon: "📈" },
  { name: "Scale-Ready", desc: "Systemize growth", icon: "🚀", gold: true },
  { name: "Accelerate + Exit", desc: "Maximize value", icon: "💎", gold: true },
];

export default function LifecycleBar() {
  return (
    <div className="mb-8">
      <h2 className="font-outfit font-semibold text-otm-navy text-lg mb-4">
        Professional Services Firm Growth Lifecycle&trade;
      </h2>
      <div className="relative flex items-stretch gap-0">
        {/* Connector line behind stages */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-200 -translate-y-1/2 z-0" />

        {stages.map((stage, i) => {
          const isTraction = stage.name === "Traction";
          return (
            <div
              key={stage.name}
              className={`relative z-10 flex-1 flex flex-col items-center text-center px-2 py-4 rounded-lg border transition-all ${
                isTraction
                  ? "bg-otm-teal text-white border-otm-teal shadow-md"
                  : "bg-white text-otm-gray border-gray-200"
              } ${i > 0 ? "ml-2" : ""}`}
            >
              <span className="text-lg mb-1">{stage.icon}</span>
              <span
                className={`font-outfit font-semibold text-[13px] leading-tight ${
                  isTraction ? "text-white" : "text-otm-navy"
                }`}
              >
                {stage.name}
              </span>
              <span
                className={`text-[11px] mt-0.5 ${
                  isTraction ? "text-white/80" : "text-gray-500"
                }`}
              >
                {stage.desc}
              </span>
              {isTraction && (
                <span className="mt-1.5 text-[10px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  You are here
                </span>
              )}
              {stage.gold && (
                <div className="absolute bottom-0 left-2 right-2 h-[3px] bg-otm-gold rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
