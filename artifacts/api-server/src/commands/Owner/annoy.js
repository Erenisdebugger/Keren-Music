const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ComponentType
} = require('discord.js');

module.exports = {
    name: 'annoy',
    aliases: ['ping-user', 'spam'],
    description: 'Annoy a user by pinging them repeatedly.',
    category: 'Owner',
    usage: 'annoy <@user> [times] [interval_seconds]',
    example: 'annoy @user 5 2',
    owner: true,
    noSlash: true,

    async execute(message, args, client) {
        if (!client.config.ownerID.includes(message.author.id)) return;

        const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
        if (!target) {
            const c = new ContainerBuilder()
                .setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.warn} Mention a user to annoy.\n\`${client.prefix}annoy @user [times] [interval_s]\``));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        if (target.id === client.user.id) {
            const c = new ContainerBuilder()
                .setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.cross} I won't annoy myself!`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const times    = Math.min(Math.max(parseInt(args[1]) || 5, 1), 30);
        const interval = Math.min(Math.max((parseFloat(args[2]) || 1) * 1000, 500), 10000);

        const stopBtn = new ButtonBuilder()
            .setCustomId('annoy_stop')
            .setLabel('Stop')
            .setEmoji(client.emoji.cross || '🛑')
            .setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(stopBtn);

        const statusContainer = () => new ContainerBuilder()
            .setAccentColor(0x5B2D8E)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${client.emoji.warn || '📢'} Annoy Active\n${client.emoji.wickarrow} **Target:** <@${target.id}>\n${client.emoji.wickarrow} **Pings:** \`${sent}/${times}\`\n${client.emoji.wickarrow} **Interval:** \`${interval / 1000}s\`\n-# Press Stop to cancel early.`));

        let sent = 0;
        let stopped = false;

        const statusMsg = await message.reply({
            components: [statusContainer(), row],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = statusMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: times * interval + 5000,
            filter: i => i.customId === 'annoy_stop' && client.owners.includes(i.user.id)
        });

        collector.on('collect', async i => {
            stopped = true;
            collector.stop('manual');
            await i.deferUpdate();
        });

        const interval_id = setInterval(async () => {
            if (stopped || sent >= times) {
                clearInterval(interval_id);
                collector.stop();

                const doneContainer = new ContainerBuilder()
                    .setAccentColor(0x5B2D8E)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `### ${client.emoji.check} Annoy ${stopped ? 'Stopped' : 'Done'}\n` +
                        `${client.emoji.wickarrow} **Target:** <@${target.id}>\n` +
                        `${client.emoji.wickarrow} **Pings sent:** \`${sent}/${times}\``
                    ));

                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('annoy_stop').setLabel(stopped ? 'Stopped' : 'Completed').setStyle(ButtonStyle.Secondary).setDisabled(true)
                );

                await statusMsg.edit({ components: [doneContainer, disabledRow], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                return;
            }

            try {
                await message.channel.send({ content: `<@${target.id}>` });
                sent++;

                // Update status message every ping
                await statusMsg.edit({
                    components: [statusContainer(), row],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => {});
            } catch {
                clearInterval(interval_id);
                collector.stop();
            }
        }, interval);
    },
};
