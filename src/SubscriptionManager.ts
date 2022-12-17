export type EventSubscription<A> = (a: A) => void

export type Event = string

export class SubscriptionManager {

    private subscribers: { [key: Event]: EventSubscription<any>[] } = {}

    private ensureEventExists(event: Event) {
        event = event.toLowerCase()

        if (!(event in this.subscribers)) {
            this.subscribers[event] = []
        }
    }

    public addSubscription<A>(event: Event, callback: EventSubscription<A>) {
        event = event.toLowerCase()
        this.ensureEventExists(event)

        this.subscribers[event].push(callback)
    }

    public dispatch<A>(event: Event, value: A) {
        event = event.toLowerCase()
        this.ensureEventExists(event)

        this.subscribers[event].forEach(callback => callback(value))
    }
}
