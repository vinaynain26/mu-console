/**
 * MU CMS — the runtime half.
 *
 * `c(key, fallback)` is what the build-time plugin rewrites every piece of copy
 * into. It returns the CMS value when there is one and the original English
 * otherwise, so the site renders correctly even if the CMS is unreachable —
 * the content system can go down without taking the marketing site with it.
 *
 * Content is loaded once per request on the server and once per session in the
 * browser. Loading it in the root route's loader (rather than after mount)
 * means SSR and hydration see the same strings — otherwise React renders the
 * fallback, swaps to CMS copy, and you get a hydration mismatch plus a visible
 * flash of the wrong words.
 */
const store = new Map<string, string>();
let loaded = false;

/* On the server, one long-lived process renders every page, and a module
   singleton never forgets: after a few requests the store — and the JSON
   snapshot inlined into every response — holds the whole site's copy, not the
   page's. The server entry installs a provider backed by AsyncLocalStorage so
   each request reads and writes its own map. The browser keeps the singleton:
   one page, one session, one store. */
type StoreProvider = () => Map<string, string> | undefined;
let serverStoreProvider: StoreProvider | null = null;
export function setServerStoreProvider(provider: StoreProvider): void {
  serverStoreProvider = provider;
}
function getStore(): Map<string, string> {
  if (typeof document === "undefined" && serverStoreProvider) {
    const scoped = serverStoreProvider();
    if (scoped) return scoped;
  }
  return store;
}

export const CMS_URL =
  (import.meta as never as { env: Record<string, string> }).env?.VITE_MU_CMS_URL ||
  "http://localhost:4000";

/**
 * Copy for one page, plus the shared components every page uses.
 *
 * Returns the map as well as storing it. The return value matters: the server
 * fills this store during SSR, but the browser gets a fresh, empty module. Any
 * component that renders after hydration — and on this site plenty do — would
 * otherwise fall back to the original English even though the CMS has newer
 * copy. The loader hands what it fetched to the client, which seeds the store
 * before anything renders.
 */
export async function loadContent(pageSlug: string): Promise<Record<string, string>> {
  const wanted = [pageSlug, "shared"];
  const target = getStore();
  try {
    const results = await Promise.all(
      wanted.map((slug) =>
        fetch(`${CMS_URL}/api/public/content/${encodeURIComponent(slug)}`, {
          headers: { accept: "application/json" },
        })
          .then((r) => (r.ok ? r.json() : { fields: {} }))
          .catch(() => ({ fields: {} })),
      ),
    );
    for (const res of results) {
      for (const [k, v] of Object.entries(res.fields || {})) {
        if (typeof v === "string") target.set(k, v);
      }
    }
    loaded = true;
  } catch {
    // leave the store empty; every c() call falls back to its original text
  }
  return Object.fromEntries(target);
}

/** This request's copy as JSON, for inlining into the served HTML. */
export function snapshotContent(): string | null {
  const s = getStore();
  if (!s.size) return null;
  // only ever lands inside a <script type="application/json">, but a stray
  // "</script>" in the copy would still end the tag early
  return JSON.stringify(Object.fromEntries(s)).replace(/</g, "\\u003c");
}

/* In the browser, read that inlined copy the moment this module loads — before
   any component renders, so nothing ever sees the fallback when the CMS has
   something newer. */
if (typeof document !== "undefined") {
  try {
    const el = document.getElementById("__mu_content");
    if (el?.textContent) {
      for (const [k, v] of Object.entries(JSON.parse(el.textContent) as Record<string, string>)) {
        if (typeof v === "string") store.set(k, v);
      }
      loaded = true;
    }
  } catch {
    // malformed payload: fall back to the original English rather than crash
  }
}

export const isLoaded = () => loaded;

/* The inline editor is a plain script served by the CMS — it cannot import
   this module, so the pieces it needs ride on window. Browser only. */
