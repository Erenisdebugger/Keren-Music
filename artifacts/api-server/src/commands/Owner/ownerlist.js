const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "ownerlist",
  aliases: ["owners", "ownerls"],
  category: "Owner",
  description: "List all current bot owners.",
  args: false,
  usage: "",
  owner: true,
  noSlash: true,

  async execute(message, args, client) {
    if (!client.owners.includes(message.author.id)) return;

    const dynList = client.db.dynowners.list();
    const dynIds = dynList.map(o => o.userId);

    const ownerLines = await Promise.all(
      client.owners.map(async (id, i) => {
        let user;
        try { user = await client.users.fetch(id); } catch { user = null; }
        const tag = user ? `**${user.username}** \`(${id})\`` : `Unknown \`(${id})\``;
        const type = client.config.ownerID.includes(id) ? "Core" : "Dynamic";
        const typeLabel = type === "Core" ? "👑 Core" : "⚡ Dynamic";
        return `**\`${i + 1}.\`** ${tag} — ${typeLabel}`;
      })
    );

    const c = new ContainerBuilder()
      .setAccentColor(0x5B2D8E)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${client.emoji.owner || '👑'} Bot Owners [${client.owners.length}]\n` +
          `-# Requested by ${message.author.username}`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(ownerLines.join("\n"))
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# 👑 Core = set in config.json  •  ⚡ Dynamic = added via ${client.prefix}addowner`
        )
      );

    return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
  },
};
