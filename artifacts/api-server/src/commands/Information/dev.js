const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const os = require('os');

module.exports = {
    name: 'dev',
    aliases: ['developer', 'architect', 'kerendev'],
    description: 'Classified system intel — Keren OS Architect profile.',
    category: 'Information',
    slashOptions: [],

    async slashExecute(interaction, client) {
        const wrapper = {
            guild: interaction.guild,
            channel: interaction.channel,
            author: interaction.user,
            member: interaction.member,
            createdTimestamp: interaction.createdTimestamp,
            reply: async (opts) => {
                if (interaction.deferred) return interaction.editReply(opts);
                if (interaction.replied)  return interaction.followUp(opts);
                return interaction.reply(opts);
            },
        };
        return this.execute(wrapper, [], client, client.prefix);
    },

    async execute(message, args, client) {
        const esc    = '\u001b';
        const cyan   = `${esc}[1;36m`;
        const green  = `${esc}[1;32m`;
        const yellow = `${esc}[1;33m`;
        const gray   = `${esc}[1;30m`;
        const blue   = `${esc}[1;34m`;
        const white  = `${esc}[1;37m`;
        const red    = `${esc}[1;31m`;
        const purple = `${esc}[1;35m`;
        const reset  = `${esc}[0m`;

        const pad = (str, n) => String(str) + ' '.repeat(Math.max(0, n - String(str).length));

        const servers  = client.guilds.cache.size;
        const users    = client.users.cache.size;
        const commands = client.commands?.size || 114;
        const ram_mb   = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const uptimeS  = Math.floor(process.uptime());
        const h = Math.floor(uptimeS / 3600);
        const m = Math.floor((uptimeS % 3600) / 60);
        const uptimeStr = h > 0 ? `${h}h ${m}m online` : `${m}m online`;

        // ── BOOT SEQUENCE ──────────────────────────────────────────────────────
        const bootBlock = new TextDisplayBuilder().setContent(
            `\`\`\`ansi\n` +
            ` ${green}root@keren-os${reset}${gray}:~# ./access --level=ROOT --auth=EREN${reset}\n` +
            ` ${yellow}[  0.001 ] ${reset}${white}Keren OS kernel loading...${reset}\n` +
            ` ${yellow}[  0.012 ] ${reset}${white}Neural interface activated${reset}\n` +
            ` ${yellow}[  0.027 ] ${reset}${white}Biometric signature verified${reset}\n` +
            ` ${green}[  OK    ] ${reset}${cyan}ACCESS GRANTED — WELCOME, KAZI EREN${reset}\n` +
            `\`\`\``
        );

        // ── ARCHITECT DOSSIER ──────────────────────────────────────────────────
        const archBlock = new TextDisplayBuilder().setContent(
            `\`\`\`ansi\n` +
            ` ${purple}╔══════════════════════════════════════╗${reset}\n` +
            ` ${purple}║  ${cyan}KEREN OS ${reset}${gray}// ARCHITECT DOSSIER      ${purple}║${reset}\n` +
            ` ${purple}╚══════════════════════════════════════╝${reset}\n` +
            ` ${yellow}• ${reset}${yellow}${pad('IDENTITY', 14)}${reset} ${blue}::\n` +
            `   ${gray}L ${reset}${gray}${pad('Name', 12)}${reset} ${blue}: ${reset}${cyan}KAZI EREN${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Role', 12)}${reset} ${blue}: ${reset}${white}Lead Architect & Developer${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Clearance', 12)}${reset} ${blue}: ${reset}${green}LEVEL-10 ${gray}[MAXIMUM]${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Status', 12)}${reset} ${blue}: ${reset}${green}⬤ ${reset}${white}ACTIVE${reset}\n` +
            ` ${yellow}• ${reset}${yellow}${pad('KEREN OS', 14)}${reset} ${blue}:: ${reset}${cyan}ARTIFICIAL INTELLIGENCE${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('System', 12)}${reset} ${blue}: ${reset}${cyan}Keren OS v1.0${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Neural Net', 12)}${reset} ${blue}: ${reset}${green}ONLINE ${gray}[SELF-LEARNING]${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Protocol', 12)}${reset} ${blue}: ${reset}${white}Autonomous Intelligence Layer${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Core Temp', 12)}${reset} ${blue}: ${reset}${yellow}NOMINAL ${gray}[STABLE]${reset}\n` +
            ` ${yellow}• ${reset}${yellow}${pad('BUILD ENV', 14)}${reset} ${blue}::\n` +
            `   ${gray}L ${reset}${gray}${pad('Platform', 12)}${reset} ${blue}: ${reset}${red}Kali Linux ${gray}[Terminal Build]${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Shell', 12)}${reset} ${blue}: ${reset}${white}/bin/bash ${gray}[root]${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Runtime', 12)}${reset} ${blue}: ${reset}${white}Node.js ${process.version}${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Framework', 12)}${reset} ${blue}: ${reset}${white}discord.js v${require('discord.js').version}${reset}\n` +
            `\`\`\``
        );

        // ── LIVE SYSTEM STATUS ─────────────────────────────────────────────────
        const statusBlock = new TextDisplayBuilder().setContent(
            `\`\`\`ansi\n` +
            ` ${yellow}• ${reset}${yellow}${pad('DEPLOYMENT', 14)}${reset} ${blue}::\n` +
            `   ${gray}L ${reset}${gray}${pad('Servers', 12)}${reset} ${blue}: ${reset}${white}${servers}${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Users', 12)}${reset} ${blue}: ${reset}${white}${users}${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Commands', 12)}${reset} ${blue}: ${reset}${white}${commands}${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Memory', 12)}${reset} ${blue}: ${reset}${white}${ram_mb} MB${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Session', 12)}${reset} ${blue}: ${reset}${green}${uptimeStr}${reset}\n` +
            ` ${gray}──────────────────────────────────────${reset}\n` +
            ` ${gray}root@keren-os${reset}${gray}:~# ${reset}${green}All systems operational.${reset}\n` +
            ` ${gray}root@keren-os${reset}${gray}:~# █${reset}\n` +
            `\`\`\``
        );

        const container = new ContainerBuilder()
            .setAccentColor(0x5B2D8E)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### 🔐 Keren OS — Architect Access Terminal\n` +
                    `-# Classified system intel • Requested by ${message.author.username}`
                )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(bootBlock)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(archBlock)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(statusBlock)
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Keren Wave')
                        .setEmoji(client.emoji.wave || '🌊')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.gg/HXKmJgq9T'),
                    new ButtonBuilder()
                        .setLabel('Support Server')
                        .setEmoji(client.emoji.star || '⭐️')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.gg/HXKmJgq9T')
                )
            );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },
};
