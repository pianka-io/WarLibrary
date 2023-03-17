import {User} from "./UserManager"
import {Messages} from "../common/Messages";
import {Protocols} from "../common/Protocols";
import {StateManager} from "../StateManager";
import {Event, EventSubscription, SubscriptionManager} from "../SubscriptionManager";
import {References} from "../References";
import {ProtocolHelper} from "../utilities/ProtocolHelper";

export type Channel = {
    name: string,
    topic: string | null,
    users: number | null
}

export class ChannelManager implements StateManager {
    private currentChannel: Channel = {name: "", topic: "undefined", users: 0}
    private channels: Channel[] = []

    private subscriptions: SubscriptionManager = new SubscriptionManager()

    public initialize() {
        this.listen()
    }

    public subscribe<A> (event: Event, a: EventSubscription<A>) {
        this.subscriptions.addSubscription(event, a)
    }

    private listen() {
        References.connectionManager.subscribe("connected", () => {
            this.channels = [];
            this.subscriptions.dispatch("list", this.channels)
        })
        References.userManager.subscribe((users: User[]) => {
            if (this.currentChannel != undefined && this.channels.length > 0 && users.length > 0) {
                this.currentChannel.users = users.length
                let channel = this.channels.filter((c) => c.name == this.currentChannel.name)[0]
                if (channel) {
                    channel.users = users.length
                    this.subscriptions.dispatch("current", this.currentChannel)
                    this.subscriptions.dispatch("list", this.channels)
                }
            }
        })

        setInterval(() => {
            if (!References.chatManager.isListingChannels() && References.profileManager.getProfile().init6) {
                References.messageBus.send("chat", "/channels")
            }
        }, 60*1000)

        References.messageBus.on(Messages.Channels.MESSAGES, (arg) => {
            let string = arg as string
            let messages = string.split("\r\n")

            messages.forEach((message) => {
                if (message.trim().length == 0) return

                let fields = message.split(" ")
                let code = fields[0]
                let innerMessage: string = ""

                // classic telnet
                switch (code) {
                    case Protocols.Classic.CHANNEL:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        this.currentChannel = {
                            name: innerMessage,
                            topic: "",
                            users: 0
                        }
                        this.subscriptions.dispatch("current", this.currentChannel)
                        if (innerMessage.toLowerCase() == References.profileManager.getProfile().home.toLowerCase() &&
                            !References.chatManager.isListingChannels()) {
                            References.messageBus.send("chat", "/channels")
                        }
                        return
                    case Protocols.Classic.INFO:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        if (innerMessage.startsWith("Listing ")) {
                            this.channels = []
                        } else if ((innerMessage.match(/\| /g) || []).length == 3) {
                            let tokens = innerMessage.split("|")
                            let name = tokens[0].trim()

                            if (this.channels.findIndex(c => c.name == name) > -1) return

                            this.channels.push({
                                name: tokens[0].trim(),
                                topic: tokens[3].trim(),
                                users: Number(tokens[1].trim())
                            })
                            this.subscriptions.dispatch("list", this.channels)
                        }
                        return
                }

                // init 6 proprietary
                const event = () => fields[1]

                switch (code) {
                    case Protocols.Init6.Commands.CHANNEL:
                        switch (event()) {
                            case Protocols.Init6.Events.JOIN:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                this.currentChannel = {
                                    name: innerMessage,
                                    topic: "",
                                    users: 0
                                }
                                this.subscriptions.dispatch("current", this.currentChannel)
                                if (innerMessage.toLowerCase() == References.profileManager.getProfile().home.toLowerCase() &&
                                    !References.chatManager.isListingChannels()) {
                                    References.messageBus.send("chat", "/channels")
                                }
                                break
                        }
                        break
                    case Protocols.Init6.Commands.SERVER:
                        switch (event()) {
                            case Protocols.Init6.Events.INFO:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                if (innerMessage.startsWith("Listing ")) {
                                    this.channels = []
                                } else if ((innerMessage.match(/\| /g) || []).length == 3) {
                                    let tokens = innerMessage.split("|")
                                    let name = tokens[0].trim()

                                    if (this.channels.findIndex(c => c.name == name) > -1) return

                                    this.channels.push({
                                        name: tokens[0].trim(),
                                        topic: tokens[3].trim(),
                                        users: Number(tokens[1].trim())
                                    })
                                    this.subscriptions.dispatch("list", this.channels)
                                }
                                break
                        }
                        break
                }
            })
        })
    }
}
