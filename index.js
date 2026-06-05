const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ======================
// CONFIG
// ======================
const BYPASS_ROLE_ID = "1510749036179755101";

// in-memory strike storage (resets if bot restarts)
const strikes = new Map();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('Managed by Duck');
});

// ======================
// MUTE FUNCTION (5 MINUTES)
// ======================
async function muteMember(member, timeMs = 300000) {
    try {
        const muteRole = member.guild.roles.cache.find(r => r.name === "Muted");

        if (!muteRole) {
            console.log("No Muted role found!");
            return;
        }

        await member.roles.add(muteRole);

        setTimeout(async () => {
            await member.roles.remove(muteRole).catch(() => {});
        }, timeMs);

    } catch (err) {
        console.log("Mute error:", err);
    }
}

// ======================
// MESSAGE SYSTEM
// ======================
client.on('messageCreate', async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const member = message.member;
    const hasBypass = member.roles.cache.has(BYPASS_ROLE_ID);

    if (hasBypass) return;

    const userId = message.author.id;

    const linkRegex = /(https?:\/\/[^\s]+)/gi;
    const isLink = linkRegex.test(message.content);

    const isPingSpam =
        message.mentions.everyone ||
        message.content.includes('@everyone') ||
        message.content.includes('@here');

    const isSpam = message.content.split(' ').length > 30;

    let violation = false;
    let reason = "";

    // ======================
    // DETECT VIOLATIONS
    // ======================
    if (isLink) {
        violation = true;
        reason = "Sending links";
    }

    if (isPingSpam) {
        violation = true;
        reason = "Mass pinging";
    }

    if (isSpam) {
        violation = true;
        reason = "Spam detected";
    }

    if (!violation) return;

    // DELETE MESSAGE
    message.delete().catch(() => {});

    // STRIKE SYSTEM
    let userStrikes = strikes.get(userId) || 0;
    userStrikes++;
    strikes.set(userId, userStrikes);

    // WARNING MESSAGE IN CHAT
    message.channel.send(
        `⚠️ <@${userId}> Warning (${userStrikes}/3): ${reason}`
    );

    // ======================
    // 3 STRIKES = MUTE
    // ======================
    if (userStrikes >= 3) {

        const memberObj = message.member;

        message.channel.send(
            `🔇 <@${userId}> has been muted for 5 minutes (3 strikes reached).`
        );

        await muteMember(memberObj, 300000);

        strikes.set(userId, 0); // reset after mute
    }
});

client.login(process.env.TOKEN);