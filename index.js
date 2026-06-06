const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

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

const CATEGORIES = {
    general: "1478071050813047013",
    partnership: "1478071050813047014",
    management: "1478071050813047015"
};

const STAFF_ROLE_ID = "1478071048464502867";

// ======================
// STATUS
// ======================
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity("Managed by Duck");
});

// ======================
// TICKET PANEL COMMAND
// ======================
client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content === "!tsetup") {

        const embed = new EmbedBuilder()
            .setTitle("🎟️ New York City Ticket System")
            .setDescription("Select a category below to create a private support ticket. Our staff team will assist you shortly.")
            .setColor(0x2b2d31);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("ticket_menu")
                .setPlaceholder("Select a ticket category")
                .addOptions(
                    {
                        label: "General Support",
                        value: "general",
                        emoji: "📋"
                    },
                    {
                        label: "Partnership Support",
                        value: "partnership",
                        emoji: "🤝"
                    },
                    {
                        label: "Management Support",
                        value: "management",
                        emoji: "👑"
                    }
                )
        );

        const channel = message.guild.channels.cache.get(PANEL_CHANNEL_ID);
        if (!channel) return message.reply("Panel channel not found.");

        channel.send({ embeds: [embed], components: [menu] });

        message.reply("Ticket panel created.");
    }
});

// ======================
// TICKET CREATION
// ======================
client.on("interactionCreate", async (interaction) => {

    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === "ticket_menu") {

        const type = interaction.values[0];

        const category = CATEGORIES[type];

        const channelName = `${type}-${interaction.user.username}`;

        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: 0,
            parent: category,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                },
                {
                    id: STAFF_ROLE_ID,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("🎟️ Ticket Created")
            .setDescription(`Category: **${type}**\nUser: <@${interaction.user.id}>`)
            .setColor(0x00ff99);

        channel.send({ embeds: [embed] });

        await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }
});

// ======================
// CLOSE COMMAND
// ======================
client.on("messageCreate", async (message) => {

    if (!message.guild || message.author.bot) return;

    if (message.content === "!close") {

        if (!message.member.roles.cache.has(STAFF_ROLE_ID)) {
            return message.reply("You cannot close tickets.");
        }

        if (!message.channel.name.includes("-")) {
            return message.reply("This is not a ticket channel.");
        }

        message.channel.send("Closing ticket in 5 seconds...");

        setTimeout(() => {
            message.channel.delete().catch(() => {});
        }, 5000);
    }
});

// ======================
// LOGIN
// ======================
client.login(process.env.TOKEN);