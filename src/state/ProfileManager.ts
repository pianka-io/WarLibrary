import {Messages} from "../common/Messages";
import {References} from "../References";
import {StateManager} from "../StateManager";

export type Profile = {
    server: string,
    username: string,
    password: string,
    home: string,
    init6: boolean
}

export class ProfileManager implements StateManager {

    private profile: Profile = {
        server: "",
        username: "",
        password: "",
        home: "",
        init6: true
    }

    public initialize() {
        this.listen()
    }

    public getProfile() {
        return this.profile
    }

    public setProfile(newProfile: Profile) {
        this.profile = newProfile
        References.messageBus.send(
            Messages.Channels.PROFILE,
            Messages.Commands.Profile.SAVE,
            this.profile
        )
    }

    private listen() {
        References.messageBus.on(Messages.Channels.PROFILE, (command, data) => {
            switch (command) {
                case Messages.Commands.Profile.READ:
                    this.profile = data as Profile
                    break
            }
        })
        References.messageBus.send(
            Messages.Channels.PROFILE,
            Messages.Commands.Profile.READ
        )
    }
}
