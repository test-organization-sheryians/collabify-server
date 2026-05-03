import type { SearchEntity, SearchEntityType } from "@/graphql/generated";

export type { SearchEntity, SearchEntityType };

export interface GetProjectEntitiesResult {
  entities: SearchEntity[];
}
