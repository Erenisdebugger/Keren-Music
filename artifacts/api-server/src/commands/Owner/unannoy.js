const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
} = require('discord.js');

module.exports = {
    name: 'unannoy',
    aliases: ['stopannoy', 'unspam'],
    description: 'Stop an active annoy session on a user.',
    category: 'Owner',
    usage: 'unannoy <@user>',
    example: 'unannoy @user',
    owner: true,
    noSlash: true,

    async execute(message, args, client) {
        if (!client.owners.includes(message.author.id)) return;

        const target = message.mentions.users.first()
            || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) {
            const c = new ContainerBuilder().setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.warn} **Usage:** \`${client.prefix}unannoy @user\``
                ));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        if (!client.annoyTargets?.has(target.id)) {
            const c = new ContainerBuilder().setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.info} <@${target.id}> is not currently being annoyed.`
                ));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const data = client.annoyTargets.get(target.id);

        // Stop the interval
        if (data.intervalId) clearInterval(data.intervalId);

        // Remove from targets (this stops message-delete & voice-kick hooks too)
        client.annoyTargets.delete(target.id);

        // Update the original status message
        try {
            const statusCh  = client.channels.cache.get(data.statusChId);
            const statusMsg = statusCh ? await statusCh.messages.fetch(data.statusMsgId).catch(() => null) : null;
            if (statusMsg && data.buildDone) {
                await statusMsg.edit({
                    components: [data.buildDone(`Stopped by <@${message.author.id}>`)],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => {});
            }
        } catch {}

        const c = new ContainerBuilder().setAccentColor(0x5B2D8E)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `${client.emoji.check} Annoy session for <@${target.id}> has been stopped.`
            ));
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    },
};
