const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionsBitField,
    ChannelType
} = require("discord.js");

const crypto = require("crypto");

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
const CONFIG = {
    VERIFY_CHANNEL: "1478071049223540840",
    TICKET_PANEL_CHANNEL: "1478071049223540844",
    LOG_CHANNEL: "1478071050569908280",

    VERIFIED_ROLE: "PUT_VERIFIED_ROLE_ID_HERE",
    STAFF_ROLE: "1478071048464502867",

    CATEGORIES: {
        general: "1478071050813047013",
        partnership: "1478071050813047014",
        management: "1478071050813047015"
    },

    ROLES: {
        mod: "1478071048456110241",
        admin: "1478071048456110247",
        management: "1478071048464502867",
        founder: "1478071048464502875"
    }
};

// ======================
// STORAGE (TEMP)
// ======================
const pendingVerifications = new Map(); // code -> discordId
const warns = new Map();

// ======================
// READY
// ======================
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity("NYC Roleplay System");
});

// ======================
// HELP LOGIC
// ======================
function has(member, role) {
    return member.roles.cache.has(role);
}

// ======================
// LOG FUNCTION
// ======================
function log(guild, embed) {
    const ch = guild.channels.cache.get(CONFIG.LOG_CHANNEL);
    if (ch) ch.send({ embeds: [embed] }).catch(() => {});
}

// ======================
// MESSAGE COMMANDS
// ======================
client.on("messageCreate", async (message) => {

    if (!message.guild || message.author.bot) return;

    const args = message.content.split(" ");
    const cmd = args[0];

    // ======================
    // !help (RANK BASED)
    // ======================
    if (cmd === "!help") {

        const m = message.member;
        let fields = [];

        if (has(m, CONFIG.ROLES.mod) || has(m, CONFIG.ROLES.admin) || has(m, CONFIG.ROLES.management) || has(m, CONFIG.ROLES.founder)) {
            fields.push({
                name: "Moderation",
                value: "!warn !mute !unmute !kick !ban !unban"
            });
        }

        if (has(m, CONFIG.ROLES.admin) || has(m, CONFIG.ROLES.management) || has(m, CONFIG.ROLES.founder)) {
            fields.push({
                name: "Administration",
                value: "!tempban !tsetup"
            });
        }

        if (has(m, CONFIG.ROLES.management) || has(m, CONFIG.ROLES.founder)) {
            fields.push({
                name: "Management",
                value: "Ticket Control + Server Tools"
            });
        }

        return message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("📘 Command Center")
                    .setColor(0x00aaff)
                    .addFields(fields.length ? fields : [{ name: "No Access", value: "None" }])
            ]
        });
    }

    // ======================
    // !vsetup (VERIFICATION PANEL)
    // ======================
    if (cmd === "!vsetup") {

        const embed = new EmbedBuilder()
            .setTitle("🔐 Roblox Verification")
            .setDescription("Click below to verify your Roblox account.")
            .setColor(0x00aaff);

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify_start")
                .setLabel("Verify")
                .setStyle(ButtonStyle.Success)
        );

        const ch = message.guild.channels.cache.get(CONFIG.VERIFY_CHANNEL);
        if (!ch) return;

        ch.send({ embeds: [embed], components: [btn] });

        message.reply("Verification panel sent.");
    }

    // ======================
    // VERIFY COMMAND
    // ======================
    if (cmd === "!verify") {

        const roblox = args[1];
        const code = args[2];

        if (!roblox || !code)
            return message.reply("Usage: !verify RobloxName CODE");

        if (!pendingVerifications.has(code))
            return message.reply("Invalid code.");

        if (pendingVerifications.get(code) !== message.author.id)
            return message.reply("Not your code.");

        pendingVerifications.delete(code);

        await message.member.setNickname(roblox).catch(() => {});

        const role = message.guild.roles.cache.get(CONFIG.VERIFIED_ROLE);
        if (role) await message.member.roles.add(role).catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle("✅ Verified")
            .setDescription(`Linked to Roblox: **${roblox}**`)
            .setColor(0x00ff99);

        message.reply({ embeds: [embed] });
    }

    // ======================
    // MODERATION (BASIC)
    // ======================
    if (cmd === "!warn") {

        const user = message.mentions.members.first();
        if (!user) return;

        let count = warns.get(user.id) || 0;
        count++;
        warns.set(user.id, count);

        const embed = new EmbedBuilder()
            .setTitle("⚠️ Warned")
            .setDescription(`${user.user.tag}`)
            .addFields({ name: "Total Warnings", value: `${count}` })
            .setColor(0xffcc00);

        log(message.guild, embed);
        message.channel.send({ embeds: [embed] });
    }

    if (cmd === "!kick") {

        const user = message.mentions.members.first();
        if (!user) return;

        await user.kick().catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle("👢 Kicked")
            .setDescription(user.user.tag)
            .setColor(0xff9900);

        log(message.guild, embed);
    }

    if (cmd === "!ban") {

        const user = message.mentions.members.first();
        if (!user) return;

        await user.ban().catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle("⛔ Banned")
            .setDescription(user.user.tag)
            .setColor(0xff0000);

        log(message.guild, embed);
    }

    // ======================
    // !tsetup (TICKETS)
    // ======================
    if (cmd === "!tsetup") {

        const embed = new EmbedBuilder()
            .setTitle("🎟️ NYC Tickets")
            .setDescription("Select a category below to open a ticket.")
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

        const ch = message.guild.channels.cache.get(CONFIG.TICKET_PANEL_CHANNEL);
        if (!ch) return;

        ch.send({ embeds: [embed], components: [menu] });

        message.reply("Ticket panel sent.");
    }
});

// ======================
// BUTTONS + TICKETS + VERIFY CODE
// ======================
client.on("interactionCreate", async (interaction) => {

    // VERIFY BUTTON
    if (interaction.isButton() && interaction.customId === "verify_start") {

        const code = crypto.randomInt(100000, 999999).toString();
        pendingVerifications.set(code, interaction.user.id);

        return interaction.reply({
            content: `Your code: **${code}**\nUse: !verify RobloxName ${code}`,
            ephemeral: true
        });
    }

    // TICKETS
    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_menu") {

        const type = interaction.values[0];

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.CATEGORIES[type],
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                },
                {
                    id: CONFIG.STAFF_ROLE,
                    allow: [PermissionsBitField.Flags.ViewChannel]
                }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("🎟️ Ticket Opened")
            .setDescription("Staff will assist you soon.")
            .setColor(0x00ff99);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Close")
                .setStyle(ButtonStyle.Danger)
        );

        channel.send({
            content: `<@&${CONFIG.STAFF_ROLE}>`,
            embeds: [embed],
            components: [row]
        });

        interaction.reply({ content: "Ticket created!", ephemeral: true });
    }

    // CLOSE TICKET
    if (interaction.isButton() && interaction.customId === "close_ticket") {
        interaction.channel.delete().catch(() => {});
    }
});

client.login(process.env.TOKEN);