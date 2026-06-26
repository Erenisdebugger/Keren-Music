const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
} = require('discord.js');

const DM_TEXTS = [
    "\u{1F440} heyyyy you there",
    "\ud83d\ude02 yo yo yo",
    "\ud83d\ude2d HELLO?? answer me bro",
    "\ud83d\udca7 why are you ignoring me",
    "\ud83d\ude42 i will keep going trust me",
    "\ud83c\udfc3 you can't escape",
    "\ud83d\udd25 this is fine. everything is fine.",
    "\ud83d\ude08 okay last one... jk",
    "\ud83d\udc41\ufe0f\ud83d\udc41\ufe0f still watching",
    "boop.",
    "you asked for this fr fr",
    "tick tock \u23f0",
    "\ud83d\udce8 new message just dropped",
    "remember me? \ud83d\ude0a",
    "i miss you bestie \u2764\ufe0f",
];

function randomDM() {
    return DM_TEXTS[Math.floor(Math.random() * DM_TEXTS.length)];
}

module.exports = {
    name: 'annoy',
    aliases: ['ping-user', 'bother'],
    description: 'Annoy a user indefinitely until !unannoy is used.',
    category: 'Owner',
    usage: 'annoy <@user> [interval_seconds]',
    example: 'annoy @user 3',
    owner: true,
    noSlash: true,

    async execute(message, args, client) {
        if (!client.owners.includes(message.author.id)) return;

        const target = message.mentions.users.first()
            || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) {
            const c = new ContainerBuilder().setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.warn} **Usage:** \`${client.prefix}annoy @user [interval_s]\`\n` +
                    `Stop with \`${client.prefix}unannoy @user\`\n` +
                    `-# Min interval: 2s`
                ));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        if (target.id === client.user.id) {
            const c = new ContainerBuilder().setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.cross} I won't annoy myself!`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        if (!client.annoyTargets) client.annoyTargets = new Map();

        if (client.annoyTargets.has(target.id)) {
            const c = new ContainerBuilder().setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.warn} <@${target.id}> is already being annoyed.\nUse \`${client.prefix}unannoy @user\` to stop.`
                ));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const intervalSec = Math.min(Math.max((parseFloat(args[1]) || 3), 2), 30);
        const intervalMs  = intervalSec * 1000;

        let dmsSent = 0;

        const buildStatus = (done = false, reason = '') => {
            const body =
                `${client.emoji.wickarrow} **Target:** <@${target.id}>\n` +
                `${client.emoji.wickarrow} **DMs sent:** \`${dmsSent}\`  •  **Interval:** \`${intervalSec}s\`\n` +
                `${client.emoji.wickarrow} **Active:** DM spam • Voice kick • Msg delete\n` +
                (done
                    ? `-# ${reason}`
                    : `-# Use \`${client.prefix}unannoy @${target.username}\` to stop.`);

            return new ContainerBuilder().setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `### ${done ? client.emoji.check : client.emoji.warn} Annoy ${done ? 'Ended' : 'Active'}\n` + body
                ));
        };

        const statusMsg = await message.reply({
            components: [buildStatus()],
            flags: MessageFlags.IsComponentsV2
        });

        const tick = setInterval(async () => {
            const data = client.annoyTargets?.get(target.id);
            if (!data) {
                clearInterval(tick);
                return;
            }

            try {
                // DM the user
                target.send({ content: randomDM() }).catch(() => {});

                // Voice kick
                const guild  = client.guilds.cache.get(message.guild.id);
                const member = guild?.members.cache.get(target.id);
                if (member?.voice?.channelId) member.voice.disconnect().catch(() => {});

                dmsSent++;
                await statusMsg.edit({ components: [buildStatus()], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            } catch {
                clearInterval(tick);
                client.annoyTargets?.delete(target.id);
            }
        }, intervalMs);

        // Store everything needed for unannoy
        client.annoyTargets.set(target.id, {
            guildId:       message.guild.id,
            channelId:     message.channel.id,
            by:            message.author.id,
            intervalId:    tick,
            statusMsgId:   statusMsg.id,
            statusChId:    message.channel.id,
            getDmsSent:    () => dmsSent,
            buildDone:     (reason) => buildStatus(true, reason),
        });
    },
};
