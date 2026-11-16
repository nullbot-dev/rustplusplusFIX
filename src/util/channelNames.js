/*
    Helpers for naming the text channels the bot creates and for recognising channels that already exist.

    Kept free of Discord dependencies so the logic can be tested on its own.
*/

/* Emoji put in front of each channel name. Single code point emoji only, so Discord keeps them unchanged. */
const CHANNEL_EMOJIS = {
    information: '📋',
    servers: '🌐',
    settings: '🔧',
    commands: '🤖',
    teamchat: '💬',
    switches: '🔌',
    switchGroups: '🔗',
    alarms: '🚨',
    storageMonitors: '📦',
    activity: '🔔',
    trackers: '🎯'
};

/* Discord lowercases text channel names and replaces spaces with hyphens. */
function normalizeName(name) {
    return String(name).trim().toLowerCase().replace(/\s+/g, '-');
}

/* The name a channel is created with, for example "📋-information". */
function getChannelName(idName, baseName) {
    const emoji = CHANNEL_EMOJIS[idName];
    return normalizeName(emoji ? `${emoji}-${baseName}` : baseName);
}

/* All names an existing channel can have to count as this one: with and without emoji, for every given language. */
function getAcceptedNames(idName, baseNames) {
    const accepted = new Set();
    for (const baseName of baseNames) {
        if (!baseName) continue;
        accepted.add(normalizeName(baseName));
        accepted.add(getChannelName(idName, baseName));
    }
    return accepted;
}

/*
    Pick an existing channel by name.
    channels: array of { id, name } (already limited to the bot's category and to text channels)
    acceptedNames: Set from getAcceptedNames
    takenIds: ids that already belong to another bot channel and must not be reused
*/
function findChannelByName(channels, acceptedNames, takenIds = []) {
    return channels.find(channel => !takenIds.includes(channel.id) &&
        acceptedNames.has(normalizeName(channel.name)));
}

module.exports = { CHANNEL_EMOJIS, normalizeName, getChannelName, getAcceptedNames, findChannelByName };
