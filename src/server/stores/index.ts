import type { RunStore } from "@/server/stores/runStore";
import type { AggregateStore } from "@/server/stores/aggregateStore";
import { InMemoryRunStore } from "@/server/stores/runStore";
import { InMemoryAggregateStore } from "@/server/stores/aggregateStore";
import { SupabaseRunStore } from "@/server/stores/supabaseRunStore";
import { SupabaseAggregateStore } from "@/server/stores/supabaseAggregateStore";
import { hasSupabase } from "@/server/stores/supabaseClient";

let runStoreInstance: RunStore;
let aggregateStoreInstance: AggregateStore;

function getRunStore(): RunStore {
  if (!runStoreInstance) {
    runStoreInstance = hasSupabase()
      ? new SupabaseRunStore()
      : new InMemoryRunStore();
  }
  return runStoreInstance;
}

function getAggregateStore(): AggregateStore {
  if (!aggregateStoreInstance) {
    aggregateStoreInstance = hasSupabase()
      ? new SupabaseAggregateStore()
      : new InMemoryAggregateStore();
  }
  return aggregateStoreInstance;
}

export const runStore = getRunStore();
export const aggregateStore = getAggregateStore();
