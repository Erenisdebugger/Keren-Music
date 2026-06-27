const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'ping',
    aliases: ['latency', 'pong', 'pimg'],
    description: "Displays the bot's system latency via Keren OS diagnostics.",
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
        const reset  = `${esc}[0m`;

        const ts = Math.floor(Date.now() / 1000);

        // ── Loading state ─────────────────────────────────────────────────────
        const bootBlock = new TextDisplayBuilder().setContent(
            `\`\`\`ansi\n` +
            ` ${cyan}KEREN OS ${reset}${gray}// DIAGNOSTIC MODULE${reset}\n` +
            ` ${gray}──────────────────────────────────────${reset}\n` +
            ` ${yellow}⟳ ${reset}${white}Initialising neural link...${reset}\n` +
            `\`\`\``
        );

        const bootContainer = new ContainerBuilder()
            .setAccentColor(0x5B2D8E)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`### ${client.emoji.terminal || '🖥️'} Keren OS — System Diagnostics\n-# Requested by ${message.author.username} • <t:${ts}:R>`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(bootBlock);

        const msg = await message.reply({
            components: [bootContainer],
            flags: MessageFlags.IsComponentsV2
        });

        // ── Measure latencies ─────────────────────────────────────────────────
        const ws_ping      = client.ws.ping;
        const response_ms  = msg.createdTimestamp - message.createdTimestamp;

        const db_latency = await (async () => {
            const t = performance.now();
            try {
                client.db.db.prepare('SELECT 1').get();
                const ms = performance.now() - t;
                return ms < 1 ? `${ms.toFixed(3)}ms` : `${Math.round(ms)}ms`;
            } catch { return 'ERR'; }
        })();

        const ram_mb    = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const uptime_s  = Math.floor(process.uptime());
        const h = Math.floor(uptime_s / 3600);
        const m = Math.floor((uptime_s % 3600) / 60);
        const s = uptime_s % 60;
        const uptime_str = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;

        const pingColor  = (ms) => ms < 80  ? green : ms < 180 ? yellow : red;
        const pingStatus = (ms) => ms < 80  ? 'OPTIMAL' : ms < 180 ? 'MODERATE' : 'DEGRADED';

        const pad = (str, n) => str + ' '.repeat(Math.max(0, n - String(str).length));

        // ── Final diagnostic block ────────────────────────────────────────────
        const diagBlock = new TextDisplayBuilder().setContent(
            `\`\`\`ansi\n` +
            ` ${cyan}KEREN OS ${reset}${gray}// DIAGNOSTIC MODULE${reset}\n` +
            ` ${gray}──────────────────────────────────────${reset}\n` +
            ` ${yellow}• ${reset}${yellow}${pad('CONNECTION', 12)}${reset} ${blue}::\n` +
            `   ${gray}L ${reset}${gray}${pad('WebSocket', 10)}${reset} ${blue}: ${reset}${pingColor(ws_ping)}${pad(ws_ping + 'ms', 8)}${reset} ${gray}[${pingStatus(ws_ping)}]${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Response', 10)}${reset} ${blue}: ${reset}${pingColor(response_ms)}${pad(response_ms + 'ms', 8)}${reset} ${gray}[${pingStatus(response_ms)}]${reset}\n` +
            ` ${yellow}• ${reset}${yellow}${pad('KEREN OS CORE', 12)}${reset} ${blue}::\n` +
            `   ${gray}L ${reset}${gray}${pad('Database', 10)}${reset} ${blue}: ${reset}${green}${pad(db_latency, 8)}${reset} ${gray}[ONLINE]${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Memory', 10)}${reset} ${blue}: ${reset}${white}${pad(ram_mb + ' MB', 8)}${reset} ${gray}[ALLOCATED]${reset}\n` +
            `   ${gray}L ${reset}${gray}${pad('Uptime', 10)}${reset} ${blue}: ${reset}${white}${uptime_str}${reset}\n` +
            ` ${gray}──────────────────────────────────────${reset}\n` +
            ` ${cyan}ARCHITECT ${reset}${gray}// KAZI EREN   AI ${reset}${cyan}// KEREN OS${reset}\n` +
            `\`\`\``
        );

        const finalContainer = new ContainerBuilder()
            .setAccentColor(0x5B2D8E)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`### ${client.emoji.terminal || '🖥️'} Keren OS — System Diagnostics\n-# Requested by ${message.author.username} • <t:${ts}:R>`)
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(diagBlock);

        await msg.edit({
            components: [finalContainer],
            flags: MessageFlags.IsComponentsV2
        }).catch(() => {});
    },
};
