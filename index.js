const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ======================
// CONFIG
// ======================
const BYPASS_ROLE_ID = "1510749036179755101";

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('Managed by Duck');
});

// ======================
// MESSAGE DEFENSE SYSTEM
// ======================
client.on('messageCreate', async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const member = message.member;

    // If user has bypass role → ignore all checks
    const hasBypass = member.roles.cache.has(BYPASS_ROLE_ID);

    // ======================
    // LINK DETECTION
    // ======================
    const linkRegex = /(https?:\/\/[^\s]+)/gi;

    if (!hasBypass && linkRegex.test(message.content)) {
        message.reply("⚠️ Warning: Sending links is not allowed.");
        return;
    }

    // ======================
    // MASS PING DETECTION
    // ======================
    if (!hasBypass) {

        if (
            message.mentions.everyone ||
            message.content.includes('@everyone') ||
            message.content.includes('@here')
        ) {
            message.reply("⚠️ Warning: Mass pings are not allowed.");
            return;
        }
    }

    // ======================
    // BASIC SPAM DETECTION
    // ======================
    if (!hasBypass) {

        const words = message.content.split(' ');

        // spam = repeated message spam (simple version)
        if (words.length > 30) {
            message.reply("⚠️ Warning: Possible spam detected.");
            return;
        }
    }
});

client.login(process.env.TOKEN);