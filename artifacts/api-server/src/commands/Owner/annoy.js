const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    ComponentType
} = require('discord.js');

const ANNOY_TEXTS = [
    "heyyyy you there 👀",
    "yo yo yo 😂",
    "HELLO?? answer me bro 😭",
    "why are you ignoring me 💀",
    "okay this is getting weird now",
    "i will keep going trust me 🙂",
    "bro check your pings lmao",
    "you can't escape 🏃",
    "this is fine. everything is fine. 🔥",
    "okay last one... jk 😈",
    "still here btw",
    "👁️👁️",
    "boop.",
    "you asked for this fr fr",
    "skill issue honestly",
];

function randomText() {
    return ANNOY_TEXTS[Math.floor(Math.random() * ANNOY_TEXTS.length)];
}

module.exports = {
    name: 'annoy',
    aliases: ['ping-user', 'spam', 'bother'],
    description: 'Annoy a user with pings, DMs, voice kicks, and more.',
    category: 'Owner',
    usage: 'annoy <@user> [times] [interval_seconds]',
    example: 'annoy @user 10 1.5',
    owner: true,
    noSlash: true,

    async execute(message, args, client) {
        if (!client.owners.includes(message.author.id)) return;

        const target = message.mentions.users.first()
            || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) {
            const c = new ContainerBuilder().setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `${client.emoji.warn} **Usage:** \`${client.prefix}annoy @user [times] [interval_s]\`\n` +
                    `-# Max 50 pings, min 0.5s interval`
                ));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        if (target.id === client.user.id) {
            const c = new ContainerBuilder().setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.cross} I won't annoy myself!`));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        const times    = Math.min(Math.max(parseInt(args[1])       || 5,   1), 50);
        const interval = Math.min(Math.max((parseFloat(args[2]) || 1) * 1000, 500), 15000);

        // Track for voice-kick
        if (!client.annoyTargets) client.annoyTargets = new Map();
        client.annoyTargets.set(target.id, { guildId: message.guild.id, by: message.author.id });

        let sent    = 0;
        let stopped = false;

        // ── status card ───────────────────────────────────────────────────────
        const buildStatus = (done = false) => {
            const featureList =
                `${client.emoji.wickarrow} **Target:** <@${target.id}>\n` +
                `${client.emoji.wickarrow} **Pings:** \`${sent}/${times}\`  •  **Interval:** \`${interval / 1000}s\`\n` +
                `${client.emoji.wickarrow} **Features:** Ping (auto-delete) • DM • Voice kick\n` +
                (done
                    ? `-# ${stopped ? '⛔ Stopped early.' : '✅ Session finished.'}`
                    : `-# Press Stop to cancel early.`);

            return new ContainerBuilder().setAccentColor(0x5B2D8E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `### ${done ? (stopped ? client.emoji.cross : client.emoji.check) : client.emoji.warn} Annoy ${done ? (stopped ? 'Stopped' : 'Done') : 'Active'}\n` + featureList
                ));
        };

        const stopBtn = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('annoy_stop')
                .setLabel('Stop')
                .setEmoji(client.emoji.stop || '⛔')
                .setStyle(ButtonStyle.Danger)
        );

        const doneBtn = (label) => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('annoy_stop')
                .setLabel(label)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        const statusMsg = await message.reply({
            components: [buildStatus(), stopBtn()],
            flags: MessageFlags.IsComponentsV2
        });

        // ── Stop button collector ─────────────────────────────────────────────
        const collector = statusMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: times * interval + 10000,
            filter: i => i.customId === 'annoy_stop' && client.owners.includes(i.user.id)
        });

        collector.on('collect', async i => {
            stopped = true;
            collector.stop('manual');
            await i.deferUpdate();
        });

        // ── Annoy loop ────────────────────────────────────────────────────────
        const tick = setInterval(async () => {
            if (stopped || sent >= times) {
                clearInterval(tick);
                collector.stop();
                client.annoyTargets?.delete(target.id);

                await statusMsg.edit({
                    components: [buildStatus(true), doneBtn(stopped ? 'Stopped' : 'Completed')],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => {});
                return;
            }

            try {
                // 1️⃣ Ping in channel (auto-delete after 2s)
                const pingMsg = await message.channel.send({
                    content: `<@${target.id}> ${randomText()}`
                }).catch(() => null);
                if (pingMsg) setTimeout(() => pingMsg.delete().catch(() => {}), 2000);

                // 2️⃣ DM the user (silent fail if DMs closed)
                target.send({ content: `👀 ${randomText()}` }).catch(() => {});

                // 3️⃣ Voice kick — if target is in any VC in this guild
                const guild  = client.guilds.cache.get(message.guild.id);
                const member = guild?.members.cache.get(target.id);
                if (member?.voice?.channelId) {
                    member.voice.disconnect().catch(() => {});
                }

                sent++;
                await statusMsg.edit({
                    components: [buildStatus(), stopBtn()],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => {});

            } catch {
                clearInterval(tick);
                collector.stop();
                client.annoyTargets?.delete(target.id);
            }
        }, interval);
    },
};
