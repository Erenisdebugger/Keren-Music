const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  MessageFlags,
} = require('discord.js');
const { convertTime } = require('../../utils/convert.js');

module.exports = {
  name: 'nowplaying',
  aliases: ['np'],
  category: 'Music',
  description: 'Show the current playing song',
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
    const e      = client.emoji;
    const player = client.manager.players.get(message.guild.id);

    if (!player?.queue?.current) {
      const container = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${e.cross} Nothing is playing right now.**`)
        );
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const track    = player.queue.current;
    const duration = track.length || 0;
    const BAR_LEN  = 28;

    function makeProgressBar() {
      const pos     = player.position || 0;
      const pct     = duration > 0 ? Math.min(pos / duration, 1) : 0;
      const filled  = Math.round(BAR_LEN * pct);
      const bar     = '━'.repeat(filled) + '⬤' + '─'.repeat(BAR_LEN - filled);
      return { bar, pos: convertTime(pos), total: convertTime(duration) };
    }

    function getSourceLabel(t) {
      const uri = t.uri || t.url || '';
      if (uri.includes('spotify.com'))    return `${e.headset || '🎧'} Spotify`;
      if (uri.includes('soundcloud.com')) return `${e.headset || '🎧'} SoundCloud`;
      if (uri.includes('deezer.com'))     return `${e.headset || '🎧'} Deezer`;
      if (uri.includes('music.apple'))    return `${e.headset || '🎧'} Apple Music`;
      return `${e.headset || '🎧'} YouTube`;
    }

    function cleanAuthor(a) {
      return (a || 'Unknown').replace(/\s*-\s*Topic\s*$/i, '').trim();
    }

    function buildContainer(prog) {
      const loopMode = player.loop || 'none';
      const loopTag  = loopMode !== 'none'
        ? ` • ${e.loop || '🔁'} *${loopMode} loop*`
        : '';
      const volTag   = player.volume !== undefined ? ` • ${e.volup || '🔊'} ${player.volume}%` : '';

      const header = new TextDisplayBuilder()
        .setContent(`${e.wave || '🌊'} **Now Playing**${loopTag}${volTag}`);

      const titleText = `### [${track.title}](${track.uri || track.url})`;
      const infoText  =
        `${e.note || '🎵'} **${cleanAuthor(track.author)}**\n` +
        `${e.duration || '⏱️'} \`${prog.total}\`  •  ` +
        `${e.user || '👤'} [${track.requester?.username ?? 'Unknown'}](https://discord.com/users/${track.requester?.id ?? '0'})\n` +
        `${getSourceLabel(track)}`;

      const titleDisplay = new TextDisplayBuilder().setContent(titleText);
      const infoDisplay  = new TextDisplayBuilder().setContent(infoText);

      const section = new SectionBuilder()
        .addTextDisplayComponents(titleDisplay, infoDisplay);

      const thumb = track.thumbnail || track.artworkUrl || track.image;
      if (thumb) {
        const clean = (() => {
          const m = thumb.match(/vi\/([^/]+)\//);
          return m ? `https://i.ytimg.com/vi/${m[1]}/maxresdefault.jpg` : thumb;
        })();
        section.setThumbnailAccessory(t => t.setURL(clean));
      }

      const progressText = new TextDisplayBuilder()
        .setContent(`\`${prog.pos}\` ${prog.bar} \`${prog.total}\``);

      return new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(header)
        .addSeparatorComponents(new SeparatorBuilder())
        .addSectionComponents(section)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(progressText);
    }

    // Send initial message
    const prog  = makeProgressBar();
    const npmsg = await message.reply({
      components: [buildContainer(prog)],
      flags: MessageFlags.IsComponentsV2,
    });

    // Live-update progress bar every 5s for up to 5 minutes
    const interval = setInterval(() => {
      if (!player?.playing || !npmsg) { clearInterval(interval); return; }
      npmsg.edit({
        components: [buildContainer(makeProgressBar())],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => clearInterval(interval));
    }, 5000);

    const cleanup = () => clearInterval(interval);

    const collector = npmsg.createMessageComponentCollector({ time: 300000 });
    collector.on('end', cleanup);

    const stopOn = (p) => { if (p.guildId === message.guild.id) cleanup(); };
    client.manager.on('playerEnd',     stopOn);
    client.manager.on('playerStop',    stopOn);
    client.manager.on('playerEmpty',   stopOn);
    client.manager.on('playerDestroy', stopOn);
    collector.once('end', () => {
      client.manager.off('playerEnd',     stopOn);
      client.manager.off('playerStop',    stopOn);
      client.manager.off('playerEmpty',   stopOn);
      client.manager.off('playerDestroy', stopOn);
    });
  },
};
