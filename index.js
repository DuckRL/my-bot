const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setActivity('Managed by Duck');
});

client.login(process.env.TOKEN);
if (message.content === '!arm') {

    const embed = {
        color: 0x00ff00,
        title: "🚨 Tennessee Highway Patrol Armed",
        description: "Status: **READY TO DEFEND**",
        fields: [
            {
                name: "Capabilities",
                value: "✔ Ban Ready\n✔ Anti-Spam Active\n✔ Status: Armed"
            }
        ],
        timestamp: new Date()
    };

    message.channel.send({ embeds: [embed] });
}