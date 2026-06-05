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
// SAFE DB
// ======================
function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return raw ? JSON.parse(raw) : {};
    } catch {
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
// CASE SYSTEM
// ======================
function generateCaseNumber() {
    const count = Object.values(logs).reduce((a, b) => {
        return a + (b.cases ? b.cases.length : 0);
    }, 0);

    return `CASE-${String(count + 1).padStart(4, '0')}`;
}

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
    const role = member.guild.roles.cache.get(MUTE_ROLE_ID);
    if (!role) return;

    await member.roles.add(role);

    setTimeout(() => {
        member.roles.remove(role).catch(() => {});
    }, timeMs);
}

// ======================
// HELPERS
// ======================
function getUser(id) {
    if (!logs[id]) {
        logs[id] = {
            strikes: 0,
            warnings: 0,
            mutes: 0,
            kicks: 0,
            bans: 0,
            cases: []
        };
    }
    return logs[id];
}

// ======================
// MESSAGE SYSTEM
// ======================
client.on('messageCreate', async (message) => {

    if (message.author.bot || !message.guild) return;

    const member = message.member;
    const userId = message.author.id;

    if (member.roles.cache.has(BYPASS_ROLE_ID)) return;

    const linkRegex = /(https?:\/\/[^\s]+)/gi;

    let reason = null;

    if (linkRegex.test(message.content)) reason = "Sending links";
    if (message.mentions.everyone || message.content.includes("@here")) reason = "Mass pinging";
    if (message.content.split(' ').length > 30) reason = "Spam detected";

    if (!reason) return;

    message.delete().catch(() => {});

    const user = getUser(userId);

    user.strikes++;
    user.warnings++;

    const caseId = generateCaseNumber();
    user.cases.push(`${caseId}: WARNING - ${reason}`);

    message.channel.send(`⚠️ <@${userId}> Warning (${user.strikes}/3): ${reason} | ${caseId}`);

    if (user.strikes >= 3) {

        user.mutes++;
        const muteCase = generateCaseNumber();
        user.cases.push(`${muteCase}: MUTE (5m) - 3 strikes reached`);

        message.channel.send(`🔇 <@${userId}> muted for 5 minutes | ${muteCase}`);

        await muteMember(member, 300000);

        user.strikes = 0;
    }

    saveData(logs);
});

// ======================
// MLOGS SYSTEM (ADD/REMOVE)
// ======================
client.on('messageCreate', async (message) => {

    if (!message.content.startsWith('!mlogs')) return;

    const args = message.content.split(' ');

    const action = args[1]; // add/remove/view
    const type = args[2];   // strike/warn/kick/ban
    const target = message.mentions.users.first();

    // ======================
    // VIEW LOGS
    // ======================
    if (!action || action === "view") {

        const user = target || message.author;
        const data = logs[user.id];

        if (!data) return message.channel.send("No logs found.");

        return message.channel.send({
            embeds: [{
                color: 0x0099ff,
                title: `📊 Logs - ${user.tag}`,
                fields: [
                    { name: "Strikes", value: `${data.strikes}`, inline: true },
                    { name: "Warnings", value: `${data.warnings}`, inline: true },
                    { name: "Mutes", value: `${data.mutes}`, inline: true },
                    { name: "Kicks", value: `${data.kicks}`, inline: true },
                    { name: "Bans", value: `${data.bans}`, inline: true },
                ],
                footer: {
                    text: "Managed by Duck"
                }
            }]
        });
    }

    // ======================
    // ADD / REMOVE SYSTEM
    // ======================
    const user = getUser(target?.id);
    const caseId = generateCaseNumber();

    if (action === "add") {

        if (type === "strike") user.strikes++;
        if (type === "warn") user.warnings++;
        if (type === "kick") user.kicks++;
        if (type === "ban") user.bans++;

        user.cases.push(`${caseId}: MANUAL ADD - ${type.toUpperCase()}`);

        saveData(logs);

        return message.channel.send(`✅ Added ${type} to ${target.tag} | ${caseId}`);
    }

    if (action === "remove") {

        if (type === "strike" && user.strikes > 0) user.strikes--;
        if (type === "warn" && user.warnings > 0) user.warnings--;
        if (type === "kick" && user.kicks > 0) user.kicks--;
        if (type === "ban" && user.bans > 0) user.bans--;

        user.cases.push(`${caseId}: MANUAL REMOVE - ${type.toUpperCase()}`);

        saveData(logs);

        return message.channel.send(`🧹 Removed ${type} from ${target.tag} | ${caseId}`);
    }
});

client.login(process.env.TOKEN);