if (typeof document !== "undefined") {
  (window as unknown as Record<string, unknown>).__MU_RUNTIME__ = {
    applyLocal: (k: string, v: string, silent?: boolean) => applyLocal(k, v, silent),
    version: () => version,
  };
}

/** Injected by the build. Never throws — a missing key returns the original. */
export function c(key: string, fallback: string): string {
  const v = getStore().get(key);
  return v === undefined || v === "" ? fallback : v;
}

/** Used by the inline editor after a save, so the page shows the new copy.
 *  `silent` keeps the store true without re-rendering — right for text the
 *  editor already patched into the DOM; structural writes re-render. */
export function applyLocal(key: string, value: string, silent = false): void {
  getStore().set(key, value);
  if (!silent) bump();
}

/* ------------------------------------------------------------------ *
 * collections
 *
 * `l(listKey, fallback)` is what the plugin wraps a module-level data array
 * into. The code's items stay the fallback; a structure row in the CMS —
 * JSON under the list's own key — reorders them, hides them, and adds items
 * born in the CMS whose every field lives under `<listKey>.<itemId>.<prop>`.
 *
 * The wrapper is a Proxy so the module-level const can keep existing at boot
 * without freezing anything: every read re-materialises (memoised per store
 * version), so SSR and the client — reading the same inlined snapshot —
 * always agree, and an editor's structural change re-renders live.
 * ------------------------------------------------------------------ */
type ListEntry = { id: string; src?: "cms"; hidden?: boolean };

/* Bumped on every editor write; React subscribes via useSyncExternalStore so
   structural edits re-render. Visitors never write, so this never fires. */
let version = 0;
const listeners = new Set<() => void>();
const bump = () => { version++; listeners.forEach((f) => f()); };
export const subscribeContent = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
export const contentVersion = () => version;

const listCache = new WeakMap<Map<string, string>, Map<string, { v: number; arr: unknown[] }>>();

export function l<T extends object>(
  listKey: string,
  fallback: T[],
  opts?: { map?: (x: T) => unknown },
): T[] {
  const materialise = (): unknown[] => {
    const s = getStore();
    let perStore = listCache.get(s);
    if (!perStore) listCache.set(s, (perStore = new Map()));
    const hit = perStore.get(listKey);
    if (hit && hit.v === version) return hit.arr;

    const byId = new Map<string, T>();
    for (const item of fallback) {
      const id = (item as Record<string, unknown>).__id;
      if (typeof id === "string") byId.set(id, item);
    }

    let entries: ListEntry[] | null = null;
    const raw = s.get(listKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { items?: ListEntry[] };
        if (Array.isArray(parsed.items)) entries = parsed.items;
      } catch { /* malformed structure: render the code's own list */ }
    }

    let ordered: T[];
    if (!entries) {
      ordered = [...fallback];
    } else {
      ordered = [];
      const placed = new Set<string>();
      for (const e of entries) {
        if (!e || typeof e.id !== "string") continue;
        placed.add(e.id);
        if (e.hidden) continue;
        if (e.src === "cms") ordered.push(cmsItem(listKey, e.id, fallback));
        else if (byId.has(e.id)) ordered.push(byId.get(e.id)!);
      }
      /* a code item the structure has never seen appends VISIBLE — a
         developer's new entry can never be silently hidden by stale
         editor state */
      for (const item of fallback) {
        const id = (item as Record<string, unknown>).__id;
        if (typeof id !== "string" || !placed.has(id)) ordered.push(item);
      }
    }

    const arr = opts?.map ? ordered.map((x) => opts.map!(x)) : ordered;
    perStore.set(listKey, { v: version, arr });
    return arr;
  };

  return new Proxy(fallback, {
    get: (_t, prop) => {
      const arr = materialise();
      const v = Reflect.get(arr, prop, arr);
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(arr) : v;
    },
    has: (_t, prop) => Reflect.has(materialise(), prop),
    ownKeys: () => Reflect.ownKeys(materialise()),
    getOwnPropertyDescriptor: (_t, prop) => {
      const d = Reflect.getOwnPropertyDescriptor(materialise(), prop);
      if (d) d.configurable = true;
      return d;
    },
  }) as T[];
}

