const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "addowner",
  aliases: ["addop", "removeowner", "removeop", "delowner"],
  category: "Owner",
  description: "Add or remove a bot owner dynamically.",
  args: true,
  usage: "addowner <userID | @mention>  |  removeowner <userID | @mention>",
  owner: true,
  noSlash: true,

  async execute(message, args, client) {
    if (!client.config.ownerID.includes(message.author.id)) return;

    const isRemove = ["removeowner", "removeop", "delowner"].includes(
      message.content.split(/\s+/)[0].replace(/^[!.?$%^&]/, "").toLowerCase()
    );

    const raw = args[0];
    if (!raw) {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.cross} Usage:**\n` +
            `\`${client.prefix}addowner <userID | @mention>\`\n` +
            `\`${client.prefix}removeowner <userID | @mention>\``
          )
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    const userId = raw.replace(/[<@!>]/g, "");
    let target;
    try {
      target = await client.users.fetch(userId);
    } catch {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.cross} User not found.** Check the ID or mention.`
          )
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (target.bot) {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${client.emoji.cross} Cannot add bots as owners.**`)
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (isRemove) {
      if (client.config.ownerID.includes(target.id)) {
        const c = new ContainerBuilder()
          .setAccentColor(0x5B2D8E)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**${client.emoji.warn} \`${target.tag}\` is a core owner and cannot be removed dynamically.**`
            )
          );
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
      }

      if (!client.owners.includes(target.id)) {
        const c = new ContainerBuilder()
          .setAccentColor(0x5B2D8E)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**${client.emoji.info} \`${target.tag}\` is not a bot owner.**`
            )
          );
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
      }

      client.db.dynowners.remove(target.id);
      client.owners = client.owners.filter(id => id !== target.id);

      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.check} Removed \`${target.tag}\` from bot owners.**\n` +
            `-# Total owners: ${client.owners.length}`
          )
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });

    } else {
      if (client.owners.includes(target.id)) {
        const c = new ContainerBuilder()
          .setAccentColor(0x5B2D8E)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**${client.emoji.info} \`${target.tag}\` is already a bot owner.**`
            )
          );
        return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
      }

      client.db.dynowners.add(target.id, message.author.id);
      client.owners.push(target.id);

      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.check} Added \`${target.tag}\` as a bot owner.**\n` +
            `They can now run owner commands and DM users via the bot.\n` +
            `-# Total owners: ${client.owners.length}`
          )
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
