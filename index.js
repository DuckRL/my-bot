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

const TRANSCRIPT_CHANNEL_ID = "1512885389675860018";
const MOD_LOG_CHANNEL_ID = "1478071050569908280";

const TIMEOUT_MS = 300000; // 5 minutes default mute

// ======================
// STATUS
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
// TICKET PANEL
// ======================
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    // PANEL SETUP
    if (message.content === "!tsetup") {

        if (!message.member.roles.cache.has(SETUP_ROLE_ID))
            return message.reply("❌ No permission.");

        const embed = new EmbedBuilder()
            .setTitle("🎟️ New York City Ticket System")
            .setDescription("Select a category to open a ticket.")
            .setColor(0x2b2d31);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("ticket_menu")
                .setPlaceholder("Select category")
                .addOptions(
                    { label: "General", value: "general", emoji: "📋" },
                    { label: "Partnership", value: "partnership", emoji: "🤝" },
                    { label: "Management", value: "management", emoji: "👑" }
                )
        );

        const channel = message.guild.channels.cache.get(PANEL_CHANNEL_ID);
        channel.send({ embeds: [embed], components: [menu] });

        return message.reply("Panel sent.");
    }

    // ======================
    // MODERATION COMMANDS
    // ======================

    // BAN
    if (message.content.startsWith("!ban")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

        const user = message.mentions.members.first();
        const reason = message.content.split(" ").slice(2).join(" ") || "No reason";

        if (!user) return message.reply("Mention user");

        await user.ban({ reason });

        const embed = new EmbedBuilder()
            .setTitle("⛔ Ban")
            .setDescription(`${user.user.tag}`)
            .addFields({ name: "Reason", value: reason })
            .setColor(0xff0000);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send("Banned.");
    }

    // UNBAN (FIXED)
    if (message.content.startsWith("!unban")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

        const id = message.content.split(" ")[1];
        if (!id) return message.reply("Provide user ID");

        await message.guild.members.unban(id).catch(() => {
            return message.reply("User not banned or invalid ID");
        });

        message.channel.send("Unbanned user.");
    }

    // KICK (FIXED)
    if (message.content.startsWith("!kick")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;

        const user = message.mentions.members.first();
        const reason = message.content.split(" ").slice(2).join(" ") || "No reason";

        if (!user) return message.reply("Mention user");

        await user.kick(reason);

        const embed = new EmbedBuilder()
            .setTitle("👢 Kick")
            .setDescription(user.user.tag)
            .addFields({ name: "Reason", value: reason })
            .setColor(0xffff00);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send("Kicked.");
    }

    // TIMEOUT MUTE (FIXED — REAL DISCORD SYSTEM)
    if (message.content.startsWith("!mute")) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

        const user = message.mentions.members.first();
        const reason = message.content.split(" ").slice(2).join(" ") || "No reason";

        if (!user) return message.reply("Mention user");

        await user.timeout(TIMEOUT_MS, reason);

        const embed = new EmbedBuilder()
            .setTitle("🔇 Timeout")
            .setDescription(user.user.tag)
            .addFields({ name: "Reason", value: reason })
            .setColor(0xffa500);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send("Timed out user.");
    }

    // TEMPBAN (FIXED)
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
            .setTitle("⏳ Tempban")
            .addFields(
                { name: "Time", value: `${minutes} min` },
                { name: "Reason", value: reason }
            )
            .setColor(0x8b0000);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send("Tempbanned.");
    }
});

// ======================
// TICKET SYSTEM (UNCHANGED BUT FIXED STYLE)
// ======================
client.on("interactionCreate", async (interaction) => {

    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === "ticket_menu") {

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
            .setDescription("Staff will respond soon.")
            .setColor(0x00ff99);

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("claim")
                .setLabel("Claim")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("close")
                .setLabel("Close")
                .setStyle(ButtonStyle.Danger)
        );

        channel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [embed],
            components: [buttons]
        });

        interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    // CLAIM
    if (interaction.isButton() && interaction.customId === "claim") {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return;

        interaction.reply({ content: "Claimed", ephemeral: true });
    }

    // CLOSE
    if (interaction.isButton() && interaction.customId === "close") {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return;

        await interaction.reply("Closing...");

        setTimeout(() => interaction.channel.delete(), 3000);
    }
});

client.login(process.env.TOKEN);