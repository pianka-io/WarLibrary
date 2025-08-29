import {StateManager} from "../StateManager";
import {Event, EventSubscription, SubscriptionManager} from "../SubscriptionManager";
import {References} from "../References";
import {Messages} from "../common/Messages";
import {Protocols} from "../common/Protocols";
import {ProtocolHelper} from "../utilities/ProtocolHelper";
import {FriendsHelper} from "../utilities/FriendsHelper";

export class MotdManager implements StateManager {

    private motd: string[] = []
    private reading = true

    private subscriptions: SubscriptionManager = new SubscriptionManager()
    public subscribe<A> (event: Event, a: EventSubscription<A>) {
        this.subscriptions.addSubscription(event, a)
    }

    public initialize() {
        this.listen()
    }

    public isReading(): boolean {
        return this.reading
    }

    public getMotd(): string[] {
        return this.motd
    }

    /*
        classic: between 2010 NAME and 1007 CHANNEL
        init6: SERVER TOPIC between OK and CHANNEL JOIN
     */
    private listen() {
        References.connectionManager.subscribe("connected", () => {
            this.motd = [];
            this.reading = true
            this.subscriptions.dispatch("motd", this.motd)
        })

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
                        this.reading = false
                        return
                    case Protocols.Classic.INFO:
                        innerMessage = ProtocolHelper.parseQuoted(message)
                        if ((innerMessage.startsWith("Listing ")) ||
                            ((innerMessage.match(/\| /g) || []).length == 4) ||
                            (FriendsHelper.isFriendsMessage(innerMessage))) return

                        this.motd.push(innerMessage)
                        this.subscriptions.dispatch("motd", this.motd)
                        return
                }

                // init 6 proprietary
                const event = () => fields[1]

                switch (code) {
                    case Protocols.Init6.Commands.CHANNEL:
                        innerMessage = ProtocolHelper.parseInit6(message, 6)
                        this.reading = false
                        break
                    case Protocols.Init6.Commands.SERVER:
                        switch (event()) {
                            case Protocols.Init6.Events.TOPIC:
                                innerMessage = ProtocolHelper.parseInit6(message, 6)
                                if ((innerMessage.startsWith("Listing ")) ||
                                    ((innerMessage.match(/\| /g) || []).length == 4)) return

                                this.motd.push(innerMessage)
                                this.subscriptions.dispatch("motd", this.motd)
                                break
                        }
                }
            })
        })
    }
}
