import { CascadeNode } from "@/data/engagement";

export default function ActiveNodeView({ node }: { node: CascadeNode }) {
  return (
    <div>
      <div className="mb-3">
        <span className="inline-flex items-center text-xs font-medium bg-otm-teal/10 text-otm-teal px-2.5 py-1 rounded-full">
          In progress
        </span>
      </div>

      <h1 className="font-outfit font-bold text-otm-navy text-[22px] mb-4">
        {node.displayName}
      </h1>

      <p className="text-otm-gray text-[15px] leading-relaxed mb-4">
        Your OTM team is currently working on this deliverable.
      </p>

      {node.upstreamNames.length > 0 && (
        <p className="text-xs text-gray-500 italic">
          Depends on:{" "}
          {node.upstreamNames.map((name, i) => (
            <span key={name}>
              <span className="text-otm-navy not-italic">{name}</span>
              {i < node.upstreamNames.length - 1 && ", "}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
