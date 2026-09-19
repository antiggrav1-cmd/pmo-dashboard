import { loadPortfolios, savePortfolios, resetToDefaultData } from "../utils/storage";
import { normalizePortfolio } from "../models/projectModel";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

const TABLE_NAME = "pmo_portfolios";

/**
 * Portfolio Repository - abstracts storage layer (LocalStorage / Supabase Cloud Realtime)
 */
export const portfolioRepository = {
  /**
   * Synchronously loads local cache (for instant startup)
   */
  getAllLocal() {
    try {
      const raw = loadPortfolios();
      if (!Array.isArray(raw)) {
        return [];
      }
      return raw.map(normalizePortfolio);
    } catch (e) {
      console.error("Error loading portfolios from storage:", e);
      return [];
    }
  },

  getAll() {
    return this.getAllLocal();
  },

  /**
   * Asynchronously fetches all portfolios from Supabase Cloud
   */
  async fetchAllFromCloud() {
    if (!isSupabaseConfigured || !supabase) {
      return this.getAllLocal();
    }

    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Error fetching from Supabase:", error);
        return this.getAllLocal();
      }

      if (!data) {
        return [];
      }

      const normalized = data.map((item) =>
        normalizePortfolio({
          id: item.id,
          name: item.name,
          code: item.code,
          atc: item.atc || item.atcResponsible || "Sin Asignar",
          description: item.description,
          projects: item.projects || []
        })
      );

      // Keep localStorage in sync with cloud
      savePortfolios(normalized);
      return normalized;
    } catch (e) {
      console.error("Exception fetching portfolios from Supabase:", e);
      return this.getAllLocal();
    }
  },

  /**
   * Persists all portfolios locally and to Supabase Cloud
   */
  async saveAll(portfolios = []) {
    try {
      const normalized = portfolios.map(normalizePortfolio);
      // 1. Instant local persistence
      savePortfolios(normalized);

      // 2. Cloud persistence
      if (isSupabaseConfigured && supabase) {
        if (normalized.length === 0) return true;

        const rows = normalized.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code || "PORT-01",
          atc: p.atc || "Sin Asignar",
          description: p.description || "",
          projects: p.projects || [],
          updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from(TABLE_NAME)
          .upsert(rows, { onConflict: "id" });

        if (error) {
          console.error("Error upserting to Supabase:", error);
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error("Error saving portfolios:", e);
      return false;
    }
  },

  /**
   * Persists a single portfolio to Supabase Cloud
   */
  async saveSinglePortfolio(portfolio) {
    const normalized = normalizePortfolio(portfolio);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from(TABLE_NAME).upsert({
          id: normalized.id,
          name: normalized.name,
          code: normalized.code || "PORT-01",
          atc: normalized.atc || "Sin Asignar",
          description: normalized.description || "",
          projects: normalized.projects || [],
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error saving single portfolio to Supabase:", err);
      }
    }
  },

  /**
   * Deletes a portfolio from Supabase Cloud
   */
  async deleteFromCloud(portfolioId) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from(TABLE_NAME).delete().eq("id", portfolioId);
        if (error) console.error("Error deleting portfolio from Supabase:", error);
        else console.log(`Deleted portfolio ${portfolioId} from Supabase Cloud.`);
      } catch (err) {
        console.error("Error deleting portfolio from Supabase:", err);
      }
    }
  },

  /**
   * Resets local data
   */
  resetLocal() {
    const defaults = resetToDefaultData();
    return defaults.map(normalizePortfolio);
  },

  reset() {
    return this.resetLocal();
  }
};
