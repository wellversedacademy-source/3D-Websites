// The bag. Local-only until a commerce provider is connected.
//
// Lines are stored on this device (localStorage) and survive reloads. Nothing
// here takes payment or creates an order. Checkout is disabled in the UI until
// provider.ts reports a live checkout.

import { getProduct, parseVariantId } from './catalog';

export type Line = { variantId: string; quantity: number };
type Listener = (lines: Line[]) => void;

const KEY = 'liq.bag.v1';
export const MAX_QTY = 5;

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    s.setItem('liq.t', '1');
    s.removeItem('liq.t');
    return s;
  } catch {
    return null;
  }
}

export class Bag {
  private lines: Line[] = [];
  private listeners = new Set<Listener>();
  constructor(private store: Storage | null = typeof window === 'undefined' ? null : safeStorage()) {
    this.lines = this.read();
  }

  private read(): Line[] {
    if (!this.store) return [];
    try {
      const raw = JSON.parse(this.store.getItem(KEY) ?? '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((l): l is Line => typeof l?.variantId === 'string' && Number.isInteger(l?.quantity))
        .filter((l) => parseVariantId(l.variantId) && l.quantity > 0)
        .map((l) => ({ variantId: l.variantId, quantity: Math.min(l.quantity, MAX_QTY) }));
    } catch {
      return [];
    }
  }

  private write() {
    try {
      this.store?.setItem(KEY, JSON.stringify(this.lines));
    } catch {
      /* storage full or blocked: the bag still works for this visit */
    }
    const snapshot = this.all();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  all(): Line[] {
    return this.lines.map((l) => ({ ...l }));
  }

  count(): number {
    return this.lines.reduce((n, l) => n + l.quantity, 0);
  }

  add(variantId: string, quantity = 1): void {
    const parsed = parseVariantId(variantId);
    if (!parsed || !getProduct(parsed.handle)) throw new Error(`Unknown variant: ${variantId}`);
    const existing = this.lines.find((l) => l.variantId === variantId);
    if (existing) existing.quantity = Math.min(existing.quantity + quantity, MAX_QTY);
    else this.lines.push({ variantId, quantity: Math.min(quantity, MAX_QTY) });
    this.write();
  }

  setQuantity(variantId: string, quantity: number): void {
    const line = this.lines.find((l) => l.variantId === variantId);
    if (!line) return;
    if (quantity <= 0) this.lines = this.lines.filter((l) => l !== line);
    else line.quantity = Math.min(Math.floor(quantity), MAX_QTY);
    this.write();
  }

  remove(variantId: string): void {
    this.setQuantity(variantId, 0);
  }

  clear(): void {
    this.lines = [];
    this.write();
  }

  /** Re-read storage after another tab changed it. Notifies without writing. */
  reload(): void {
    this.lines = this.read();
    const snapshot = this.all();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

let shared: Bag | null = null;
export function bag(): Bag {
  if (!shared) {
    shared = new Bag();
    // Keep several open tabs in step.
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) shared?.reload();
    });
  }
  return shared;
}
