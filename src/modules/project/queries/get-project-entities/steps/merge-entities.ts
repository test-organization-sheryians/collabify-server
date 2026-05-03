/**
 * Step: Merge Entities
 *
 * Transforms raw entity records into SearchEntity[] format.
 * All entities map to {id, type, name} — minimal payload for client-side search.
 */
import { SearchEntity, SearchEntityType } from "@/graphql/generated";

export interface RawEntities {
  pages: Array<{ id: string; title: string }>;
  issues: Array<{ id: string; title: string }>;
  vaultFiles: Array<{ id: string; name: string }>;
  vaultFolders: Array<{ id: string; name: string }>;
  whiteboards: Array<{ id: string; title: string }>;
  users: Array<{ id: string; fullName: string }>;
}

export function mergeEntities(raw: RawEntities): SearchEntity[] {
  const entities: SearchEntity[] = [];

  for (const page of raw.pages) {
    entities.push({ id: page.id, type: SearchEntityType.Page, name: page.title });
  }

  for (const issue of raw.issues) {
    entities.push({ id: issue.id, type: SearchEntityType.Issue, name: issue.title });
  }

  for (const file of raw.vaultFiles) {
    entities.push({ id: file.id, type: SearchEntityType.VaultFile, name: file.name });
  }

  for (const folder of raw.vaultFolders) {
    entities.push({ id: folder.id, type: SearchEntityType.VaultFolder, name: folder.name });
  }

  for (const board of raw.whiteboards) {
    entities.push({ id: board.id, type: SearchEntityType.Whiteboard, name: board.title });
  }

  for (const user of raw.users) {
    entities.push({ id: user.id, type: SearchEntityType.User, name: user.fullName });
  }

  return entities;
}
