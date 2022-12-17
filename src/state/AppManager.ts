import {Messages} from "../common/Messages";
import {StateManager} from "../StateManager";
import {References} from "../References";

export class AppManager implements StateManager {

    private identifier: string = ""

    public getIdentifier() {
        return this.identifier
    }

    public initialize() {
        this.listen()
    }

    private listen() {
        References.messageBus.on(
            Messages.Channels.APP,
            (command, newIdentifier) => {
                switch (command) {
                    case Messages.Commands.App.IDENTIFIER:
                        this.identifier = newIdentifier as string
                        break
                }
            }
        )
    }
}
