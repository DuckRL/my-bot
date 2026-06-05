const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

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
const DATA_FILE = "./logs.json";

// ======================
// LOAD / SAVE DATA
// ======================
function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ensure file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "{}");
}

const strikes = new Map(loadData());

// ======================
// READY
// ======================
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('Managed by Duck');
});

// ======================
// MUTE FUNCTION
// ======================
async function muteMember(member, timeMs = 300000) {
    const muteRole = member.guild.roles.cache.find(r => r.name === "Muted");
    if (!muteRole) return;

    await member.roles.add(muteRole);

    setTimeout(() => {
        member.roles.remove(muteRole).catch(() => {});
    }, timeMs);
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

    let userData = strikes.get(userId) || {
        strikes: 0,
        warnings: 0,
        mutes: 0,
        kicks: 0,
        bans: 0
    };

    const linkRegex = /(https?:\/\/[^\s]+)/gi;

    let violation = false;
    let reason = "";

    if (linkRegex.test(message.content)) {
        violation = true;
        reason = "Sending links";
    }

    if (message.mentions.everyone || message.content.includes('@here')) {
        violation = true;
        reason = "Mass pinging";
    }

    if (message.content.split(' ').length > 30) {
        violation = true;
        reason = "Spam detected";
    }

    if (violation) {

        message.delete().catch(() => {});

        userData.strikes += 1;
        userData.warnings += 1;

        message.channel.send(
            `⚠️ <@${userId}> Warning (${userData.strikes}/3): ${reason}`
        );

        // 3 STRIKES = MUTE
        if (userData.strikes >= 3) {
            userData.mutes += 1;

            message.channel.send(
                `🔇 <@${userId}> muted for 5 minutes (3 strikes reached).`
            );

            await muteMember(member, 300000);

            userData.strikes = 0;
        }

        strikes.set(userId, userData);
        saveData(Object.fromEntries(strikes));
    }

    // ======================
    // !mlogs COMMAND
    // ======================
    if (message.content.startsWith('!mlogs')) {

        const target = message.mentions.users.first() || message.author;
        const data = strikes.get(target.id);

        if (!data) {
            return message.channel.send(`📊 No logs found for ${target.tag}`);
        }

        const embed = {
            color: 0x0099ff,
            title: `📊 Moderation Logs - ${target.tag}`,
            fields: [
                { name: "Warnings", value: `${data.warnings}`, inline: true },
                { name: "Strikes", value: `${data.strikes}`, inline: true },
                { name: "Mutes", value: `${data.mutes}`, inline: true },
                { name: "Kicks", value: `${data.kicks}`, inline: true },
                { name: "Bans", value: `${data.bans}`, inline: true }
            ],
            timestamp: new Date()
        };

        message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);