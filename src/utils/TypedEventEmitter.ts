type EventHandler<T> = (data: T) => void;

export class TypedEventEmitter<TEvents extends Record<string, any>> {
  private listeners = new Map<keyof TEvents, Set<EventHandler<any>>>();

  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    const wrapper: EventHandler<TEvents[K]> = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    return this.on(event, wrapper);
  }

  off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
