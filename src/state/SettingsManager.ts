import {Messages} from "../common/Messages";
import {References} from "../References";

export type Settings = {
    autoReconnect: boolean,
    ignoreEmotes: boolean,
    separateBots: boolean
}

export class SettingsManager {

    private defaultSettings = {
        autoReconnect: true,
        ignoreEmotes: false,
        separateBots: true
    }
    private settings: Settings = this.defaultSettings

    public initialize() {
        this.listen()
    }

    public getSettings() {
        return {...this.defaultSettings, ...this.settings}
    }

    public setSettings(newSettings: Settings) {
        this.settings = newSettings
        References.messageBus.send(
            Messages.Channels.SETTINGS,
            Messages.Commands.Settings.SAVE,
            this.settings
        )
    }

    private listen() {
        References.messageBus.on(Messages.Channels.SETTINGS, (command, data) => {
            switch (command) {
                case Messages.Commands.Settings.READ:
                    this.settings = data as Settings
                    break
            }
        })
        References.messageBus.send(
            Messages.Channels.SETTINGS,
            Messages.Commands.Settings.READ
        )
    }
}
