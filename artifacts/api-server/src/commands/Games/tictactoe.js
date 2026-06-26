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

const EMPTY = "⬛";
const X_MARK = "❌";
const O_MARK = "⭕";

function makeBoard() {
  return Array(9).fill(null);
}

function checkWinner(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function buildRows(board, disabled = false) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const val = board[idx];
      const btn = new ButtonBuilder()
        .setCustomId(`ttt_${idx}`)
        .setStyle(
          val === "X" ? ButtonStyle.Danger :
          val === "O" ? ButtonStyle.Success :
          ButtonStyle.Secondary
        )
        .setLabel(val === "X" ? X_MARK : val === "O" ? O_MARK : EMPTY)
        .setDisabled(disabled || val !== null);
    }
    row.addComponents(...Array.from({length:3}, (_,c) => {
      const idx = r*3+c;
      const val = board[idx];
      return new ButtonBuilder()
        .setCustomId(`ttt_${idx}`)
        .setStyle(val === "X" ? ButtonStyle.Danger : val === "O" ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setLabel(val === "X" ? X_MARK : val === "O" ? O_MARK : EMPTY)
        .setDisabled(disabled || val !== null);
    }));
    rows.push(row);
  }
  return rows;
}

function buildContainer(board, statusText, disabled = false, accentColor = 0x5B2D8E) {
  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(statusText)
    )
    .addSeparatorComponents(new SeparatorBuilder());

  const rows = buildRows(board, disabled);
  for (const row of rows) container.addActionRowComponents(row);
  return container;
}

module.exports = {
  name: "tictactoe",
  aliases: ["ttt", "xo"],
  category: "Games",
  description: "Play Tic-Tac-Toe against another user!",
  args: true,
  usage: "tictactoe <@opponent>",
  noSlash: true,

  async execute(message, args, client) {
    const opponent = message.mentions.users.first();
    if (!opponent) {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.cross} Mention someone to play against!**\n` +
            `Usage: \`${client.prefix}tictactoe @user\``
          )
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (opponent.bot) {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${client.emoji.cross} You can't play against a bot!**`)
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (opponent.id === message.author.id) {
      const c = new ContainerBuilder()
        .setAccentColor(0x5B2D8E)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${client.emoji.cross} You can't play against yourself!**`)
        );
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    const players = { X: message.author, O: opponent };
    let board = makeBoard();
    let currentTurn = "X";

    const statusText = () =>
      `### 🎮 Tic-Tac-Toe\n` +
      `${X_MARK} **${players.X.username}** vs ${O_MARK} **${players.O.username}**\n` +
      `-# Turn: ${currentTurn === "X" ? X_MARK + " " + players.X.username : O_MARK + " " + players.O.username}`;

    const container = buildContainer(board, statusText());

    const msg = await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.customId.startsWith("ttt_") && [players.X.id, players.O.id].includes(i.user.id),
      time: 300000
    });

    collector.on("collect", async i => {
      const expectedPlayer = currentTurn === "X" ? players.X : players.O;
      if (i.user.id !== expectedPlayer.id) {
        const err = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.warn} It's not your turn!**`));
        return i.reply({ components: [err], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
      }

      const idx = parseInt(i.customId.replace("ttt_", ""));
      if (board[idx] !== null) return;

      board[idx] = currentTurn;
      const winner = checkWinner(board);

      if (winner) {
        const winPlayer = players[winner];
        const endContainer = buildContainer(
          board,
          `### 🏆 Game Over!\n${winner === "X" ? X_MARK : O_MARK} **${winPlayer.username} wins!**\n-# ${players[winner === "X" ? "O" : "X"].username} better luck next time`,
          true,
          0x5B2D8E
        );
        collector.stop("won");
        return i.update({ components: [endContainer], flags: MessageFlags.IsComponentsV2 });
      }

      if (board.every(v => v !== null)) {
        const drawContainer = buildContainer(
          board,
          `### 🤝 It's a Draw!\n${X_MARK} **${players.X.username}** vs ${O_MARK} **${players.O.username}**\n-# Nobody wins this time`,
          true,
          0x5B2D8E
        );
        collector.stop("draw");
        return i.update({ components: [drawContainer], flags: MessageFlags.IsComponentsV2 });
      }

      currentTurn = currentTurn === "X" ? "O" : "X";
      const updated = buildContainer(board, statusText());
      return i.update({ components: [updated], flags: MessageFlags.IsComponentsV2 });
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") {
        const timeoutContainer = buildContainer(
          board,
          `### ⏰ Game Timed Out!\n-# ${players.X.username} vs ${players.O.username} — no response for 5 minutes`,
          true,
          0x5B2D8E
        );
        msg.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    });
  },
};
