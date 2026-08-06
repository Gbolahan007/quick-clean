import type { JsonLdObject } from "@/app/lib/seo/schema";

interface JsonLdProps {
  graph: JsonLdObject;
  id?: string;
}

export function JsonLd({ graph, id }: JsonLdProps) {
  const json = JSON.stringify(graph).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      {...(id ? { id } : {})}
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
