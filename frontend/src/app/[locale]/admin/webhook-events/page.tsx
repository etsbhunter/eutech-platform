import { setRequestLocale } from "next-intl/server";
import { WebhookEventsListContent } from "./WebhookEventsListContent";

export default async function AdminWebhookEventsPage({
  params,
}: PageProps<"/[locale]/admin/webhook-events">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WebhookEventsListContent />;
}
