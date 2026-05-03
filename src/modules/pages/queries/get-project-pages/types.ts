/**
 * Types for get-project-pages query.
 */
import type { Page } from "@prisma/client";

/** A page node with its nested children (recursive tree structure). */
export type PageWithChildren = Page & { children: PageWithChildren[] };

/** Flat page row shape used by fetch-flat-pages step. Full Prisma Page record. */
export type FlatPage = Page;
