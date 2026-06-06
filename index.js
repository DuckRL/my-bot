const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    PermissionsBitField,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} = require('discord.js');

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
const PANEL_CHANNEL_ID = "1478071049223540844";

const CATEGORY_IDS = {
    general: "1478071050813047013",
    partnership: "1478071050813047014",
    management: "1478071050813047015"
};

const STAFF_ROLE_ID = "1478071048464502867";
const SETUP_ROLE_ID = "1478071048476819661";
const TRANSCRIPT_CHANNEL_ID = "1512885389675860018";

// ======================
// STATUS
// ======================
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity("Managed by Duck");
});

// ======================
// TICKET STORAGE
// ======================
const activeTickets = new Map();

// ======================
// !tsetup
// ======================
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content !== "!tsetup") return;

    if (!message.member.roles.cache.has(SETUP_ROLE_ID)) {
        return message.reply("❌ You do not have permission to use this command.");
    }

    const embed = new EmbedBuilder()
        .setTitle("🎟️ New York City Ticket System")
        .setDescription(
            "Welcome to NYCRP Support.\n\n" +
            "Select a category below to open a private ticket.\n" +
            "Our staff will assist you shortly."
        )
        .setColor(0x2b2d31);

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Select a ticket category")
            .addOptions(
                { label: "General Support", value: "general", emoji: "📋" },
                { label: "Partnership Support", value: "partnership", emoji: "🤝" },
                { label: "Management Support", value: "management", emoji: "👑" }
            )
    );

    const channel = message.guild.channels.cache.get(PANEL_CHANNEL_ID);
    if (!channel) return message.reply("Panel channel not found.");

    channel.send({ embeds: [embed], components: [menu] });

    message.reply("✅ Ticket panel created.");
});

// ======================
// CREATE TICKET
// ======================
client.on("interactionCreate", async (interaction) => {

    // ======================
    // DROPDOWN
    // ======================
    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {

        const type = interaction.values[0];

        if (activeTickets.has(interaction.user.id)) {
            return interaction.reply({
                content: "❌ You already have an open ticket.",
                ephemeral: true
            });
        }

        const category = CATEGORY_IDS[type];

        const channel = await interaction.guild.channels.create({
            name: `${type}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: STAFF_ROLE_ID,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ]
        });

        activeTickets.set(interaction.user.id, channel.id);

        const embed = new EmbedBuilder()
            .setTitle("🎟️ Ticket Opened")
            .setDescription(
                `Category: **${type}**\n` +
                `User: <@${interaction.user.id}>\n\n` +
                `A staff member has been notified.`
            )
            .setColor(0x00ff99);

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("claim_ticket")
                .setLabel("Claim")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Close")
                .setStyle(ButtonStyle.Danger)
        );

        channel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [embed],
            components: [buttons]
        });

        return interaction.reply({
            content: `✅ Ticket created: ${channel}`,
            ephemeral: true
        });
    }

    // ======================
    // CLAIM BUTTON
    // ======================
    if (interaction.isButton() && interaction.customId === "claim_ticket") {

        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return interaction.reply({ content: "❌ Staff only.", ephemeral: true });
        }

        const embed = EmbedBuilder.from(interaction.message.embeds[0]);

        embed.addFields({ name: "Claimed By", value: `<@${interaction.user.id}>` });

        await interaction.message.edit({ embeds: [embed] });

        return interaction.reply({
            content: `✅ Ticket claimed by <@${interaction.user.id}>`,
            ephemeral: false
        });
    }

    // ======================
    // CLOSE BUTTON
    // ======================
    if (interaction.isButton() && interaction.customId === "close_ticket") {

        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            return interaction.reply({ content: "❌ Staff only.", ephemeral: true });
        }

        await interaction.reply({ content: "🔒 Closing ticket...", ephemeral: true });

        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = messages
            .map(m => `[${m.author.tag}] ${m.content}`)
            .reverse()
            .join("\n");

        const file = `./${interaction.channel.id}.txt`;
        fs.writeFileSync(file, transcript);

        const logChannel = interaction.guild.channels.cache.get(TRANSCRIPT_CHANNEL_ID);

        if (logChannel) {
            logChannel.send({
                content: `📄 Transcript for ${interaction.channel.name}`,
                files: [file]
            });
        }

        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 3000);
    }
});

// ======================
// LOGIN
// ======================
client.login(process.env.TOKEN);