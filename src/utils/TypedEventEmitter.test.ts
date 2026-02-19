import { describe, it, expect, vi } from 'vitest';
import { TypedEventEmitter } from './TypedEventEmitter';

interface TestEvents {
  message: { text: string };
  count: { value: number };
  empty: void;
}

describe('TypedEventEmitter', () => {
  it('should emit and receive events', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();

    emitter.on('message', handler);
    emitter.emit('message', { text: 'hello' });

    expect(handler).toHaveBeenCalledWith({ text: 'hello' });
  });

  it('should support multiple listeners for the same event', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on('message', handler1);
    emitter.on('message', handler2);
    emitter.emit('message', { text: 'hello' });

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should remove listener with off()', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();

    emitter.on('message', handler);
    emitter.off('message', handler);
    emitter.emit('message', { text: 'hello' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should support once() for single-fire listeners', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();

    emitter.once('message', handler);
    emitter.emit('message', { text: 'first' });
    emitter.emit('message', { text: 'second' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ text: 'first' });
  });

  it('should handle void events', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();

    emitter.on('empty', handler);
    emitter.emit('empty', undefined as any);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should not interfere between different event types', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const messageHandler = vi.fn();
    const countHandler = vi.fn();

    emitter.on('message', messageHandler);
    emitter.on('count', countHandler);
    emitter.emit('message', { text: 'hello' });

    expect(messageHandler).toHaveBeenCalledOnce();
    expect(countHandler).not.toHaveBeenCalled();
  });

  it('should removeAllListeners for a specific event', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on('message', handler1);
    emitter.on('message', handler2);
    emitter.removeAllListeners('message');
    emitter.emit('message', { text: 'hello' });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should removeAllListeners for all events', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const messageHandler = vi.fn();
    const countHandler = vi.fn();

    emitter.on('message', messageHandler);
    emitter.on('count', countHandler);
    emitter.removeAllListeners();
    emitter.emit('message', { text: 'hello' });
    emitter.emit('count', { value: 1 });

    expect(messageHandler).not.toHaveBeenCalled();
    expect(countHandler).not.toHaveBeenCalled();
  });

  it('should return unsubscribe function from on()', () => {
    const emitter = new TypedEventEmitter<TestEvents>();
    const handler = vi.fn();

    const unsub = emitter.on('message', handler);
    unsub();
    emitter.emit('message', { text: 'hello' });

    expect(handler).not.toHaveBeenCalled();
  });
});
