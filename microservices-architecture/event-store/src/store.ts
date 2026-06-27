import {
  DomainEvent,
  EventEnvelope,
  EventStream,
  Subscription,
  EventType,
  EventMetadata,
  now,
  generateId,
} from '@microservices/shared';

interface StoredStream {
  streamId: string;
  aggregateType: string;
  aggregateId: string;
  currentVersion: number;
  events: EventEnvelope[];
  createdAt: number;
  updatedAt: number;
}

export class EventStore {
  private streams: Map<string, StoredStream> = new Map();
  private allEvents: EventEnvelope[] = [];
  private subscriptions: Map<string, Subscription> = new Map();
  private subscribersByType: Map<EventType, Set<string>> = new Map();
  private globalPositionCounter = 0;

  // ─── Event Writing ─────────────────────────────────────────────────────

  /**
   * Append events to a stream with optimistic concurrency.
   * @param aggregateType - e.g. 'user', 'order', 'payment'
   * @param aggregateId - unique aggregate identifier
   * @param events - domain events to append
   * @param expectedVersion - current version for optimistic concurrency check
   * @returns the updated stream
   */
  appendToStream(
    aggregateType: string,
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion?: number
  ): { stream: EventStream; success: boolean; error?: string } {
    const streamId = this.makeStreamId(aggregateType, aggregateId);
    let stream = this.streams.get(streamId);

    // Create stream if not exists
    if (!stream) {
      if (expectedVersion !== undefined && expectedVersion !== 0) {
        return { stream: null as any, success: false, error: `Stream not found, but expected version ${expectedVersion}` };
      }
      stream = {
        streamId,
        aggregateType,
        aggregateId,
        currentVersion: 0,
        events: [],
        createdAt: now(),
        updatedAt: now(),
      };
      this.streams.set(streamId, stream);
    }

    // Optimistic concurrency check
    if (expectedVersion !== undefined && stream.currentVersion !== expectedVersion) {
      return {
        stream: null as any,
        success: false,
        error: `Concurrency conflict: expected version ${expectedVersion}, actual ${stream.currentVersion}`,
      };
    }

    const timestamp = now();
    const envelopes: EventEnvelope[] = events.map((event, index) => {
      this.globalPositionCounter++;
      return {
        ...event,
        streamId,
        streamPosition: stream!.currentVersion + index + 1,
        globalPosition: this.globalPositionCounter,
        timestamp: event.timestamp || timestamp,
        metadata: event.metadata,
      };
    });

    stream.events.push(...envelopes);
    stream.currentVersion += envelopes.length;
    stream.updatedAt = timestamp;
    this.allEvents.push(...envelopes);

    // Notify subscribers
    this.deliverEvents(envelopes);

    return {
      stream: this.toPublicStream(stream),
      success: true,
    };
  }

  // ─── Event Reading ────────────────────────────────────────────────────

  /** Read a single stream by aggregate */
  readStream(aggregateType: string, aggregateId: string): EventStream | null {
    const streamId = this.makeStreamId(aggregateType, aggregateId);
    const stream = this.streams.get(streamId);
    return stream ? this.toPublicStream(stream) : null;
  }

  /** Read events from a stream starting at a given position */
  readStreamEvents(
    aggregateType: string,
    aggregateId: string,
    fromPosition: number = 1,
    limit: number = 100
  ): EventEnvelope[] {
    const stream = this.readStream(aggregateType, aggregateId);
    if (!stream) return [];
    return stream.events
      .filter(e => e.streamPosition >= fromPosition)
      .slice(0, limit);
  }

  /** Read all events globally (for projections) */
  readAllEvents(fromGlobalPosition: number = 1, limit: number = 100): EventEnvelope[] {
    return this.allEvents
      .filter(e => e.globalPosition >= fromGlobalPosition)
      .slice(0, limit);
  }

  /** Get events of specific types (for subscribers) */
  readEventsByType(
    eventTypes: EventType[],
    fromGlobalPosition: number = 1,
    limit: number = 100
  ): EventEnvelope[] {
    const typeSet = new Set(eventTypes);
    return this.allEvents
      .filter(e => typeSet.has(e.eventType) && e.globalPosition >= fromGlobalPosition)
      .slice(0, limit);
  }

  /** Get all streams */
  getAllStreams(): EventStream[] {
    return Array.from(this.streams.values()).map(s => this.toPublicStream(s));
  }

  // ─── Subscription Management ─────────────────────────────────────────

  createSubscription(
    subscriberName: string,
    eventTypes: EventType[],
    callbackUrl: string
  ): Subscription {
    const id = generateId();
    const subscription: Subscription = {
      id,
      subscriberName,
      eventTypes,
      callbackUrl,
      createdAt: now(),
    };

    this.subscriptions.set(id, subscription);
    for (const eventType of eventTypes) {
      if (!this.subscribersByType.has(eventType)) {
        this.subscribersByType.set(eventType, new Set());
      }
      this.subscribersByType.get(eventType)!.add(id);
    }

    return subscription;
  }

  removeSubscription(subscriptionId: string): boolean {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return false;

    for (const eventType of sub.eventTypes) {
      this.subscribersByType.get(eventType)?.delete(subscriptionId);
    }
    this.subscriptions.delete(subscriptionId);
    return true;
  }

  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  // ─── Statistics ──────────────────────────────────────────────────────

  getStats(): {
    totalStreams: number;
    totalEvents: number;
    totalSubscriptions: number;
    currentGlobalPosition: number;
    eventsByType: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    for (const event of this.allEvents) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    }

    return {
      totalStreams: this.streams.size,
      totalEvents: this.allEvents.length,
      totalSubscriptions: this.subscriptions.size,
      currentGlobalPosition: this.globalPositionCounter,
      eventsByType,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────

  private makeStreamId(aggregateType: string, aggregateId: string): string {
    return `${aggregateType}:${aggregateId}`;
  }

  private toPublicStream(stream: StoredStream): EventStream {
    return {
      streamId: stream.streamId,
      aggregateType: stream.aggregateType,
      aggregateId: stream.aggregateId,
      currentVersion: stream.currentVersion,
      events: [...stream.events],
      createdAt: stream.createdAt,
      updatedAt: stream.updatedAt,
    };
  }

  private deliverEvents(envelopes: EventEnvelope[]): void {
    for (const envelope of envelopes) {
      const subscriberIds = this.subscribersByType.get(envelope.eventType);
      if (!subscriberIds) continue;

      for (const subId of subscriberIds) {
        const sub = this.subscriptions.get(subId);
        if (!sub) continue;

        // Fire-and-forget delivery to subscriber
        this.deliverToSubscriber(sub, envelope).catch(err => {
          console.error(`[EventStore] Failed to deliver event ${envelope.eventId} to ${sub.subscriberName}:`, err.message);
        });
      }
    }
  }

  private async deliverToSubscriber(subscription: Subscription, event: EventEnvelope): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(subscription.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          subscriptionId: subscription.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[EventStore] Subscriber ${subscription.subscriberName} returned ${response.status}`);
      }
    } catch (err) {
      console.error(`[EventStore] Subscriber ${subscription.subscriberName} unreachable at ${subscription.callbackUrl}`);
    }
  }
}
