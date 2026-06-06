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
const activeTickets = new Map();

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
// TICKET SETUP
// ======================
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content === "!tsetup") {
        if (!message.member.roles.cache.has(SETUP_ROLE_ID))
            return message.reply("❌ No permission.");

        const embed = new EmbedBuilder()
            .setTitle("🎟️ New York City Ticket System")
            .setDescription("Select a category below to open a ticket.")
            .setColor(0x2b2d31);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("ticket_menu")
                .setPlaceholder("Select a category")
                .addOptions(
                    { label: "General", value: "general", emoji: "📋" },
                    { label: "Partnership", value: "partnership", emoji: "🤝" },
                    { label: "Management", value: "management", emoji: "👑" }
                )
        );

        const channel = message.guild.channels.cache.get(PANEL_CHANNEL_ID);
        if (!channel) return;

        channel.send({ embeds: [embed], components: [menu] });

        return message.reply("Ticket panel sent.");
    }

    // ======================
    // MODERATION COMMANDS
    // ======================

    // BAN
    if (message.content.startsWith("!ban")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

        const user = message.mentions.members.first();
        const reason = message.content.split(" ").slice(2).join(" ") || "No reason";

        if (!user) return message.reply("Mention a user");

        await user.ban({ reason });

        const embed = new EmbedBuilder()
            .setTitle("⛔ Banned")
            .addFields({ name: "Reason", value: reason })
            .setColor(0xff0000);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send(`Banned ${user.user.tag}`);
    }

    // UNBAN
    if (message.content.startsWith("!unban")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

        const id = message.content.split(" ")[1];
        if (!id) return message.reply("Provide user ID");

        await message.guild.members.unban(id).catch(() => {
            return message.reply("User not banned or invalid ID");
        });

        message.channel.send("User unbanned.");
    }

    // KICK
    if (message.content.startsWith("!kick")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;

        const user = message.mentions.members.first();
        const reason = message.content.split(" ").slice(2).join(" ") || "No reason";

        if (!user) return message.reply("Mention a user");

        await user.kick(reason);

        const embed = new EmbedBuilder()
            .setTitle("👢 Kicked")
            .addFields({ name: "Reason", value: reason })
            .setColor(0xffff00);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send(`Kicked ${user.user.tag}`);
    }

    // MUTE (TIMEOUT)
    if (message.content.startsWith("!mute")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

        const user = message.mentions.members.first();
        const reason = message.content.split(" ").slice(2).join(" ") || "No reason";

        if (!user) return message.reply("Mention a user");

        await user.timeout(TIMEOUT_MS, reason);

        const embed = new EmbedBuilder()
            .setTitle("🔇 Muted (Timeout)")
            .addFields({ name: "Reason", value: reason })
            .setColor(0xffa500);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send(`Muted ${user.user.tag}`);
    }

    // UNMUTE
    if (message.content.startsWith("!unmute")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

        const user = message.mentions.members.first();
        if (!user) return message.reply("Mention a user");

        await user.timeout(null);

        const embed = new EmbedBuilder()
            .setTitle("🔊 Unmuted")
            .setColor(0x00ff99);

        log(message.guild, embed);

        message.channel.send(`Unmuted ${user.user.tag}`);
    }

    // TEMPBAN
    if (message.content.startsWith("!tempban")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

        const args = message.content.split(" ");
        const user = message.mentions.members.first();
        const minutes = parseInt(args[2]);
        const reason = args.slice(3).join(" ") || "No reason";

        if (!user || !minutes) return message.reply("!tempban @user minutes reason");

        await user.ban({ reason });

        setTimeout(() => {
            message.guild.members.unban(user.id).catch(() => {});
        }, minutes * 60000);

        const embed = new EmbedBuilder()
            .setTitle("⏳ Tempbanned")
            .addFields(
                { name: "Time", value: `${minutes} min` },
                { name: "Reason", value: reason }
            )
            .setColor(0x8b0000);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send(`Tempbanned ${user.user.tag}`);
    }

    // WARN
    if (message.content.startsWith("!warn")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

        const user = message.mentions.members.first();
        const reason = message.content.split(" ").slice(2).join(" ") || "No reason";

        if (!user) return message.reply("Mention a user");

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

        message.channel.send(`Warned ${user.user.tag} (${count})`);
    }

    // UNWARN
    if (message.content.startsWith("!unwarn")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

        const user = message.mentions.members.first();
        if (!user) return message.reply("Mention a user");

        let count = warns.get(user.id) || 0;

        if (count <= 0) return message.reply("No warnings.");

        count--;
        warns.set(user.id, count);

        message.channel.send(`Removed warn from ${user.user.tag} (${count})`);
    }
});

// ======================
// TICKET SYSTEM
// ======================
client.on("interactionCreate", async (interaction) => {

    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_menu") {

        const type = interaction.values[0];

        const channel = await interaction.guild.channels.create({
            name: `${type}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CATEGORY_IDS[type],
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("🎟️ Ticket Opened")
            .setDescription("Staff will assist you soon.")
            .setColor(0x00ff99);

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger)
        );

        channel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [embed],
            components: [buttons]
        });

        interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === "close") {

        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return;

        await interaction.reply("Closing ticket...");

        const messages = await interaction.channel.messages.fetch({ limit: 100 });

        const transcript = messages
            .map(m => `[${m.author.tag}] ${m.content}`)
            .reverse()
            .join("\n");

        fs.writeFileSync(`./transcript-${interaction.channel.id}.txt`, transcript);

        const logCh = interaction.guild.channels.cache.get(TRANSCRIPT_CHANNEL_ID);

        if (logCh) {
            logCh.send({
                files: [`./transcript-${interaction.channel.id}.txt`]
            });
        }

        setTimeout(() => interaction.channel.delete(), 3000);
    }
});

client.login(process.env.TOKEN);