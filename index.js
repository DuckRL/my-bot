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
// ROLE CONFIG (YOUR IDS)
// ======================
const ROLES = {
    moderation: "1478071048456110241",
    administration: "1478071048456110247",
    management: "1478071048464502867",
    foundership: "1478071048464502875"
};

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

const hasRole = (member, role) => member.roles.cache.has(role);

// ======================
// MESSAGE COMMANDS
// ======================
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    const args = message.content.split(" ");
    const cmd = args[0];

    // ======================
    // HELP (RANK BASED)
    // ======================
    if (cmd === "!help") {

        const member = message.member;

        let fields = [];

        if (
            hasRole(member, ROLES.moderation) ||
            hasRole(member, ROLES.administration) ||
            hasRole(member, ROLES.management) ||
            hasRole(member, ROLES.foundership)
        ) {
            fields.push({
                name: "🛡️ Moderation",
                value:
`!warn @user reason
!unwarn @user
!mute @user reason
!unmute @user`
            });
        }

        if (
            hasRole(member, ROLES.administration) ||
            hasRole(member, ROLES.management) ||
            hasRole(member, ROLES.foundership)
        ) {
            fields.push({
                name: "🚔 Administration",
                value:
`!kick @user reason
!tempban @user minutes reason`
            });
        }

        if (
            hasRole(member, ROLES.management) ||
            hasRole(member, ROLES.foundership)
        ) {
            fields.push({
                name: "🏛️ Management",
                value:
`!ban @user reason
!unban userID
!tsetup`
            });
        }

        if (hasRole(member, ROLES.foundership)) {
            fields.push({
                name: "👑 Foundership",
                value: "Full bot access"
            });
        }

        if (!fields.length)
            return message.reply("No command access.");

        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("📘 Command Center")
                    .setColor(0x00aaff)
                    .addFields(fields)
            ]
        });
    }

    // ======================
    // TICKET SETUP
    // ======================
    if (cmd === "!tsetup") {

        if (!hasRole(message.member, ROLES.management) &&
            !hasRole(message.member, ROLES.foundership))
            return message.reply("No permission.");

        const embed = new EmbedBuilder()
            .setTitle("🎟️ New York City Tickets")
            .setDescription("Select a category to open a ticket.")
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

        const ch = message.guild.channels.cache.get(PANEL_CHANNEL_ID);
        if (!ch) return;

        ch.send({ embeds: [embed], components: [menu] });

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

        message.channel.send("User banned.");
    }

    // ======================
    // UNBAN
    // ======================
    if (cmd === "!unban") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

        const id = args[1];
        if (!id) return message.reply("Provide ID");

        await message.guild.members.unban(id).catch(() => {
            return message.reply("Invalid ID");
        });

        message.channel.send("Unbanned.");
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
            .setColor(0xffff00);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send("Kicked.");
    }

    // ======================
    // MUTE (TIMEOUT)
    // ======================
    if (cmd === "!mute") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

        const user = message.mentions.members.first();
        const reason = args.slice(2).join(" ") || "No reason";

        if (!user) return message.reply("Mention user");

        await user.timeout(TIMEOUT_MS, reason);

        const embed = new EmbedBuilder()
            .setTitle("🔇 Muted")
            .setColor(0xffa500);

        await dm(user.user, embed);
        log(message.guild, embed);

        message.channel.send("Muted.");
    }

    // ======================
    // UNMUTE
    // ======================
    if (cmd === "!unmute") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

        const user = message.mentions.members.first();
        if (!user) return message.reply("Mention user");

        await user.timeout(null);

        message.channel.send("Unmuted.");
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

        message.channel.send(`Warned ${user.user.tag}`);
    }

    // ======================
    // UNWARN
    // ======================
    if (cmd === "!unwarn") {

        const user = message.mentions.members.first();
        if (!user) return message.reply("Mention user");

        let count = warns.get(user.id) || 0;
        if (count <= 0) return message.reply("No warns");

        count--;
        warns.set(user.id, count);

        message.channel.send("Warn removed.");
    }

    // ======================
    // TEMPBAN
    // ======================
    if (cmd === "!tempban") {

        const user = message.mentions.members.first();
        const mins = parseInt(args[2]);
        const reason = args.slice(3).join(" ") || "No reason";

        if (!user || !mins) return message.reply("!tempban @user mins reason");

        await user.ban({ reason });

        setTimeout(() => {
            message.guild.members.unban(user.id).catch(() => {});
        }, mins * 60000);

        message.channel.send("Tempbanned.");
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

        channel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [
                new EmbedBuilder()
                    .setTitle("Ticket Opened")
                    .setColor(0x00ff99)
            ]
        });

        interaction.reply({ content: "Ticket created", ephemeral: true });
    }
});

client.login(process.env.TOKEN);