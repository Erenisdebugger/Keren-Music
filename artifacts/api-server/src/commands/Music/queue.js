const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');
const { convertTime } = require('../../utils/convert.js');

module.exports = {
  name: 'queue',
  aliases: ['q'],
  category: 'Music',
  description: 'Show the server queue',
  args: false,
  usage: '',
  userPerms: [],
  owner: false,
  player: true,
  inVoiceChannel: false,
  sameVoiceChannel: false,
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

  async execute(message, args, client, prefix) {
    const e = client.emoji;
    const player = client.manager.players.get(message.guild.id);

    if (!player?.queue?.current) {
      const container = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${e.cross} Nothing is playing right now.**`)
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const queue   = player.queue;
    const current = queue.current;
    const PER_PAGE = 10;
    const pages   = Math.max(1, Math.ceil(queue.length / PER_PAGE));
    let   page    = 0;

    let totalMs = current.length || 0;
    for (const t of queue) totalMs += (t.length || 0);

    const loopIcon = () => {
      const mode = player.loop || 'none';
      if (mode === 'track') return ` ${e.loop || '🔁'} *track loop*`;
      if (mode === 'queue') return ` ${e.loop || '🔁'} *queue loop*`;
      return '';
    };

    function buildContainer(pg) {
      const start     = pg * PER_PAGE;
      const slice     = queue.slice(start, start + PER_PAGE);
      const totalStr  = convertTime(totalMs);

      // ── Header
      const header = new TextDisplayBuilder()
        .setContent(
          `${e.queue || '📋'} **Music Queue** — Page **${pg + 1}/${pages}**${loopIcon()}\n` +
          `${e.duration || '⏱️'} Total runtime: \`${totalStr}\` • **${queue.length + 1}** track${queue.length !== 0 ? 's' : ''}`
        );

      const sep1 = new SeparatorBuilder();

      // ── Now Playing
      const nowText = new TextDisplayBuilder()
        .setContent(
          `${e.play || '▶️'} **Now Playing**\n` +
          `**[${current.title}](${current.uri || current.url})** — \`${convertTime(current.length || 0)}\``
        );

      const container = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(header)
        .addSeparatorComponents(sep1)
        .addTextDisplayComponents(nowText);

      // ── Up next
      if (slice.length > 0) {
        const lines = slice.map((t, i) =>
          `\`${start + i + 1}\` [${t.title}](${t.uri || t.url}) — \`${convertTime(t.length || 0)}\``
        ).join('\n');

        container
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${e.note || '🎵'} **Up Next**\n${lines}`)
          );
      } else if (queue.length === 0) {
        container
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*No tracks queued. Use \`/play\` to add more!*`)
          );
      }

      return container;
    }

    function buildNavRow() {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('home')
          .setEmoji(e.info || 'ℹ️')
          .setLabel('First')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('previous')
          .setEmoji(e.previous || '⏮️')
          .setLabel('Prev')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('next')
          .setEmoji(e.skip || '⏭️')
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('close')
          .setEmoji(e.stop || '⏹️')
          .setLabel('Close')
          .setStyle(ButtonStyle.Danger),
      );
    }

    const hasPages = pages > 1;
    const components = hasPages
      ? [buildContainer(0), buildNavRow()]
      : [buildContainer(0)];

    const queueMsg = await message.channel.send({
      components,
      flags: MessageFlags.IsComponentsV2,
    });

    if (!hasPages) return;

    const collector = queueMsg.createMessageComponentCollector({
      filter: (b) => {
        if (b.user.id === message.author.id) return true;
        const c = new ContainerBuilder()
          .setAccentColor(0x5B2D8E)
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`**${e.cross} Only ${message.author.tag} can use these buttons.**`)
          );
        b.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        return false;
      },
      idle: 30000,
    });

    collector.on('collect', async (btn) => {
      if (!btn.deferred) await btn.deferUpdate().catch(() => {});

      if      (btn.customId === 'home')     page = 0;
      else if (btn.customId === 'previous') page = page > 0 ? page - 1 : pages - 1;
      else if (btn.customId === 'next')     page = page + 1 < pages ? page + 1 : 0;
      else if (btn.customId === 'close') {
        collector.stop();
        return queueMsg.delete().catch(() => {});
      }

      await queueMsg.edit({
        components: [buildContainer(page), buildNavRow()],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    });

    collector.on('end', () => {
      queueMsg.edit({ components: [buildContainer(page)] }).catch(() => {});
    });
  },
};
