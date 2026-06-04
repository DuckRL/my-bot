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
});

client.on('messageCreate', message => {
    if (message.author.bot) return;

    if (message.content === '!hello') {
        message.reply('Hello! 👋');
    }
});

client.login(process.env.TOKEN);

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setActivity("Made by Duck", {
        type: 1
    });
});
