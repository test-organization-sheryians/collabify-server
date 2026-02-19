/**
 * WS Events barrel — re-exports each event's RouteDefinition object.
 * Used if something needs to reference individual event definitions directly.
 * The router.ts file imports these individually for the RouteMap.
 */
export { subscribePage } from "./subscribe-page";
export { unsubscribePage } from "./unsubscribe-page";
export { pageUpdate } from "./page-update";
export { awarenessUpdate } from "./awareness-update";
