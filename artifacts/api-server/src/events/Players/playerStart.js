const {
  WebhookClient,
  ComponentType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
} = require("discord.js");
const { player_create } = require("../../config").Webhooks;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms) {
  if (!ms || ms === 0) return 'Live';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function cleanAuthor(author) {
  if (!author) return 'Unknown Artist';
  return author.replace(/\s*-\s*Topic\s*$/i, '').trim();
}

function truncateTitle(title, max = 45) {
  if (!title) return 'Unknown';
  return title.length > max ? title.slice(0, max) + '…' : title;
}

function getMaxresThumbnail(url) {
  if (!url) return null;
  const m = url.match(/vi\/([^/]+)\//);
  if (m) return `https://i.ytimg.com/vi/${m[1]}/maxresdefault.jpg`;
  return url;
}

function getSourceLabel(track) {
  const uri = track.uri || track.url || '';
  if (uri.includes('spotify.com'))    return 'Spotify';
  if (uri.includes('soundcloud.com')) return 'SoundCloud';
  if (uri.includes('deezer.com'))     return 'Deezer';
  if (uri.includes('music.apple'))    return 'Apple Music';
  if (uri.includes('youtu'))          return 'YouTube';
  return track.sourceName || 'Unknown';
}

// ─── Button row ─────────────────────────────────────────────────────────────

function createButtonRow(client, paused) {
  const e = client.emoji;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('previous')
      .setEmoji(e.previous)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(paused ? 'resume' : 'pause')
      .setEmoji(paused ? e.play : e.pause)
      .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('skip')
      .setEmoji(e.skip)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('like')
      .setEmoji(e.like)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('stop')
      .setEmoji(e.stop)
      .setStyle(ButtonStyle.Danger),
  );
}

// ─── Now-Playing container ───────────────────────────────────────────────────

function buildNowPlayingContainer(client, track, paused) {
  const e = client.emoji;

  // Header line
  const headerDisplay = new TextDisplayBuilder()
    .setContent(`${e.wave || '🌊'} **Now Playing** ${paused ? `— *Paused*` : ''}`);

  // Track title + info section (with thumbnail)
  const titleDisplay = new TextDisplayBuilder()
    .setContent(`### [${truncateTitle(track.title)}](${track.uri || track.url})`);

  const duration  = formatDuration(track.length || track.duration || 0);
  const author    = cleanAuthor(track.author);
  const requester = track.requester;
  const source    = getSourceLabel(track);

  const infoDisplay = new TextDisplayBuilder()
    .setContent(
      `${e.note || '🎵'} **${author}**\n` +
      `${e.duration || '⏱️'} \`${duration}\`  •  ` +
      `${e.user || '👤'} [${requester?.username ?? 'Unknown'}](https://discord.com/users/${requester?.id ?? '0'})\n` +
      `${e.headset || '🎧'} ${source}`
    );

  const section = new SectionBuilder()
    .addTextDisplayComponents(titleDisplay, infoDisplay);

  const thumb = getMaxresThumbnail(track.thumbnail || track.artworkUrl || track.image);
  if (thumb) {
    section.setThumbnailAccessory(t => t.setURL(thumb));
  }

  const container = new ContainerBuilder()
    .setAccentColor(0x5B2D8E)
    .addTextDisplayComponents(headerDisplay)
    .addSeparatorComponents(new SeparatorBuilder())
    .addSectionComponents(section)
    .addActionRowComponents(createButtonRow(client, paused));

  return container;
}

// ─── Send / update helpers ───────────────────────────────────────────────────

async function sendNowPlaying(client, player, track) {
  try {
    const channel = client.channels.cache.get(player.textId);
    if (!channel) return null;

    const message = await channel.send({
      components: [buildNowPlayingContainer(client, track, player.paused || false)],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => null);

    player.data?.set('currentTrack', track);
    return message;
  } catch { return null; }
}

async function updateNowPlayingButtons(client, player, paused) {
  try {
    const msg   = player.data?.get('message');
    const track = player.data?.get('currentTrack') || player.queue?.current;
    if (!msg || !track) return;
    await msg.edit({
      components: [buildNowPlayingContainer(client, track, paused)],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  } catch {}
}

// ─── Button interaction handler ──────────────────────────────────────────────

function ephemeral(client, text) {
  const display = new TextDisplayBuilder().setContent(text);
  const container = new ContainerBuilder()
    .setAccentColor(0x5B2D8E)
    .addTextDisplayComponents(display);
  return { components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

async function handleButtonInteraction(interaction, player, client) {
  const e = client.emoji;
  try {
    switch (interaction.customId) {
      case 'pause':
        if (player.paused) return interaction.deferUpdate();
        player.pause(true);
        await updateNowPlayingButtons(client, player, true);
        await interaction.deferUpdate();
        break;

      case 'resume':
        if (!player.paused) return interaction.deferUpdate();
        player.pause(false);
        await updateNowPlayingButtons(client, player, false);
        await interaction.deferUpdate();
        break;

      case 'skip':
        if (!player.queue?.current) return interaction.deferUpdate();
        player.skip();
        await interaction.deferUpdate();
        break;

      case 'stop':
        try {
          player.queue?.clear();
          if (player.setLoop) player.setLoop('none'); else player.loop = 'none';
          const { safeDestroyPlayer } = require('../../utils/playerUtils');
          await safeDestroyPlayer(player);
          await interaction.deferUpdate();
        } catch { await interaction.deferUpdate(); }
        break;

      case 'previous': {
        const history = player.data?.get('history') || [];
        if (history.length === 0) {
          return interaction.reply(ephemeral(client, `**${e.info} No previous track in history.**`));
        }
        const lastTrack = history[history.length - 1];
        try {
          const result = await client.manager.search(lastTrack.uri, { requester: interaction.user });
          if (result?.tracks?.length > 0) {
            player.queue.unshift(result.tracks[0]);
            history.pop();
            player.data?.set('history', history);
            await player.skip();
          }
        } catch {}
        await interaction.deferUpdate();
        break;
      }

      case 'like': {
        const track = player.queue?.current;
        if (!track) return interaction.deferUpdate();
        try {
          const songs = client.db.liked.get(interaction.user.id);
          const url   = track.uri || track.url;
          if (songs.some(s => s.url === url)) {
            return interaction.reply(ephemeral(client, `**${e.info} \`${track.title}\` is already in your favourites.**`));
          }
          songs.push({
            title: track.title, url,
            duration: track.length || track.duration,
            thumbnail: track.thumbnail || track.artworkUrl || track.image,
            author: track.author,
            addedAt: new Date().toISOString(),
          });
          client.db.liked.set(interaction.user.id, songs);
          return interaction.reply(ephemeral(client, `**${e.check} Added \`${track.title}\` to your favourites.**`));
        } catch (err) {
          return interaction.reply(ephemeral(client, `**${e.cross} Failed to save to favourites.**`)).catch(() => {});
        }
      }

      default:
        await interaction.deferUpdate();
    }
  } catch (error) {
    const payload = ephemeral(client, `**${e.cross} An error occurred.**`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(payload).catch(() => {});
    } else {
      await interaction.editReply(payload).catch(() => {});
    }
  }
}

// ─── Collector setup ─────────────────────────────────────────────────────────

function setupMessageCollector(client, player, message) {
  try {
    const e = client.emoji;
    const track = player.queue?.current;
    const collector = message.createMessageComponentCollector({
      time: Math.min(track?.length || track?.duration || 600000, 900000),
      componentType: ComponentType.Button,
    });

    collector.on('collect', async (interaction) => {
      try {
        if (!interaction.member?.voice?.channelId || interaction.member.voice.channelId !== player.voiceId) {
          return interaction.reply(ephemeral(client, `**${e.warn} You must be in the same voice channel as the bot.**`));
        }
        await handleButtonInteraction(interaction, player, client);
      } catch {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply(ephemeral(client, `**${e.cross} An error occurred.**`)).catch(() => {});
        }
      }
    });
  } catch {}
}

// ─── Voice status ────────────────────────────────────────────────────────────

async function updateVoiceStatus(client, player, track) {
  try {
    if (!player.voiceId) return;
    if (player.state === 'DESTROYED' || player.state === 'DISCONNECTED') return;
    await client.rest.put(`/channels/${player.voiceId}/voice-status`, {
      body: { status: `${client.emoji.note || '🎵'} Playing **${track.title}**` },
    }).catch(() => {});
  } catch {}
}

// ─── Main track-start handler ────────────────────────────────────────────────

async function handleTrackStart(client, player, track) {
  try {
    if (!track) return;
    player.data?.delete('playerEmptyProcessed');

    const oldMessage = player.data?.get('message');
    if (oldMessage) oldMessage.delete().catch(() => {});

    if (client.voiceHealthMonitor) client.voiceHealthMonitor.updateActivity(player.guildId);

    await updateVoiceStatus(client, player, track);

    const message = await sendNowPlaying(client, player, track);
    if (!message) return;

    player.data?.set('message', message);
    setupMessageCollector(client, player, message);
  } catch (err) {
    console.error('[HandleTrackStart]', err);
  }
}

// ─── Event export ────────────────────────────────────────────────────────────

module.exports = {
  name: 'playerStart',
  run: async (client, player, track) => {
    try {
      const guild = client.guilds.cache.get(player.guildId);
      if (!guild) return;

      if (!player.data?.get('playerStarted')) {
        player.data?.set('playerStarted', true);

        if (player_create) {
          const webhook = new WebhookClient({ url: player_create });
          const embed = new EmbedBuilder()
            .setColor(client.color)
            .setAuthor({ name: 'Player Started', iconURL: client.user.displayAvatarURL() })
            .setDescription(`**Server:** \`${guild.name}\`\n**ID:** \`${player.guildId}\``);
          webhook.send({ embeds: [embed] }).catch(() => {});
        }
      }

      const currentTrack = track || player.queue?.current;
      if (currentTrack) await handleTrackStart(client, player, currentTrack);
    } catch {}
  },
};

module.exports.updateNowPlayingButtons = updateNowPlayingButtons;
