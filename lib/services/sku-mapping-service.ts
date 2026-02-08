/**
 * SKU Mapping Service
 *
 * Provides cached lookup of Shopify SKUs to ChoreGami plan types.
 * Cache is loaded on first use and refreshed on admin updates.
 *
 * ~80 lines
 */

import { getServiceSupabaseClient } from "../supabase.ts";

export interface SKUMapping {
  id: string;
  sku: string;
  plan_type: string;
  duration_months: number;
  product_name: string;
  price_cents: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Module-level cache
let skuCache: Map<string, SKUMapping> | null = null;
let cacheLoadedAt: Date | null = null;

/**
 * Load SKU mappings from database into cache
 */
async function loadCache(): Promise<Map<string, SKUMapping>> {
  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("shopify_sku_mappings")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to load SKU mappings:", error);
    throw error;
  }

  const cache = new Map<string, SKUMapping>();
  for (const mapping of data || []) {
    cache.set(mapping.sku, mapping);
  }

  console.log(`📦 Loaded ${cache.size} SKU mappings into cache`);
  return cache;
}

/**
 * Get SKU mapping by SKU code
 * Loads cache on first call
 */
export async function getSKUMapping(sku: string): Promise<SKUMapping | null> {
  if (!skuCache) {
    skuCache = await loadCache();
    cacheLoadedAt = new Date();
  }
  return skuCache.get(sku) || null;
}

/**
 * Get plan type for a SKU (convenience function for webhook)
 */
export async function getPlanTypeForSKU(sku: string): Promise<string | null> {
  const mapping = await getSKUMapping(sku);
  return mapping?.plan_type || null;
}

/**
 * Get duration in months for a SKU
 */
export async function getDurationForSKU(sku: string): Promise<number | null> {
  const mapping = await getSKUMapping(sku);
  return mapping?.duration_months || null;
}

/**
 * Refresh the cache (called by admin API after updates)
 */
export async function refreshSKUCache(): Promise<void> {
  skuCache = await loadCache();
  cacheLoadedAt = new Date();
  console.log("🔄 SKU cache refreshed");
}

/**
 * Get all active SKU mappings (for admin UI)
 */
export async function getAllSKUMappings(): Promise<SKUMapping[]> {
  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("shopify_sku_mappings")
    .select("*")
    .order("duration_months", { ascending: true });

  if (error) {
    console.error("Failed to fetch SKU mappings:", error);
    throw error;
  }

  return data || [];
}

/**
 * Add a new SKU mapping
 */
export async function addSKUMapping(mapping: {
  sku: string;
  plan_type: string;
  duration_months: number;
  product_name: string;
  price_cents?: number;
  description?: string;
}): Promise<SKUMapping> {
  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("shopify_sku_mappings")
    .insert(mapping)
    .select()
    .single();

  if (error) {
    console.error("Failed to add SKU mapping:", error);
    throw error;
  }

  // Refresh cache after insert
  await refreshSKUCache();

  return data;
}

/**
 * Update an existing SKU mapping
 */
export async function updateSKUMapping(
  id: string,
  updates: Partial<Omit<SKUMapping, "id" | "created_at" | "updated_at">>
): Promise<SKUMapping> {
  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("shopify_sku_mappings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update SKU mapping:", error);
    throw error;
  }

  // Refresh cache after update
  await refreshSKUCache();

  return data;
}

/**
 * Delete a SKU mapping (hard delete)
 */
export async function deleteSKUMapping(id: string): Promise<void> {
  const supabase = getServiceSupabaseClient();

  const { error } = await supabase
    .from("shopify_sku_mappings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete SKU mapping:", error);
    throw error;
  }

  // Refresh cache after delete
  await refreshSKUCache();
}

/**
 * Get cache status (for debugging/monitoring)
 */
export function getCacheStatus(): { loaded: boolean; size: number; loadedAt: Date | null } {
  return {
    loaded: skuCache !== null,
    size: skuCache?.size || 0,
    loadedAt: cacheLoadedAt,
  };
}
