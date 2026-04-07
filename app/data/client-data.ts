import { getSupabaseClient } from "./client";

export async function getService(slug: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Supabase error:", error.message, error.code, error.details);
    throw new Error("Could not fetch service");
  }
  return data;
}

export async function getServiceTasks(serviceId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("service_tasks")
    .select("*")
    .eq("service_id", serviceId)
    .order("display_order");

  if (error) throw new Error("Could not fetch service tasks");
  return data;
}

export async function getServiceAddons(serviceId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("service_addons")
    .select("*")
    .eq("service_id", serviceId)
    .eq("is_active", true);

  if (error) throw new Error("Could not fetch service addons");
  return data;
}

export async function getServiceExclusions(serviceId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("service_exclusions")
    .select("*")
    .eq("service_id", serviceId)
    .order("display_order");

  if (error) {
    console.error("Supabase error:", error.message, error.code, error.details);
    throw new Error("Could not fetch exclusions");
  }
  return data;
}
