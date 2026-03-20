import { Quote } from "lucide-react";
import { MotionItem, MotionStagger } from "@/components/motion-stagger";

type TestimonialItem = {
  quote: string;
  name: string;
  role: string;
};

export default function HomeTestimonialsSection({
  eyebrow,
  title,
  subtitle,
  items,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: TestimonialItem[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-500/80 dark:text-emerald-300/70">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        <p className="text-sm leading-6 text-foreground/70 sm:text-base">{subtitle}</p>
      </div>

      <MotionStagger className="grid gap-5 md:grid-cols-3">
        {items.map((item, index) => (
          <MotionItem
            key={`${item.name}-${index}`}
            className="flex h-full flex-col rounded-3xl border border-foreground/10 bg-foreground/5 p-6 shadow-[0_20px_70px_-44px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-center justify-between">
              <Quote className="text-emerald-500" size={22} />
              <span className="rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/60">
                {item.role}
              </span>
            </div>
            <p className="mt-5 flex-1 text-sm leading-7 text-foreground/80 sm:text-base">{item.quote}</p>
            <div className="mt-5 border-t border-foreground/10 pt-4">
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-foreground/55">{item.role}</p>
            </div>
          </MotionItem>
        ))}
      </MotionStagger>

      {footer ? <div>{footer}</div> : null}
    </div>
  );
}