/**
 * A derived list — `RAW.map(withSections)` — evaluated at module scope would
 * materialise the source Proxy once, at boot, and freeze it. This keeps the
 * derivation lazy: the map runs against the CURRENT list on every store
 * version, so structural edits flow through to the derived array too.
 */
export function muMapped<T extends object, U>(source: T[], fn: (x: T) => U): U[] {
  const cache = new WeakMap<Map<string, string>, { v: number; arr: U[] }>();
  const materialise = (): U[] => {
    const s = getStore();
    const hit = cache.get(s);
    if (hit && hit.v === version) return hit.arr;
    const arr = [...source].map(fn);
    cache.set(s, { v: version, arr });
    return arr;
  };
  return new Proxy([] as U[], {
    get: (_t, prop) => {
      const arr = materialise();
      const v = Reflect.get(arr, prop, arr);
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(arr) : v;
    },
    has: (_t, prop) => Reflect.has(materialise(), prop),
    ownKeys: () => Reflect.ownKeys(materialise()),
    getOwnPropertyDescriptor: (_t, prop) => {
      const d = Reflect.getOwnPropertyDescriptor(materialise(), prop);
      if (d) d.configurable = true;
      return d;
    },
  });
}

/* An item born in the CMS: every string field reads `<listKey>.<id>.<prop>`
   live; array-valued fields become child lists keyed `<listKey>.<id>:<prop>`.
   The first code item is the template for which props exist. */
/* A CMS-born item starts with no words of its own, but a picture slot with no
   picture is a broken image — an asset-valued prop keeps the template's file
   until an editor replaces it. */
const isAssetUrl = (s: string) => /\.(png|jpe?g|webp|svg|gif|avif|mp4|webm)(\?|#|$)/i.test(s);

function cmsItem<T extends object>(listKey: string, id: string, fallback: T[]): T {
  const tmpl = fallback[0] ?? ({} as T);
  const out: Record<string, unknown> = { __id: id, __cms: true };
  for (const prop of Object.keys(tmpl)) {
    if (prop === "__id") continue;
    const sample = (tmpl as Record<string, unknown>)[prop];
    if (Array.isArray(sample)) {
      const childKey = `${listKey}.${id}:${prop}`;
      const childTmpl = sample.filter((x) => x && typeof x === "object") as object[];
      Object.defineProperty(out, prop, {
        enumerable: true,
        configurable: true,
        get: () =>
          childTmpl.length
            ? l(childKey, childTmpl as object[]).filter((x) => (x as { __cms?: boolean }).__cms)
            : stringList(childKey),
      });
    } else {
      Object.defineProperty(out, prop, {
        enumerable: true,
        configurable: true,
        get: () => c(`${listKey}.${id}.${prop}`,
          typeof sample === "string" && !isAssetUrl(sample) ? "" : (sample as string)),
      });
    }
  }
  return out as T;
}

/* chips / proof on a CMS-born item: the structure row's ids double as the
   text field keys. */
function stringList(childKey: string): string[] {
  const raw = getStore().get(childKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { items?: ListEntry[] };
    return (parsed.items || [])
      .filter((e) => e && !e.hidden && typeof e.id === "string")
      .map((e) => c(`${childKey}.${e.id}`, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Merge two objects the way `{ ...a, ...b }` looks like it should, but without
 * destroying the plugin's lazy getters. A spread *invokes* every getter and
 * freezes the result into plain values — on the server that happens at module
 * boot, before any request has loaded content, so the merged object would
 * carry the original English forever (the React #418 mismatch). Copying
 * property descriptors keeps each `get x() { return __mu(…) }` deferred.
 */
export function muMerge<A extends object, B extends object>(a: A, b: B): A & B {
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(a),
      ...Object.getOwnPropertyDescriptors(b),
    },
  ) as A & B;
}
