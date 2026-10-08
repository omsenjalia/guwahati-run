import { TimelineView } from "@/components/timeline-view";

export const metadata = { title: "Timeline - Guwahati Run" };

export default function TimelinePage() {
  const token = process.env.CALENDAR_TOKEN;
  return <TimelineView calendarPath={token ? `/api/calendar/${token}` : undefined} />;
}
