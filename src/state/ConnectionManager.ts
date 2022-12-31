import {Messages} from "../common/Messages";
import {StateManager} from "../StateManager";
import {Event, EventSubscription, SubscriptionManager} from "../SubscriptionManager";
import {References} from "../References";
import {ChatHelper} from "../utilities/ChatHelper";

export class ConnectionManager implements StateManager {

    private connected: boolean = false

    private subscriptions: SubscriptionManager = new SubscriptionManager()

    public initialize() {
        this.listen()
        this.autoReconnect()
    }

    public subscribe<A> (event: Event, a: EventSubscription<A>) {
        this.subscriptions.addSubscription(event, a)
    }

    public isConnected(): boolean {
        return this.connected
    }

    public busy = false
    public connect() {
        this.busy = true
        References.messageBus.send(
            Messages.Channels.SOCKET,
            Messages.Commands.Socket.CONNECT
        )
        setTimeout(() => {
            this.busy = false;
            this.subscriptions.dispatch("busy", this.busy)
        }, 5 * 1000)
    }
    public disconnect() {
        this.busy = true
        this.dontReconnect = true
        References.messageBus.send(
            Messages.Channels.SOCKET,
            Messages.Commands.Socket.DISCONNECT
        )
    }

    private listen() {
        References.messageBus.on(Messages.Channels.SOCKET, (arg) => {
            this.busy = false

            switch (arg) {
                case Messages.Commands.Socket.CONNECTED:
                    if (!this.connected) {
                        this.connected = true
                        this.disconnected = false
                        this.dontReconnect = false
                        References.chatManager.add(ChatHelper.makeBotChat("Connected!"))
                        this.subscriptions.dispatch("connected", this.connected)
                    }
                    break
                case Messages.Commands.Socket.DISCONNECTED:
                    if (this.connected) {
                        this.connected = false
                        this.disconnected = true
                        References.chatManager.add(ChatHelper.makeBotChat("Disconnected!"))
                        this.subscriptions.dispatch("connected", this.connected)
                    }
                    break
                case Messages.Commands.Socket.TIMEOUT:
                    this.connected = false
                    this.disconnected = true
                    References.chatManager.add(ChatHelper.makeBotChat("Connection timed out!"))
                    this.subscriptions.dispatch("connected", this.connected)
                    break
            }

            this.subscriptions.dispatch("busy", this.busy)
        })
    }

    private disconnected = false
    private dontReconnect = true
    private autoReconnect() {
        setTimeout(() => {
            setInterval(() => {
                if (this.dontReconnect ||
                    this.busy ||
                    !this.disconnected ||
                    this.connected ||
                    !References.settingsManager.getSettings().autoReconnect) return

                References.chatManager.add(ChatHelper.makeBotChat("Connecting..."))
                this.connect()
            }, 1000)
        }, 0)
    }
}
