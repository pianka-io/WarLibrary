import {Messages} from "../common/Messages";
import {Protocols} from "../common/Protocols";
import {EventSubscription, SubscriptionManager} from "../SubscriptionManager";
import {StateManager} from "../StateManager";
import {References} from "../References";

export type User = {
    name: string,
    client: string,
    flags: string | undefined,
    bot: boolean
}

export class UserManager implements StateManager {
    private self: string = ""
    private users: User[] = []

    private subscriptions: SubscriptionManager = new SubscriptionManager()

    public initialize() {
        this.listen()
    }

    public getConnectedUser(): User {
        try {
            const user = this.getByUsername(References.profileManager.getProfile().username)

            if (user && user.name) {
                return user
            }
        } catch(error) {}

        return {
            name: References.profileManager.getProfile().username,
            client: "[NONE]",
            flags: "",
            bot: false
        }
    }

    public getServerUser(): User {
        return {name: "Server", client: "[SERV]", flags: "", bot: false}
    }

    public getWarChatUser(): User {
        return {name: "WarChat", client: "[WCHT]", flags: "", bot: false}
    }

    public getByUsername(username: string): User {
        let results = this.users.filter((u) => u.name.toLowerCase() == username.toLowerCase())
        return results[0]
    }

    public subscribe(callback: EventSubscription<User[]>) {
        this.subscriptions.addSubscription("users", callback)
    }

    public forceUpdate() {
        this.subscriptions.dispatch("users", this.users)
    }

    private listen() {
        References.connectionManager.subscribe("connected", () => {
            this.users = []
            this.subscriptions.dispatch("users", this.users)
        })

        References.messageBus.on(Messages.Channels.MESSAGES, (arg) => {
            let string = arg as string
            let messages = string.split("\r\n")

            messages.forEach((message) => {
                if (message.trim().length == 0) return

                let fields = message.split(" ")
                let code = fields[0]

                let name = () => fields[2]
                let flags = () => fields[3]
                let client = () => fields[4]

                // classic telnet
                switch (code) {
                    case Protocols.Classic.USER:
                        this.users.push({
                            "name": name(),
                            "flags": flags(),
                            "client": client(),
                            bot: false
                        })
                        this.subscriptions.dispatch("users", this.users)
                        break
                    case Protocols.Classic.JOIN:
                        this.users.push({
                            "name": name(),
                            "flags": flags(),
                            "client": fields.length > 4? client() : "[CHAT]",
                            bot: false
                        })
                        this.subscriptions.dispatch("users", this.users)
                        break
                    case Protocols.Classic.LEAVE:
                        this.users = this.users.filter((u) => u.name != name())
                        this.subscriptions.dispatch("users", this.users)
                        break
                    case Protocols.Classic.CHANNEL:
                        this.users = []
                        this.subscriptions.dispatch("users", this.users)
                        break
                    case Protocols.Classic.UPDATE:
                        let user = this.getByUsername(name())
                        user.flags = flags()
                        if (fields.length > 4) {
                            user.client = client()
                        } else {
                            user.client = "[CHAT]"
                        }
                        break
                    case Protocols.Classic.NAME:
                        this.self = name()
                        break
                    default:
                        break
                }

                // init 6 proprietary
                const event = () => fields[1]
                name = () => fields[6]
                flags = () => fields[4]
                client = () => "[" + fields[7].split('').reverse().join('').toUpperCase() + "]"

                switch (code) {
                    case Protocols.Init6.Commands.USER:
                        switch (event()) {
                            case Protocols.Init6.Events.IN:
                                this.users.push({
                                    "name": name(),
                                    "flags": flags(),
                                    "client": client(),
                                    bot: false
                                })
                                this.subscriptions.dispatch("users", this.users)
                                break
                            case Protocols.Init6.Events.JOIN:
                                this.users.push({
                                    "name": name(),
                                    "flags": flags(),
                                    "client": client(),
                                    bot: false
                                })
                                this.subscriptions.dispatch("users", this.users)
                                break
                            case Protocols.Init6.Events.LEAVE:
                                this.users = this.users.filter((u) => u.name != name())
                                this.subscriptions.dispatch("users", this.users)
                                break
                            case Protocols.Init6.Events.UPDATE:
                                let user = this.getByUsername(fields[6])
                                user.flags = flags()
                                user.client = client()
                                break
                        }
                        break
                    case Protocols.Init6.Commands.CHANNEL:
                        switch (event()) {
                            case Protocols.Init6.Events.JOIN:
                                this.self = References.profileManager.getProfile().username
                                this.users = []
                                this.subscriptions.dispatch("users", this.users)
                        }
                        break
                }
            });
        });
    }
}
