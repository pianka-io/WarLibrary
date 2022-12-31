import {User} from "./UserManager"
import {Messages} from "../common/Messages";
import {Protocols} from "../common/Protocols";
import {Event, EventSubscription, SubscriptionManager} from "../SubscriptionManager";
import {References} from "../References";
import {ProtocolHelper} from "../utilities/ProtocolHelper";
import {ChatHelper} from "../utilities/ChatHelper";
import {FriendsHelper} from "../utilities/FriendsHelper";

export type Chat = {
    timestamp: number,
    event: ChatEvent,
    user: User,
    direction: ToFrom | null,
    message: string | null,
    channel: string | null
}

export type WhisperUpdate = {
    all: Chat[],
    new: Chat
}

export type ToFrom = "to" | "from"
export type ChatEvent = "talk" | "emote" | "whisper" | "info" | "error" | "broadcast" | "channel"

export class ChatManager {
    private chats: Chat[] = []
    private whispers: Chat[] = []

    private subscriptions: SubscriptionManager = new SubscriptionManager()

    public initialize() {
        this.listen()
    }

    public subscribe<A> (event: Event, a: EventSubscription<A>) {
        this.subscriptions.addSubscription(event, a)
    }

    public ignoreInfo = false

    public add(chat: Chat) {
        this.chats.push(chat)
        this.subscriptions.dispatch("chats", this.chats)
    }

    public whispersFor(username: string): Chat[] {
        if (username === "All Friends") {
            return this.whispers.filter((w) => References.friendsManager.hasFriend(w.user.name))
        } else {
            return this.whispers.filter((w) => w.user.name.toLowerCase() === username.toLowerCase())
        }
    }

    public forceUpdate() {
        this.subscriptions.dispatch("chats", this.chats)
    }

