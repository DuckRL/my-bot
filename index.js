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
// SAFE DATABASE
// ======================
function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return {};
        const raw = fs.readFileSync(DATA_FILE, "utf8");
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
function generateCase() {
    let total = 0;

    for (const user in logs) {
        total += logs[user]?.cases?.length || 0;
    }

    return `CASE-${String(total + 1).padStart(4, "0")}`;
}

// ======================
// READY
// ======================
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity("Managed by Duck");
});

// ======================
// MUTE SYSTEM
// ======================
async function mute(member, ms = 300000) {
    try {
        const role = member.guild.roles.cache.get(MUTE_ROLE_ID);
        if (!role) return;

        await member.roles.add(role);

        setTimeout(() => {
            member.roles.remove(role).catch(() => {});
        }, ms);

    } catch (err) {
        console.log(err);
    }
}

// ======================
// GET USER DATA
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
// ANTI-ABUSE SYSTEM
// ======================
client.on('messageCreate', async (message) => {

    if (!message.guild || message.author.bot) return;

    const member = message.member;
    const userId = message.author.id;

    if (member.roles.cache.has(BYPASS_ROLE_ID)) return;

    const link = /(https?:\/\/[^\s]+)/gi.test(message.content);
    const ping = message.mentions.everyone || message.content.includes("@here");
    const spam = message.content.split(" ").length > 30;

    let reason = null;

    if (link) reason = "Sending links";
    if (ping) reason = "Mass pinging";
    if (spam) reason = "Spam detected";

    if (!reason) return;

    message.delete().catch(() => {});

    const user = getUser(userId);

    user.strikes++;
    user.warnings++;

    const caseId = generateCase();
    user.cases.push(`${caseId}: WARNING - ${reason}`);

    message.channel.send(`⚠️ <@${userId}> Warning (${user.strikes}/3): ${reason} | ${caseId}`);

    if (user.strikes >= 3) {
        user.mutes++;

        const muteCase = generateCase();
        user.cases.push(`${muteCase}: MUTE (5m) - 3 strikes`);

        message.channel.send(`🔇 <@${userId}> muted for 5 minutes | ${muteCase}`);

        await mute(member, 300000);

        user.strikes = 0;
    }

    saveData(logs);
});

// ======================
// !MLOGS SYSTEM (CLEAN FIXED)
// ======================
client.on('messageCreate', async (message) => {

    if (!message.guild || message.author.bot) return;

    if (!message.content.startsWith("!mlogs")) return;

    const args = message.content.trim().split(/ +/);
    const sub = args[1];
    const type = args[2];
    const target = message.mentions.users.first();

    // ======================
    // VIEW MODE
    // ======================
    if (!sub || sub.startsWith("<@")) {

        const user = target || message.author;
        const data = logs[user.id];

        if (!data) return message.channel.send("📊 No logs found.");

        return message.channel.send({
            embeds: [{
                color: 0x00aaff,
                title: `📊 Logs - ${user.tag}`,
                fields: [
                    { name: "Strikes", value: `${data.strikes}`, inline: true },
                    { name: "Warnings", value: `${data.warnings}`, inline: true },
                    { name: "Mutes", value: `${data.mutes}`, inline: true },
                    { name: "Kicks", value: `${data.kicks}`, inline: true },
                    { name: "Bans", value: `${data.bans}`, inline: true },
                    { name: "Cases", value: `${data.cases.length}`, inline: true }
                ]
            }]
        });
    }

    // ======================
    // VALIDATION
    // ======================
    if (!target) {
        return message.channel.send("⚠️ Mention a user.");
    }

    const user = getUser(target.id);
    const caseId = generateCase();

    // ======================
    // ADD SYSTEM
    // ======================
    if (sub === "add") {

        if (type === "strike") user.strikes++;
        else if (type === "warn") user.warnings++;
        else if (type === "kick") user.kicks++;
        else if (type === "ban") user.bans++;

        user.cases.push(`${caseId}: MANUAL ADD - ${type.toUpperCase()}`);

        saveData(logs);

        return message.channel.send(`✅ Added ${type} | ${caseId}`);
    }

    // ======================
    // REMOVE SYSTEM
    // ======================
    if (sub === "remove") {

        if (type === "strike" && user.strikes > 0) user.strikes--;
        else if (type === "warn" && user.warnings > 0) user.warnings--;
        else if (type === "kick" && user.kicks > 0) user.kicks--;
        else if (type === "ban" && user.bans > 0) user.bans--;

        user.cases.push(`${caseId}: MANUAL REMOVE - ${type.toUpperCase()}`);

        saveData(logs);

        return message.channel.send(`🧹 Removed ${type} | ${caseId}`);
    }

    return message.channel.send("❌ Use: !mlogs | !mlogs add/remove strike @user");
});

// ======================
// HELP COMMAND
// ======================
client.on('messageCreate', async (message) => {

    if (message.author.bot || !message.guild) return;

    if (message.content === "!help") {

        message.channel.send({
            embeds: [{
                color: 0x00ff00,
                title: "🚔 THP Bot Commands",
                fields: [
                    { name: "!mlogs @user", value: "View logs" },
                    { name: "!mlogs add strike @user", value: "Add punishment" },
                    { name: "!mlogs remove strike @user", value: "Remove punishment" },
                    { name: "Types", value: "strike, warn, kick, ban" }
                ],
                footer: { text: "Managed by Duck" }
            }]
        });
    }
});

client.login(process.env.TOKEN);