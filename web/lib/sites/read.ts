import { cache } from "react";
import { getRepository } from "../storage/repository";

/**
 * Request-deduped site read. A public route renders the page AND builds its
 * SEO metadata in the same request, both of which need the site — React
 * `cache()` collapses those into a single database read per request.
 */
export const getSiteCached = cache((slug: string) => getRepository().then((r) => r.getSite(slug)));
