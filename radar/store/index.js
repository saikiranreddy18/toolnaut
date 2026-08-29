import { config } from '../config.js'
import { createJsonStore } from './jsonStore.js'

// Store factory. Today it returns the JSON-file adapter; to move the pipeline
// onto Postgres/Supabase later, add an adapter with the same method surface
// (getTool, getToolByDomain, listTools, countTools, isKnown, markKnown,
// upsertTool, updateTool, enqueueReview, upsertCourse, upsertSkill, snapshot,
// appendRun) and select it here.
export function createStore() {
  return createJsonStore(config.dataDir)
}
