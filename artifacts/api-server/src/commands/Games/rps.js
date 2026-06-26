const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  ComponentType
} = require("discord.js");

const CHOICES = {
  rock:     { label: "🪨 Rock",     beats: "scissors", emoji: "🪨" },
  paper:    { label: "📄 Paper",    beats: "rock",     emoji: "📄" },
  scissors: { label: "✂️ Scissors", beats: "paper",    emoji: "✂️" }
};

module.exports = {
  name: "rps",
  aliases: ["rockpaperscissors"],
  category: "Games",
  description: "Play Rock Paper Scissors against the bot or another user!",
  args: false,
  usage: "rps [@opponent]",
  noSlash: true,

  async execute(message, args, client) {
    const opponent = message.mentions.users.first();
    const vsBot = !opponent || opponent.bot;

    if (opponent && opponent.id === message.author.id) {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${client.emoji.cross} You can't play against yourself!**`)
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    const p1 = message.author;
    const p2 = vsBot ? client.user : opponent;

    const makeChoiceRow = (disabled = false) => new ActionRowBuilder().addComponents(
      ...Object.entries(CHOICES).map(([key, val]) =>
        new ButtonBuilder()
          .setCustomId(`rps_${key}`)
          .setLabel(val.label)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled)
      )
    );

    const getResult = (c1, c2) => {
      if (c1 === c2) return "draw";
      if (CHOICES[c1].beats === c2) return "win";
      return "lose";
    };

    if (vsBot) {
      const promptContainer = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ✊ Rock Paper Scissors\n` +
            `**${p1.username}** vs **Keren Wave Bot**\n` +
            `-# Choose your move!`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(makeChoiceRow());

      const msg = await message.reply({
        components: [promptContainer],
        flags: MessageFlags.IsComponentsV2
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.customId.startsWith("rps_") && i.user.id === p1.id,
        time: 60000,
        max: 1
      });

      collector.on("collect", async i => {
        const p1Choice = i.customId.replace("rps_", "");
        const botKeys = Object.keys(CHOICES);
        const botChoice = botKeys[Math.floor(Math.random() * botKeys.length)];
        const result = getResult(p1Choice, botChoice);

        const resultText = result === "win"
          ? `🏆 **${p1.username} wins!**`
          : result === "lose"
          ? `💀 **Keren Wave wins!** Better luck next time.`
          : `🤝 **It's a draw!**`;

        const resultContainer = new ContainerBuilder()
          .setAccentColor(result === "win" ? 0x57F287 : result === "lose" ? 0xED4245 : 0x5B2D8E)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ✊ Rock Paper Scissors — Result\n` +
              `${p1.username}: ${CHOICES[p1Choice].emoji} **${p1Choice}**  vs  Bot: ${CHOICES[botChoice].emoji} **${botChoice}**\n\n` +
              `${resultText}`
            )
          )
          .addActionRowComponents(makeChoiceRow(true));

        return i.update({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 });
      });

      collector.on("end", (col, reason) => {
        if (reason === "time" && col.size === 0) {
          const timeoutContainer = new ContainerBuilder()
            .setAccentColor(0x5B2D8E)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`### ⏰ Timed out!\n-# ${p1.username} didn't choose in time.`)
            )
            .addActionRowComponents(makeChoiceRow(true));
          msg.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        }
      });

    } else {
      // PvP mode — both players choose privately via DM or same message
      const picks = {};

      const promptContainer = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ✊ Rock Paper Scissors\n` +
            `**${p1.username}** vs **${p2.username}**\n` +
            `-# Both players: click your move (hidden until both choose)!`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(makeChoiceRow());

      const msg = await message.reply({
        components: [promptContainer],
        flags: MessageFlags.IsComponentsV2
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.customId.startsWith("rps_") && [p1.id, p2.id].includes(i.user.id),
        time: 60000
      });

      collector.on("collect", async i => {
        const key = i.customId.replace("rps_", "");
        if (picks[i.user.id]) {
          const alreadyPicked = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.info} You already picked! Waiting for the other player...`));
          return i.reply({ components: [alreadyPicked], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
        }

        picks[i.user.id] = key;
        const ackContainer = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.check} Got your pick: ${CHOICES[key].emoji} Waiting for other player...**`));
        await i.reply({ components: [ackContainer], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

        if (picks[p1.id] && picks[p2.id]) {
          collector.stop("done");
          const c1 = picks[p1.id], c2 = picks[p2.id];
          const r1 = getResult(c1, c2);

          const resultText = r1 === "win"
            ? `🏆 **${p1.username} wins!**`
            : r1 === "lose"
            ? `🏆 **${p2.username} wins!**`
            : `🤝 **It's a draw!**`;

          const resultContainer = new ContainerBuilder()
            .setAccentColor(0x5B2D8E)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `### ✊ Rock Paper Scissors — Result\n` +
                `${p1.username}: ${CHOICES[c1].emoji} **${c1}**  vs  ${p2.username}: ${CHOICES[c2].emoji} **${c2}**\n\n` +
                `${resultText}`
              )
            )
            .addActionRowComponents(makeChoiceRow(true));

          msg.edit({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        }
      });

      collector.on("end", (col, reason) => {
        if (reason === "time") {
          const missing = [p1, p2].filter(u => !picks[u.id]).map(u => u.username).join(" & ");
          const timeoutContainer = new ContainerBuilder()
            .setAccentColor(0x5B2D8E)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`### ⏰ Timed out!\n-# ${missing} didn't respond in time.`)
            )
            .addActionRowComponents(makeChoiceRow(true));
          msg.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        }
      });
    }
  },
};
