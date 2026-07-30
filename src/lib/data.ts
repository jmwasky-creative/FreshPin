import type { ItemPreview, LocationView, RecentItemView, SpaceView } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import { createSignedImageUrl } from "@/lib/storage";

interface RawItem {
  id: string;
  name: string;
  image_path: string | null;
  expire_date: string | null;
  status: "ACTIVE" | "USED" | "DISCARDED";
}


interface RawRecentItem {
  id: string;
  name: string;
  image_path: string | null;
  expire_date: string | null;
  status: "ACTIVE" | "USED" | "DISCARDED";
  created_at: string;
  location: unknown;
}

interface RawLocation {
  id: string;
  name: string;
  x_ratio: number | string;
  y_ratio: number | string;
  items?: RawItem[] | null;
}

interface RawSpace {
  id: string;
  name: string;
  image_path: string;
  image_width: number;
  image_height: number;
  created_at: string;
  locations?: RawLocation[] | null;
}

async function mapItem(item: RawItem): Promise<ItemPreview> {
  return {
    id: item.id,
    name: item.name,
    imagePath: item.image_path,
    imageUrl: await createSignedImageUrl("item-images", item.image_path),
    expireDate: item.expire_date,
    status: item.status,
  };
}

async function mapLocation(location: RawLocation): Promise<LocationView> {
  return {
    id: location.id,
    name: location.name,
    xRatio: Number(location.x_ratio),
    yRatio: Number(location.y_ratio),
    items: await Promise.all((location.items ?? []).filter((item) => item.status === "ACTIVE").map(mapItem)),
  };
}

async function mapSpace(space: RawSpace): Promise<SpaceView> {
  const imageUrl = await createSignedImageUrl("space-images", space.image_path);
  return {
    id: space.id,
    name: space.name,
    imagePath: space.image_path,
    imageUrl: imageUrl ?? "",
    imageWidth: space.image_width,
    imageHeight: space.image_height,
    createdAt: space.created_at,
    locations: await Promise.all((space.locations ?? []).map(mapLocation)),
  };
}

export async function listSpaces(): Promise<SpaceView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spaces")
    .select(
      "id,name,image_path,image_width,image_height,created_at,locations(id,name,x_ratio,y_ratio,items(id,name,image_path,expire_date,status))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all(((data ?? []) as unknown as RawSpace[]).map(mapSpace));
}

export async function getSpace(spaceId: string): Promise<SpaceView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spaces")
    .select(
      "id,name,image_path,image_width,image_height,created_at,locations(id,name,x_ratio,y_ratio,items(id,name,image_path,expire_date,status))",
    )
    .eq("id", spaceId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSpace(data as unknown as RawSpace) : null;
}

export async function getRecentItems(limit = 8): Promise<RecentItemView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id,name,image_path,expire_date,status,created_at,location:locations(name,space:spaces(name))")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as unknown as RawRecentItem[];
  return Promise.all(rows.map(async (row): Promise<RecentItemView> => ({
    id: row.id,
    name: row.name,
    imagePath: row.image_path,
    imageUrl: await createSignedImageUrl("item-images", row.image_path),
    expireDate: row.expire_date,
    status: row.status,
    createdAt: row.created_at,
    location: row.location,
  })));
}

export async function getDashboardStats() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return { activeCount: 0, expiringSoonCount: 0 };

  const { data: settings } = await supabase
    .from("user_settings")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  const { localDateInTimeZone, addShelfLife } = await import("@/lib/date");
  const today = localDateInTimeZone(settings?.timezone || "UTC");
  const horizon = addShelfLife(today, 7, "DAY");

  const [{ count: activeCount }, { count: expiringSoonCount }] = await Promise.all([
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE"),
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .gte("expire_date", today)
      .lte("expire_date", horizon),
  ]);

  return {
    activeCount: activeCount ?? 0,
    expiringSoonCount: expiringSoonCount ?? 0,
  };
}
