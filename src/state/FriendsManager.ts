import {StateManager} from "../StateManager";
import {Event, EventSubscription, SubscriptionManager} from "../SubscriptionManager";
import {References} from "../References";
import {Messages} from "../common/Messages";
import {Protocols} from "../common/Protocols";
import {FriendsHelper} from "../utilities/FriendsHelper";
import {ProtocolHelper} from "../utilities/ProtocolHelper";

export type Friend = {
    name: string,
    online: boolean,
    server: string | null,
    client: string | null,
    channel: string | null,
    position: number | null
}

export type Error =
    "maximum"   |
    "empty"     |
    "username"  |
    "yourself"  |
    "exists"    |
    "missing"

export type Result = {
    action: "add" | "remove" | "list",
    success: boolean,
    user: string | null,
    error: Error | null
}

export class FriendsManager implements StateManager {
    private friends: Friend[] = []

    private subscriptions: SubscriptionManager = new SubscriptionManager()

    public initialize() {
        this.listen()
    }

    public subscribe<A>(event: Event, a: EventSubscription<A>) {
        this.subscriptions.addSubscription(event, a)
    }

    public list() {
        References.messageBus.send("chat", "/friends list")
    }

    public addFriend(name: string) {
        References.messageBus.send("chat", "/friends add " + name)
    }

    public removeFriend(name: string) {
        References.messageBus.send("chat", "/friends remove " + name)
    }

    public getFriends() {
        return this.friends
    }

    public hasFriend(username: string) {
        if (username == "All Friends") return true
        return !!this.friends.find((f) => f.name.toLowerCase() === username.toLowerCase())
    }

    private listen() {
        setInterval(() => this.list(), 30*1000)

        References.messageBus.on(Messages.Channels.MESSAGES, (arg) => {

            let string = arg as string
            let messages = string.split("\r\n")

            messages.forEach((message) => {
                if (message.trim().length == 0) return

                let fields = message.split(" ")
                let code = fields[0]
                let innerMessage: string

                // classic telnet
                switch (code) {
                    case Protocols.Classic.CHANNEL:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        if (innerMessage.toLowerCase() == References.profileManager.getProfile().home.toLowerCase()) {
                            this.list()
                        }
                        return
                    case Protocols.Classic.INFO:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        this.handleMessage(innerMessage)
                        return
                    case Protocols.Classic.ERROR:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        this.handleMessage(innerMessage)
                        return
                }

                // init 6 proprietary
                const event = () => fields[1]

                switch (code) {
                    case Protocols.Init6.Commands.CHANNEL:
                        switch (event()) {
                            case Protocols.Init6.Events.JOIN:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                if (innerMessage.toLowerCase() == References.profileManager.getProfile().home.toLowerCase()) {
                                    this.list()
                                }
                                break
                        }
                        break
                    case Protocols.Init6.Commands.SERVER:
                        switch (event()) {
                            case Protocols.Init6.Events.INFO:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                this.handleMessage(innerMessage)
                                break
                            case Protocols.Init6.Events.ERROR:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                this.handleMessage(innerMessage)
                                break
                        }
                }
            })
        })
    }

    private handleMessage(message: string) {
        // incoming list
        if (FriendsHelper.header(message)) {
            this.friends = []
            this.subscriptions.dispatch("list", this.friends)
        // friend list item
        } else if (FriendsHelper.friend(message)) {
            const friend = FriendsHelper.parseFriend(message)
            if (!this.hasFriend(friend.name)) {
                this.friends.push(friend)
                this.subscriptions.dispatch("list", this.friends)
            }
        // successes
        } else if (FriendsHelper.addedFriend(message)) {
            const success: Result = {
                success: true,
                action: "add",
                user: message[1],
                error: null
            }
            this.subscriptions.dispatch("result", success)
            this.list()
        } else if (FriendsHelper.removedFriend(message)) {
            const success: Result = {
                success: true,
                action: "remove",
                user: message[1],
                error: null
            }
            this.subscriptions.dispatch("result", success)
            this.list()
        // errors
        } else if (FriendsHelper.addMaximumReached(message)) {
            const error: Result = {
                success: false,
                action: "add",
                user: null,
                error: "maximum",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.addNoUsername(message)) {
            const error: Result = {
                success: false,
                action: "add",
                user: null,
                error: "username",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.addNoYourself(message)) {
            const error: Result = {
                success: false,
                action: "add",
                user: null,
                error: "yourself",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.noFriends(message)) {
            const error: Result = {
                success: false,
                action: "list",
                user: null,
                error: "empty",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.removeNoUsername(message)) {
            const error: Result = {
                success: false,
                action: "remove",
                user: null,
                error: "username",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.removeNotAdded(message)) {
            const error: Result = {
                success: false,
                action: "remove",
                user: null,
                error: "missing",
            }
            this.subscriptions.dispatch("result", error)
        }
    }
}
