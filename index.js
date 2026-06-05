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
const AUDIT_CHANNEL_ID = "1510749041061920867";
const DATA_FILE = "./logs.json";

// ======================
// DB
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
        console.log(err);
    }
}

let logs = loadData();

// ======================
// CASE SYSTEM
// ======================
function generateCase() {
    let total = 0;
    for (const u in logs) {
        total += logs[u]?.cases?.length || 0;
    }
    return `CASE-${String(total + 1).padStart(4, "0")}`;
}

// ======================
// AUDIT LOGGER
// ======================
function auditLog(guild, title, fields) {
    const channel = guild.channels.cache.get(AUDIT_CHANNEL_ID);
    if (!channel) return;

    channel.send({
        embeds: [{
            color: 0xff0000,
            title,
            fields,
            timestamp: new Date()
        }]
    }).catch(() => {});
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
    const role = member.guild.roles.cache.get(MUTE_ROLE_ID);
    if (!role) return;

    await member.roles.add(role);

    setTimeout(() => {
        member.roles.remove(role).catch(() => {});
    }, ms);
}

// ======================
// USER DATA
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
// ANTI ABUSE SYSTEM
// ======================
client.on('messageCreate', async (message) => {

    if (!message.guild || message.author.bot) return;

    const member = message.member;

    if (member.roles.cache.has(BYPASS_ROLE_ID)) return;

    const userId = message.author.id;

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
    const caseId = generateCase();

    user.strikes++;
    user.warnings++;

    user.cases.push(`${caseId}: WARNING - ${reason}`);

    message.channel.send(`⚠️ <@${userId}> Warning (${user.strikes}/3) | ${caseId}`);

    // AUDIT LOG
    auditLog(message.guild, "⚠️ Warning Issued", [
        { name: "User", value: `<@${userId}>`, inline: true },
        { name: "Reason", value: reason, inline: true },
        { name: "Case", value: caseId, inline: true }
    ]);

    if (user.strikes >= 3) {

        user.mutes++;
        const muteCase = generateCase();

        user.cases.push(`${muteCase}: MUTE (5m)`);

        await mute(member, 300000);

        user.strikes = 0;

        message.channel.send(`🔇 <@${userId}> muted for 5 minutes | ${muteCase}`);

        auditLog(message.guild, "🔇 User Muted", [
            { name: "User", value: `<@${userId}>`, inline: true },
            { name: "Duration", value: "5 minutes", inline: true },
            { name: "Case", value: muteCase, inline: true }
        ]);
    }

    saveData(logs);
});

// ======================
// MLOGS SYSTEM
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

        if (!data) return message.channel.send("No logs found.");

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

    if (!target) return message.channel.send("Mention a user.");

    const user = getUser(target.id);
    const caseId = generateCase();

    // ======================
    // ADD
    // ======================
    if (sub === "add") {

        if (type === "strike") user.strikes++;
        else if (type === "warn") user.warnings++;
        else if (type === "kick") user.kicks++;
        else if (type === "ban") user.bans++;

        user.cases.push(`${caseId}: MANUAL ADD - ${type.toUpperCase()}`);

        auditLog(message.guild, "➕ Manual Add", [
            { name: "User", value: `<@${target.id}>`, inline: true },
            { name: "Type", value: type, inline: true },
            { name: "Case", value: caseId, inline: true }
        ]);

        saveData(logs);

        return message.channel.send(`Added ${type} | ${caseId}`);
    }

    // ======================
    // REMOVE
    // ======================
    if (sub === "remove") {

        if (type === "strike" && user.strikes > 0) user.strikes--;
        else if (type === "warn" && user.warnings > 0) user.warnings--;
        else if (type === "kick" && user.kicks > 0) user.kicks--;
        else if (type === "ban" && user.bans > 0) user.bans--;

        user.cases.push(`${caseId}: MANUAL REMOVE - ${type.toUpperCase()}`);

        auditLog(message.guild, "🧹 Manual Remove", [
            { name: "User", value: `<@${target.id}>`, inline: true },
            { name: "Type", value: type, inline: true },
            { name: "Case", value: caseId, inline: true }
        ]);

        saveData(logs);

        return message.channel.send(`Removed ${type} | ${caseId}`);
    }

    return message.channel.send("Use !mlogs or !mlogs add/remove type @user");
});

// ======================
// HELP
// ======================
client.on('messageCreate', async (message) => {

    if (message.content !== "!help") return;

    message.channel.send({
        embeds: [{
            color: 0x00ff00,
            title: "🚔 Commands",
            fields: [
                { name: "!mlogs @user", value: "View logs" },
                { name: "!mlogs add strike @user", value: "Add punishment" },
                { name: "!mlogs remove strike @user", value: "Remove punishment" },
                { name: "Types", value: "strike, warn, kick, ban" }
            ],
            footer: { text: "Managed by Duck" }
        }]
    });
});

client.login(process.env.TOKEN);