    private listen() {
        References.messageBus.on(Messages.Channels.MESSAGES, (arg) => {
            let string = arg as string
            let messages = string.split("\r\n")
            let innerMessage: string

            messages.forEach((message) => {
                if (message.trim().length == 0) return

                let fields = message.split(" ")
                let code = fields[0]

                let name = () => fields[2]
                let whisper

                // classic telnet
                switch (code) {
                    case Protocols.Classic.WHISPER_IN:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        whisper = ChatHelper.makeInboundWhisperChat(name(), innerMessage)
                        this.chats.push(whisper)
                        this.whispers.push(whisper)
                        this.subscriptions.dispatch("chats", this.chats)
                        this.subscriptions.dispatch("whispers", {
                            all: this.whispers,
                            new: whisper
                        } as WhisperUpdate)
                        return
                    case Protocols.Classic.TALK:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        this.chats.push(ChatHelper.makeTalkChat(name(), innerMessage))
                        this.subscriptions.dispatch("chats", this.chats)
                        return
                    case Protocols.Classic.BROADCAST:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        this.chats.push(ChatHelper.makeBroadcastChat(innerMessage))
                        this.subscriptions.dispatch("chats", this.chats)
                        return
                    case Protocols.Classic.CHANNEL:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        if (innerMessage != "Chat") {
                            this.chats.push(ChatHelper.makeChannelChat(innerMessage))
                            this.subscriptions.dispatch("chats", this.chats)
                        }
                        return
                    case Protocols.Classic.WHISPER_OUT:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        whisper = ChatHelper.makeOutboundWhisperChat(name(), innerMessage)
                        this.chats.push(whisper)
                        this.whispers.push(whisper)
                        this.subscriptions.dispatch("chats", this.chats)
                        this.subscriptions.dispatch("whispers", {
                            all: this.whispers,
                            new: whisper
                        } as WhisperUpdate)
                        break
                    case Protocols.Classic.INFO:
                        innerMessage = ProtocolHelper.parseQuoted(message)

                        if (References.motdManager.getReady()) return

                        if (!(innerMessage.startsWith("Listing ") && innerMessage.endsWith(" channels:")) &&
                            !((innerMessage.match(/\| /g) || []).length == 3)) {

                            innerMessage = ProtocolHelper.parseQuoted(message)
                            this.chats.push(ChatHelper.makeInfoChat(innerMessage))
                            this.subscriptions.dispatch("chats", this.chats)
                        }
                        return
                    case Protocols.Classic.ERROR:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        this.chats.push(ChatHelper.makeErrorChat(innerMessage))
                        this.subscriptions.dispatch("chats", this.chats)
                        return
                    case Protocols.Classic.EMOTE:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        this.chats.push(ChatHelper.makeEmoteChat(name(), innerMessage))
                        this.subscriptions.dispatch("chats", this.chats)
                        return
                }

                // init 6 proprietary
                const event = () => fields[1]
                const direction = () => fields[2]
                name = () => fields[6]

                switch (code) {
                    case Protocols.Init6.Commands.USER:
                        switch (event()) {
                            case Protocols.Init6.Events.WHISPER:
                                switch (direction()) {
                                    case Protocols.Init6.Directions.FROM:
                                        innerMessage = ProtocolHelper.parseInit6(message, 8)
                                        whisper = ChatHelper.makeInboundWhisperChat(name(), innerMessage)
                                        this.chats.push(whisper)
                                        this.whispers.push(whisper)
                                        this.subscriptions.dispatch("chats", this.chats)
                                        this.subscriptions.dispatch("whispers", {
                                            all: this.whispers,
                                            new: whisper
                                        } as WhisperUpdate)
                                        break
                                    case Protocols.Init6.Directions.TO:
                                        innerMessage = ProtocolHelper.parseInit6(message, 8)
                                        whisper = ChatHelper.makeOutboundWhisperChat(name(), innerMessage)
                                        this.chats.push(whisper)
                                        this.whispers.push(whisper)
                                        this.subscriptions.dispatch("chats", this.chats)
                                        this.subscriptions.dispatch("whispers", {
                                            all: this.whispers,
                                            new: whisper
                                        } as WhisperUpdate)
                                        break
                                }
                                break
                            case Protocols.Init6.Events.TALK:
                                innerMessage = ProtocolHelper.parseInit6(message, 8)
                                this.chats.push(ChatHelper.makeTalkChat(name(), innerMessage))
                                this.subscriptions.dispatch("chats", this.chats)
                                break
                            case Protocols.Init6.Events.EMOTE:
                                innerMessage = ProtocolHelper.parseInit6(message, 8)
                                this.chats.push(ChatHelper.makeEmoteChat(name(), innerMessage))
                                this.subscriptions.dispatch("chats", this.chats)
                                break
                        }
                        break
                    case Protocols.Init6.Commands.CHANNEL:
                        switch (event()) {
                            case Protocols.Init6.Events.JOIN:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                if (innerMessage != "Chat") {
                                    this.chats.push(ChatHelper.makeChannelChat(innerMessage))
                                    this.subscriptions.dispatch("chats", this.chats)
                                }
                                break
                        }
                        break
                    case Protocols.Init6.Commands.SERVER:
                        switch (event()) {
                            case Protocols.Init6.Events.INFO:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                if (!(innerMessage.startsWith("Listing ") && innerMessage.endsWith(" channels:")) &&
                                    !((innerMessage.match(/\| /g) || []).length == 3)) {

                                    innerMessage = ProtocolHelper.parseInit6(message, 6)
                                    this.chats.push(ChatHelper.makeInfoChat(innerMessage))
                                    this.subscriptions.dispatch("chats", this.chats)
                                }
                                break
                            case Protocols.Init6.Events.ERROR:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                this.chats.push(ChatHelper.makeErrorChat(innerMessage))
                                this.subscriptions.dispatch("chats", this.chats)
                                break
                            case Protocols.Init6.Events.BROADCAST:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                this.chats.push(ChatHelper.makeBroadcastChat(innerMessage))
                                this.subscriptions.dispatch("chats", this.chats)
                                break
                        }
                        break
                }
            })
        })
    }
}
