const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "dm",
  category: "Owner",
  aliases: ["directmessage", "sendmsg"],
  description: "Send a DM to any user via the bot (owner only).",
  args: true,
  usage: "dm <userID | @mention> <message>",
  owner: true,
  noSlash: true,

  async execute(message, args, client) {
    if (!client.owners.includes(message.author.id)) return;

    // ── Parse target user ────────────────────────────────────────────────────
    const raw = args[0];
    if (!raw) {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.cross} Usage:** \`${client.prefix}dm <userID | @mention> <message>\``
          )
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    const userId = raw.replace(/[<@!>]/g, '');
    const content = args.slice(1).join(' ');

    if (!content) {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.warn} Please provide a message to send.**`
          )
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    // ── Fetch the target user ────────────────────────────────────────────────
    let target;
    try {
      target = await client.users.fetch(userId);
    } catch {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.cross} Could not find that user.** Make sure the ID or mention is correct.`
          )
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (target.bot) {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.cross} Cannot send DMs to bots.**`
          )
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    // ── Build the DM card ─────────────────────────────────────────────────────
    const dmCard = new ContainerBuilder()
      .setAccentColor(0x5B2D8E)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${client.emoji.wave || '🌊'} Message from Keren Wave\n` +
          `-# Sent via Keren OS — Official Bot Message`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content)
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# This message was sent by the Keren Wave team. Do not reply to this DM.`
        )
      );

    // ── Send the DM ──────────────────────────────────────────────────────────
    try {
      await target.send({
        components: [dmCard],
        flags: MessageFlags.IsComponentsV2
      });

      // Confirm in channel
      const confirm = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.check} DM sent to ${target.tag}** \`(${target.id})\`\n` +
            `> ${content}`
          )
        );
      return message.reply({ components: [confirm], flags: MessageFlags.IsComponentsV2 });

    } catch {
      const fail = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.cross} Failed to DM ${target.tag}.** They may have DMs disabled or have blocked the bot.`
          )
        );
      return message.reply({ components: [fail], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
