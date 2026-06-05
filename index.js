const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setActivity('Managed by Duck');
});

client.on('messageCreate', async (message) => {

    // ignore bots
    if (message.author.bot) return;
    if (!message.guild) return;

    // ======================
    // !arm COMMAND
    // ======================
    if (message.content === '!arm') {

        const embed = {
            color: 0x00ff00,
            title: "🚨 Tennessee Highway Patrol Armed",
            description: "Status: **READY TO DEFEND**",
            fields: [
                {
                    name: "System Status",
                    value: "✔ Ban Ready\n✔ Anti-Spam Ready\n✔ Active Defense Mode"
                }
            ],
            footer: {
                text: "Managed by Duck"
            },
            timestamp: new Date()
        };

        message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);