/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/

const Discord = require('discord.js');

const ChannelNames = require('../util/channelNames.js');
const DiscordTools = require('../discordTools/discordTools.js');
const PermissionHandler = require('../handlers/permissionHandler.js');

/* [instance key, language key of the channel name, can everyone write in it] */
const CHANNELS = [
    ['information', 'channelNameInformation', false],
    ['servers', 'channelNameServers', false],
    ['settings', 'channelNameSettings', false],
    ['commands', 'channelNameCommands', true],
    ['teamchat', 'channelNameTeamchat', true],
    ['switches', 'channelNameSwitches', false],
    ['switchGroups', 'channelNameSwitchGroups', false],
    ['alarms', 'channelNameAlarms', false],
    ['storageMonitors', 'channelNameStorageMonitors', false],
    ['activity', 'channelNameActivity', false],
    ['trackers', 'channelNameTrackers', false]
];

/*
    renameExisting: also rename channels that were found by name to the current (emoji) name. It is only used by
    /reset discord, since Discord limits how often a channel can be renamed.
*/
module.exports = async (client, guild, category, renameExisting = false) => {
    for (const [idName, languageKey, permissionWrite] of CHANNELS) {
        await addTextChannel(idName, languageKey, client, guild, category, permissionWrite, renameExisting);
    }
};

async function addTextChannel(idName, languageKey, client, guild, parent, permissionWrite, renameExisting) {
    const instance = client.getInstance(guild.id);

    const baseNames = [client.intlGet(guild.id, languageKey), client.intlGet('en', languageKey)];
    const name = ChannelNames.getChannelName(idName, baseNames[0]);

    let channel = undefined;
    if (instance.channelId[idName] !== null) {
        channel = DiscordTools.getTextChannelById(guild.id, instance.channelId[idName]);
    }

    /* The channel is not known to the bot (new install, lost instance file, reset), but it can still exist in the
       bot's category from before. Use that one instead of creating a duplicate. */
    if (channel === undefined) {
        channel = findExistingChannel(client, guild, parent, idName, baseNames);
        if (channel !== undefined) {
            instance.channelId[idName] = channel.id;
            client.setInstance(guild.id, instance);
        }
    }

    if (channel === undefined) {
        channel = await DiscordTools.addTextChannel(guild.id, name);
        instance.channelId[idName] = channel.id;
        client.setInstance(guild.id, instance);

        try {
            channel.setParent(parent.id);
        }
        catch (e) {
            client.log(client.intlGet(null, 'errorCap'),
                client.intlGet(null, 'couldNotSetParent', { channelId: channel.id }), 'error');
        }
    }
    else if (renameExisting && channel.name !== name) {
        await renameChannel(client, channel, name);
    }

    if (instance.firstTime) {
        try {
            channel.setParent(parent.id);
        }
        catch (e) {
            client.log(client.intlGet(null, 'errorCap'),
                client.intlGet(null, 'couldNotSetParent', { channelId: channel.id }), 'error');
        }
    }

    const perms = PermissionHandler.getPermissionsReset(client, guild, permissionWrite);

    try {
        await channel.permissionOverwrites.set(perms);
    }
    catch (e) {
        /* Ignore */
    }

    channel.lockPermissions();
}

/* Look for an unclaimed text channel with this name (with or without emoji) in the bot's category only, so channels
   elsewhere on the server are never taken over. */
function findExistingChannel(client, guild, parent, idName, baseNames) {
    const instance = client.getInstance(guild.id);

    const candidates = [...guild.channels.cache.values()].filter(channel =>
        channel.parentId === parent.id && channel.type === Discord.ChannelType.GuildText);

    return ChannelNames.findChannelByName(candidates,
        ChannelNames.getAcceptedNames(idName, baseNames), Object.values(instance.channelId));
}

/* Discord allows only a few renames per channel every 10 minutes and discord.js waits for the limit to pass, which
   used to halt the whole bot. Give up after a while instead; the rename still goes through when allowed. */
async function renameChannel(client, channel, name) {
    let timer = null;
    try {
        await Promise.race([
            channel.setName(name),
            new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 15000); })
        ]);
    }
    catch (e) {
        client.log(client.intlGet(null, 'errorCap'),
            `Could not rename channel ${channel.id} to ${name}: ${e.message}`, 'error');
    }
    finally {
        clearTimeout(timer);
    }
}
