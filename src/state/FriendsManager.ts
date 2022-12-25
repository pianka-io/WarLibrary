import {StateManager} from "../StateManager";
import {Event, EventSubscription, SubscriptionManager} from "../SubscriptionManager";
import {References} from "../References";
import {Messages} from "../common/Messages";
import {Protocols} from "../common/Protocols";
import {FriendsHelper} from "../utilities/FriendsHelper";

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

    public addFriend(name: string) {
        References.messageBus.send("chat", "/friends add " + name)
    }

    public removeFriend(name: string) {
        References.messageBus.send("chat", "/friends remove " + name)
    }

    public getFriends() {
        return this.friends
    }

    private listen() {
        setInterval(() => {
            References.messageBus.send("chat", "/friends list")
        }, 60*1000)

        References.messageBus.on(Messages.Channels.MESSAGES, (arg) => {

            let string = arg as string
            let messages = string.split("\r\n")

            console.log(string)

            messages.forEach((message) => {
                if (message.trim().length == 0) return

                let fields = message.split(" ")
                let code = fields[0]

                // classic telnet
                switch (code) {
                    case Protocols.Classic.INFO:
                        this.handleMessage(fields.slice(2))
                        return // don't parse init 6
                }

                // init 6 proprietary
                const event = () => fields[1]

                switch (code) {
                    case Protocols.Init6.Commands.SERVER:
                        switch (event()) {
                            case Protocols.Init6.Events.INFO:
                                this.handleMessage(fields.slice(2))
                                break
                        }
                }
            })
        })
    }

    private handleMessage(message: string[]) {
        const stringified = message.join(" ").trim()

        // incoming list
        if (FriendsHelper.header(stringified)) {
            this.friends = []
            this.subscriptions.dispatch("list", this.friends)
        // friend list item
        } else if (FriendsHelper.friend(stringified)) {
            const friend = FriendsHelper.parseFriend(stringified)
            this.friends.push(friend)
            this.subscriptions.dispatch("list", this.friends)
        // successes
        } else if (FriendsHelper.addedFriend(stringified)) {
            const success: Result = {
                success: true,
                action: "add",
                user: message[1],
                error: null
            }
            this.subscriptions.dispatch("result", success)
            References.messageBus.send("chat", "/friends list")
        } else if (FriendsHelper.removedFriend(stringified)) {
            const success: Result = {
                success: true,
                action: "remove",
                user: message[1],
                error: null
            }
            this.subscriptions.dispatch("result", success)
            References.messageBus.send("chat", "/friends list")
        // errors
        } else if (FriendsHelper.addMaximumReached(stringified)) {
            const error: Result = {
                success: false,
                action: "add",
                user: null,
                error: "maximum",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.addNoUsername(stringified)) {
            const error: Result = {
                success: false,
                action: "add",
                user: null,
                error: "username",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.addNoYourself(stringified)) {
            const error: Result = {
                success: false,
                action: "add",
                user: null,
                error: "yourself",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.noFriends(stringified)) {
            const error: Result = {
                success: false,
                action: "list",
                user: null,
                error: "empty",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.removeNoUsername(stringified)) {
            const error: Result = {
                success: false,
                action: "remove",
                user: null,
                error: "username",
            }
            this.subscriptions.dispatch("result", error)
        } else if (FriendsHelper.removeNotAdded(stringified)) {
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
