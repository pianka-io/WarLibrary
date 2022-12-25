import {Friend} from "../state/FriendsManager";

export namespace FriendsHelper {

    export const header             = (message: string) => message === "Your friends are:"
    export const friend             = (message: string) => message.includes(" in the channel ") || message.endsWith(", offline.")

    export const addedFriend        = (message: string) => message.startsWith("Added ") && message.endsWith(" to your friends list.")
    export const removedFriend      = (message: string) => message.startsWith("Removed ") && message.endsWith(" from your friends list.")

    export const addMaximumReached  = (message: string) => message === "You already have the maximum number of friends in your list. You will need to remove some of your friends before adding more."
    export const addNoUsername      = (message: string) => message === "You need to supply the account name of the friend you wish to add to your list."
    export const addNoYourself      = (message: string) => message === "You can't add yourself to your friends list."
    export const noFriends          = (message: string) => message === "You don't have any friends in your list. Use /friends add USERNAME to add a friend to your list."
    export const removeNoUsername   = (message: string) => message === "You need to supply the account name of the friend you wish to remove from your list."
    export const removeNotAdded     = (message: string) => message.endsWith(" was not in your friends list.")

    export function isFriendsMessage(message: string): boolean {
        return header(message)              ||
               friend(message)              ||
               addedFriend(message)         ||
               removedFriend(message)       ||
               addMaximumReached(message)   ||
               addNoUsername(message)       ||
               addNoYourself(message)       ||
               noFriends(message)           ||
               removeNoUsername(message)    ||
               removeNotAdded(message)
    }

    const online = /(\d+): (.+), using ([\w ]+) in the channel (.+) on server (.+)\./
    const offline = /(\d+): (.+), offline\./
    export function parseFriend(message: string): Friend {
        const onlineMatch = message.match(online)
        const offlineMatch = message.match(offline)

        if (onlineMatch) {
            return {
                name: onlineMatch[2],
                online: true,
                server: onlineMatch[5],
                client: parseClient(onlineMatch[3]),
                channel: onlineMatch[4],
                position: parseInt(onlineMatch[1]),
            }
        } else {
            return {
                name: offlineMatch[2],
                online: false,
                server: null,
                client: null,
                channel: null,
                position: parseInt(onlineMatch[1]),
            }
        }
    }

    export function parseClient(name: string) {
        switch (name) {
            case "a Chat Client":
                return "[CHAT]"
            case "Diablo":
                return "[DRTL]"
            case "Diablo Shareware":
                return "[DSHR]"
            case "Diablo II":
                return "[D2DV]"
            case "Diablo II Lord of Destruction":
                return "[D2XP]"
            case "Starcraft":
                return "[STAR]"
            case "Starcraft Broodwar":
                return "[SEXP]"
            case "Starcraft Japanese":
                return "[JSTR]"
            case "Starcraft Shareware":
                return "[SSHR]"
            case "Warcraft II":
                return "[W2BN]"
            case "Warcraft III":
                return "[WAR3]"
            case "Warcraft III The Frozen Throne":
                return "[W3XP]"
        }
    }
}
