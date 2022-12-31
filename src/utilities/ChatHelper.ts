import {References} from "../References";
import {Chat} from "../state/ChatManager";

export namespace ChatHelper {

    export function makeTalkChat(username: string, message: string): Chat {
        return {
            timestamp: Date.now(),
            event: "talk",
            user: References.userManager.getByUsername(username),
            direction: "from",
            message: message,
            channel: null
        }
    }

    export function makeEmoteChat(username: string, message: string): Chat {
        return {
            timestamp: Date.now(),
            event: "emote",
            user: References.userManager.getByUsername(username),
            direction: "from",
            message: message,
            channel: null
        }
    }

    export function makeInboundWhisperChat(username: string, message: string): Chat {
        //TODO look up user from UserManager
        return {
            timestamp: Date.now(),
            event: "whisper",
            user: {
                name: username,
                client: "[NONE]",
                flags: "",
                bot: false
            },
            direction: "from",
            message: message,
            channel: null
        }
    }

    export function makeOutboundWhisperChat(username: string, message: string): Chat {
        if (username === "your\u00A0friends") {
            username = "All Friends"
        }

        return {
            timestamp: Date.now(),
            event: "whisper",
            user: {
                name: username,
                client: "[NONE]",
                flags: "",
                bot: false
            },
            direction: "to",
            message: message,
            channel: null
        }
    }

    export function makeInfoChat(message: string): Chat {
        return {
            timestamp: Date.now(),
            event: "info",
            user: References.userManager.getServerUser(),
            direction: "from",
            message: message,
            channel: null
        }
    }

    export function makeErrorChat(message: string): Chat {
        return {
            timestamp: Date.now(),
            event: "error",
            user: References.userManager.getServerUser(),
            direction: "from",
            message: message,
            channel: null
        }
    }

    export function makeBroadcastChat(message: string): Chat {
        return {
            timestamp: Date.now(),
            event: "broadcast",
            user: References.userManager.getServerUser(),
            direction: "from",
            message: message,
            channel: null
        }
    }

    export function makeChannelChat(channel: string): Chat {
        return {
            timestamp: Date.now(),
            event: "channel",
            user: References.userManager.getServerUser(),
            direction: "from",
            message: null,
            channel: channel
        }
    }

    export function makeSelfChat(message: string): Chat {
        return {
            timestamp: Date.now(),
            event: "talk",
            user: References.userManager.getConnectedUser(),
            direction: "from",
            message: message,
            channel: null
        }
    }

    export function makeBotChat(message: string): Chat {
        return {
            timestamp: Date.now(),
            event: "info",
            user: References.userManager.getWarChatUser(),
            direction: "from",
            message: message,
            channel: null
        }
    }

    export function isBanMessage(message: string) {
        if (message.includes(" was banned by ")) return true
        if (message.includes(" was unbanned by ")) return true
        if (message.includes(" was kicked out of the channel by ")) return true
    }

    const antiIdles = [
        "Apathy3 - Unstable and damn near unusable",
        "Apathy2 - Unstable and damn near unusable",
        "Its Hammer Time :) - DC v1.2.",
        "Its Hammer Time :) - DC v1.3b1 [Private Edition]",
        ":+:~EwR 4 LyFe~:+: - Ghost 3.02",
        "-[ +|{W+ ]-[ Subaru Version 1.3.5 MoonGlade Series ]-"
    ]
    export function isAntiIdle(message: string) {
        if (message.startsWith("starts with: is a SphtBot - Bot")) return true

        return antiIdles.includes(message)
    }
}
