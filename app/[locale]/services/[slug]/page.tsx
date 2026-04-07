import ServiceDetail from "@/app/components/services/ServiceDetail";
import {
  getService,
  getServiceAddons,
  getServiceExclusions,
  getServiceTasks,
} from "@/app/data/client-data";

import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: { slug: string };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getLocale();

  const service = await getService(slug);

  if (!service) notFound();

  const [tasks, addons, exclusions] = await Promise.all([
    getServiceTasks(service.id),
    getServiceAddons(service.id),
    getServiceExclusions(service.id),
  ]);

  return (
    <ServiceDetail
      service={service}
      tasks={tasks}
      addons={addons}
      exclusions={exclusions}
      locale={locale}
    />
  );
}
