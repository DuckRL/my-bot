const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// CONFIG
const HQ_ROLE_ID = "1503904276550779054";
const LOG_CHANNEL_ID = "1503904276999831581";

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setActivity("Made by Duck");
});

client.on('messageCreate', async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    // BLACKLIST COMMAND
    if (message.content.startsWith('!blacklist')) {

        // permission check
        if (!message.member.roles.cache.has(HQ_ROLE_ID)) {
            return message.reply("❌ You do not have permission to use this command.");
        }

        const args = message.content.split(' ').slice(1);
        const user = message.mentions.users.first();

        if (!user) {
            return message.reply("❌ Please mention a user to blacklist.");
        }

        const reason = args.slice(1).join(' ') || "No reason provided";

        const embed = {
            color: 0xff0000,
            title: "🚨 USER BLACKLISTED",
            fields: [
                {
                    name: "Blacklister",
                    value: `<@${message.author.id}>`,
                    inline: true
                },
                {
                    name: "Blacklistee",
                    value: `<@${user.id}>`,
                    inline: true
                },
                {
                    name: "Reason",
                    value: reason
                },
                {
                    name: "Proof",
                    value: "Not provided"
                },
                {
                    name: "Ping",
                    value: `<@&${HQ_ROLE_ID}>`
                }
            ],
            timestamp: new Date()
        };

        // ONLY SEND TO LOG CHANNEL (NOT CHAT)
        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);

        if (logChannel) {
            logChannel.send({ embeds: [embed] });
        } else {
            message.reply("❌ Log channel not found.");
        }
    }
});

client.login(process.env.TOKEN);