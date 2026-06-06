const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionsBitField,
    ChannelType
} = require("discord.js");

const fs = require("fs");

// ======================
// CLIENT
// ======================
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
const PANEL_CHANNEL_ID = "1478071049223540844";

const CATEGORY_IDS = {
    general: "1478071050813047013",
    partnership: "1478071050813047014",
    management: "1478071050813047015"
};

const STAFF_ROLE_ID = "1478071048464502867";
const SETUP_ROLE_ID = "1478071048476819661";

const MOD_LOG_CHANNEL_ID = "1478071050569908280";
const TRANSCRIPT_CHANNEL_ID = "1512885389675860018";

const TIMEOUT_MS = 5 * 60 * 1000;

// ======================
// DATA
// ======================
const warns = new Map();

// ======================
// READY
// ======================
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity("Managed by Duck");
});

// ======================
// HELPERS
// ======================
function log(guild, embed) {
    const ch = guild.channels.cache.get(MOD_LOG_CHANNEL_ID);
    if (ch) ch.send({ embeds: [embed] }).catch(() => {});
}

async function dm(user, embed) {
    try {
        await user.send({ embeds: [embed] });
    } catch {}
}

// ======================
// COMMAND HANDLER
// ======================
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    const args = message.content.split(" ");
    const cmd = args[0];

// ======================
// HELP COMMAND
// ======================
if (cmd === "!help") {

    const embed = new EmbedBuilder()
        .setTitle("📘 Server Bot Help")
        .setColor(0x00aaff)
        .addFields(
            {
                name: "🚔 Moderation",
                value:
`!ban @user reason
!kick @user reason
!mute @user reason
!unmute @user
!warn @user reason
!unwarn @user
!tempban @user minutes reason
!unban userID`
            },
            {
                name: "🎟️ Tickets",
                value:
`!tsetup → create ticket panel
Dropdown → open ticket`
            }
        )
        .setFooter({ text: "Managed by Duck" });

    return message.channel.send({ embeds: [embed] });
}

// ======================
// TICKET SETUP
// ======================
if (cmd === "!tsetup") {

    if (!message.member.roles.cache.has(SETUP_ROLE_ID))
        return message.reply("❌ No permission.");

    const embed = new EmbedBuilder()
        .setTitle("🎟️ New York City Ticket System")
        .setDescription("Select a category below.")
        .setColor(0x2b2d31);

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("ticket_menu")
            .setPlaceholder("Select category")
            .addOptions(
                { label: "General", value: "general" },
                { label: "Partnership", value: "partnership" },
                { label: "Management", value: "management" }
            )
    );

    const channel = message.guild.channels.cache.get(PANEL_CHANNEL_ID);
    if (!channel) return;

    channel.send({ embeds: [embed], components: [menu] });

    return message.reply("Panel sent.");
}

// ======================
// BAN
// ======================
if (cmd === "!ban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

    const user = message.mentions.members.first();
    const reason = args.slice(2).join(" ") || "No reason";

    if (!user) return message.reply("Mention user");

    await user.ban({ reason });

    const embed = new EmbedBuilder()
        .setTitle("⛔ Banned")
        .setDescription(user.user.tag)
        .addFields({ name: "Reason", value: reason })
        .setColor(0xff0000);

    await dm(user.user, embed);
    log(message.guild, embed);

    return message.channel.send("User banned.");
}

// ======================
// UNBAN
// ======================
if (cmd === "!unban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

    const id = args[1];
    if (!id) return message.reply("Provide user ID");

    await message.guild.members.unban(id).catch(() => {
        return message.reply("Invalid ID or not banned.");
    });

    return message.channel.send("User unbanned.");
}

// ======================
// KICK
// ======================
if (cmd === "!kick") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;

    const user = message.mentions.members.first();
    const reason = args.slice(2).join(" ") || "No reason";

    if (!user) return message.reply("Mention user");

    await user.kick(reason);

    const embed = new EmbedBuilder()
        .setTitle("👢 Kicked")
        .setDescription(user.user.tag)
        .addFields({ name: "Reason", value: reason })
        .setColor(0xffff00);

    await dm(user.user, embed);
    log(message.guild, embed);

    return message.channel.send("User kicked.");
}

// ======================
// TIMEOUT MUTE
// ======================
if (cmd === "!mute") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

    const user = message.mentions.members.first();
    const reason = args.slice(2).join(" ") || "No reason";

    if (!user) return message.reply("Mention user");

    await user.timeout(TIMEOUT_MS, reason);

    const embed = new EmbedBuilder()
        .setTitle("🔇 Muted")
        .setDescription(user.user.tag)
        .addFields({ name: "Reason", value: reason })
        .setColor(0xffa500);

    await dm(user.user, embed);
    log(message.guild, embed);

    return message.channel.send("User muted.");
}

// ======================
// UNMUTE
// ======================
if (cmd === "!unmute") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention user");

    await user.timeout(null);

    return message.channel.send("User unmuted.");
}

// ======================
// WARN
// ======================
if (cmd === "!warn") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

    const user = message.mentions.members.first();
    const reason = args.slice(2).join(" ") || "No reason";

    if (!user) return message.reply("Mention user");

    let count = warns.get(user.id) || 0;
    count++;
    warns.set(user.id, count);

    const embed = new EmbedBuilder()
        .setTitle("⚠️ Warned")
        .addFields(
            { name: "Reason", value: reason },
            { name: "Warnings", value: `${count}` }
        )
        .setColor(0xffcc00);

    await dm(user.user, embed);
    log(message.guild, embed);

    return message.channel.send(`Warned ${user.user.tag}`);
}

// ======================
// UNWARN
// ======================
if (cmd === "!unwarn") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

    const user = message.mentions.members.first();
    if (!user) return message.reply("Mention user");

    let count = warns.get(user.id) || 0;

    if (count <= 0) return message.reply("No warnings");

    count--;
    warns.set(user.id, count);

    return message.channel.send(`Warning removed (${count})`);
}

// ======================
// TEMPBAN
// ======================
if (cmd === "!tempban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

    const user = message.mentions.members.first();
    const minutes = parseInt(args[2]);
    const reason = args.slice(3).join(" ") || "No reason";

    if (!user || !minutes) return message.reply("!tempban @user minutes reason");

    await user.ban({ reason });

    setTimeout(() => {
        message.guild.members.unban(user.id).catch(() => {});
    }, minutes * 60000);

    return message.channel.send("Tempbanned user.");
}
});

// ======================
// TICKETS
// ======================
client.on("interactionCreate", async (interaction) => {

    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === "ticket_menu") {

        const type = interaction.values[0];

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CATEGORY_IDS[type],
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("🎟️ Ticket Opened")
            .setColor(0x00ff99);

        channel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [embed]
        });

        interaction.reply({ content: "Ticket created", ephemeral: true });
    }
});

client.login(process.env.TOKEN);