import Icon from "./Icon";

export default function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} / 3 yulduz`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= value ? "text-warn" : "text-line"}>
          <Icon name="star" fill className={className} />
        </span>
      ))}
    </span>
  );
}
