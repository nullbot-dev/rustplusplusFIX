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

const DiscordTools = require('../discordTools/discordTools.js');
const PermissionHandler = require('../handlers/permissionHandler.js');

const CATEGORY_NAME = 'rustplusplus';

module.exports = async (client, guild) => {
    const instance = client.getInstance(guild.id);

    let category = undefined;
    if (instance.channelId.category !== null) {
        category = DiscordTools.getCategoryById(guild.id, instance.channelId.category);
    }

    /* The category can still exist from before (lost instance file), use it instead of creating a second one. */
    if (category === undefined) {
        category = [...guild.channels.cache.values()].find(channel =>
            channel.type === Discord.ChannelType.GuildCategory && channel.name.trim().toLowerCase() === CATEGORY_NAME);
        if (category !== undefined) {
            instance.channelId.category = category.id;
            client.setInstance(guild.id, instance);
        }
    }
    if (category === undefined) {
        category = await DiscordTools.addCategory(guild.id, CATEGORY_NAME);
        instance.channelId.category = category.id;
        client.setInstance(guild.id, instance);
    }

    const perms = PermissionHandler.getPermissionsReset(client, guild, false);

    try {
        await category.permissionOverwrites.set(perms);
    }
    catch (e) {
        /* Ignore */
    }

    return category;
};