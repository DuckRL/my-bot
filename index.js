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
const MUTE_ROLE_ID = "1512296321334378567";
const DATA_FILE = "./logs.json";

// ======================
// SAFE FILE SYSTEM
// ======================
function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return data ? JSON.parse(data) : {};
    } catch (err) {
        console.log("LOAD ERROR:", err);
        return {};
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.log("SAVE ERROR:", err);
    }
}

let logs = loadData();

// ======================
// READY EVENT
// ======================
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('Managed by Duck');
});

// ======================
// MUTE SYSTEM
// ======================
async function muteMember(member, timeMs = 300000) {
    try {
        const role = member.guild.roles.cache.get(MUTE_ROLE_ID);
        if (!role) return;

        await member.roles.add(role);

        setTimeout(() => {
            member.roles.remove(role).catch(() => {});
        }, timeMs);

    } catch (err) {
        console.log("Mute error:", err);
    }
}

// ======================
// ANTI-ABUSE SYSTEM
// ======================
client.on('messageCreate', async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const member = message.member;
    const userId = message.author.id;

    const hasBypass = member.roles.cache.has(BYPASS_ROLE_ID);
    if (hasBypass) return;

    let user = logs[userId] || {
        strikes: 0,
        warnings: 0,
        mutes: 0,
        kicks: 0,
        bans: 0
    };

    const linkRegex = /(https?:\/\/[^\s]+)/gi;

    let reason = null;

    if (linkRegex.test(message.content)) {
        reason = "Sending links";
    }

    if (message.mentions.everyone || message.content.includes("@here")) {
        reason = "Mass pinging";
    }

    if (message.content.split(' ').length > 30) {
        reason = "Spam detected";
    }

    if (!reason) return;

    // DELETE MESSAGE
    message.delete().catch(() => {});

    // UPDATE STATS
    user.strikes += 1;
    user.warnings += 1;

    message.channel.send(
        `⚠️ <@${userId}> Warning (${user.strikes}/3): ${reason}`
    );

    // MUTE AT 3 STRIKES
    if (user.strikes >= 3) {

        user.mutes += 1;

        message.channel.send(
            `🔇 <@${userId}> muted for 5 minutes (3 strikes reached).`
        );

        await muteMember(member, 300000);

        user.strikes = 0;
    }

    logs[userId] = user;
    saveData(logs);
});

// ======================
// !MLOGS COMMAND
// ======================
client.on('messageCreate', async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    if (!message.content.startsWith('!mlogs')) return;

    const target = message.mentions.users.first() || message.author;
    const data = logs[target.id];

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
});

client.login(process.env.TOKEN);