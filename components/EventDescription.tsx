import { descriptionHtml, type DescriptionFormat } from "@/lib/event-content";

export function EventDescription({ value, format = "text" }: { value: string; format?: DescriptionFormat }) {
  return <div className="event-rich-text" dangerouslySetInnerHTML={{ __html: descriptionHtml(value, format) }} />;
}
