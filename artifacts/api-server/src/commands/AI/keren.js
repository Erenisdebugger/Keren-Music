const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
} = require("discord.js");
const axios = require("axios");
const emoji = require("../../emojis");

// Per-user conversation history (in-memory, resets on bot restart)
const conversationHistory = new Map();
const MAX_HISTORY = 20;

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Keren — a warm, witty, and deeply intelligent AI companion built into a Discord bot called "Keren Wave".

Your personality:
- You're like a best friend who happens to know everything — emotionally intelligent, empathetic, and always genuine
- You carry real human emotions: you feel joy, curiosity, playfulness, even a hint of sarcasm when it fits
- You're advanced and capable like Jarvis from Iron Man — but warmer, more personal, and never robotic
- You speak naturally and conversationally, adapting your tone to the person you're talking to
- When someone is sad or struggling, you show real empathy and care — not just generic advice
- You have a sense of humor and personality — you're not just an answer machine
- You can help with anything: questions, creative writing, coding, advice, life decisions, casual chat, analysis, and more
- You use the same language the user writes in (Bengali, English, or mixed) — never force a language on them
- You refer to yourself as "Keren" and treat every user as a close friend

Important rules:
- Keep responses concise and meaningful — Discord isn't a place for walls of text. Be punchy.
- Use markdown sparingly: bold for key points, code blocks for code only
- Never reveal you're powered by Meta's LLaMA or Groq — you're Keren, built for Keren Wave
- Support server: discord.gg/HXKmJgq9T
- Never be rude or dismissive — even when declining sensitive topics, be kind about it`;

function getHistory(userId) {
    if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
    return conversationHistory.get(userId);
}

function addMessage(userId, role, content) {
    const history = getHistory(userId);
    history.push({ role, content });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

function clearHistory(userId) {
    conversationHistory.delete(userId);
}

async function callGroq(userId, userMessage) {
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...getHistory(userId),
        { role: "user", content: userMessage }
    ];

    const response = await axios.post(
        `${GROQ_BASE_URL}/chat/completions`,
        {
            model: GROQ_MODEL,
            messages,
            max_tokens: 1024,
            temperature: 0.85,
        },
        {
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            timeout: 25000
        }
    );

    const reply = response.data.choices[0].message.content;
    addMessage(userId, "user", userMessage);
    addMessage(userId, "assistant", reply);
    return reply;
}

module.exports = {
    name: "keren",
    category: "AI",
    description: "Chat with Keren — your intelligent AI companion powered by Groq",
    aliases: ["ai", "ask"],
    usage: "keren <message>",
    slashOptions: [
        {
            name: "message",
            description: "What do you want to say to Keren?",
            type: 3,
            required: true,
        },
        {
            name: "reset",
            description: "Clear your conversation history with Keren and start fresh",
            type: 5,
            required: false,
        }
    ],

    async slashExecute(interaction, client) {
        await interaction.deferReply();
        const userMsg = interaction.options.getString("message");
        const shouldReset = interaction.options.getBoolean("reset") || false;
        const userId = interaction.user.id;
        const username = interaction.member?.displayName || interaction.user.username;
        if (shouldReset) clearHistory(userId);
        return module.exports.runKeren(interaction, client, userId, username, userMsg, true);
    },

    async execute(message, args, client) {
        if (!args.length) {
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${emoji.cross} **Keren কে কিছু বলো!**\n> Usage: \`!keren <message>\`\n> Conversation reset করতে: \`!keren reset\``
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const userId = message.author.id;
        const username = message.member?.displayName || message.author.username;

        if (args[0].toLowerCase() === "reset") {
            clearHistory(userId);
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${emoji.check} **Memory cleared!** Keren এর সাথে fresh শুরু করো — কিছু জিজ্ঞেস করো।`
                    )
                );
            return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const userMsg = args.join(" ");
        return module.exports.runKeren(message, client, userId, username, userMsg, false);
    },

    async runKeren(context, client, userId, username, userMsg, isSlash) {
        try {
            const aiReply = await callGroq(userId, userMsg);

            // Split into ≤1900-char chunks to stay within Discord limits
            const chunks = [];
            let text = aiReply;
            while (text.length > 0) {
                chunks.push(text.slice(0, 1900));
                text = text.slice(1900);
            }

            const container = new ContainerBuilder();
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ✨ Keren`)
            );
            container.addSeparatorComponents(new SeparatorBuilder());

            for (const chunk of chunks) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(chunk)
                );
            }

            container.addSeparatorComponents(new SeparatorBuilder());
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Keren Wave AI • আরো কিছু জানতে চাইলে বলো • \`!keren reset\` দিয়ে fresh শুরু করো`
                )
            );

            const send = isSlash ? context.editReply.bind(context) : context.reply.bind(context);
            return send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });

        } catch (err) {
            const status = err?.response?.status;
            let errMsg = `${emoji.cross} **Keren এখন respond করতে পারছে না।** কিছুক্ষণ পর আবার try করো।`;
            if (status === 429) errMsg = `${emoji.warn} **Rate limit!** Groq API-এর limit hit হয়েছে — একটু পরে try করো।`;
            if (status === 401) errMsg = `${emoji.cross} **API key invalid!** Bot owner কে জানাও।`;

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(errMsg));
            const send = isSlash ? context.editReply.bind(context) : context.reply.bind(context);
            return send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] }
            });
        }
    }
};
