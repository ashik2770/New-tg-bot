const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Configuration
const config = {
    token: '8079488155:AAEt6Gp1lE1UgIx6ylYQUuUKFxD0bko2ilU',
    webAppUrl: 'https://ashik2770.github.io/New-tg-bot/',
    channelUrl: 'https://t.me/YourChannel',
    adminIds: ['7442526627'], // Replace with your Telegram ID
    dataDir: path.join(__dirname, 'data')
};

// Initialize bot and app
const bot = new TelegramBot(config.token, { polling: true });
app.use(express.json());

// Data storage
const usersFile = path.join(config.dataDir, 'users.json');
let users = {};

// Utility functions
const saveUsers = async () => {
    await fs.mkdir(config.dataDir, { recursive: true });
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
};

const loadUsers = async () => {
    try {
        const data = await fs.readFile(usersFile, 'utf8');
        users = JSON.parse(data);
    } catch (error) {
        users = {};
    }
};

// Welcome message
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name;

    // Save user data
    users[userId] = { name: userName, joined: new Date(), points: 0 };
    await saveUsers();

    const welcomeMessage = `
🌟 *Welcome to SuperBot, ${userName}!* 🌟
👤 User ID: *${userId}*
🎉 Congratulations on joining our community!

✨ *Features*:
- Earn points 🎮
- Join our channel 📢
- Explore our Web App 🌐

🚀 Let's get started!
    `;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '🌐 Open Web App', web_app: { url: config.webAppUrl } },
                { text: '📢 Join Channel', url: config.channelUrl }
            ],
            [
                { text: '🎮 Play Game', callback_data: 'game' },
                { text: '🏆 Leaderboard', callback_data: 'leaderboard' }
            ]
        ]
    };

    bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
});

// Admin commands
bot.onText(/\/admin (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!config.adminIds.includes(userId.toString())) {
        return bot.sendMessage(chatId, '❌ You are not authorized!', { parse_mode: 'Markdown' });
    }

    const command = match[1].toLowerCase();

    if (command === 'stats') {
        const totalUsers = Object.keys(users).length;
        bot.sendMessage(chatId, `
📊 *Bot Statistics* 📊
👥 Total Users: ${totalUsers}
🌟 Active since: ${new Date().toLocaleString()}
        `, { parse_mode: 'Markdown' });
    }
});

// Broadcast message
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!config.adminIds.includes(userId.toString())) {
        return bot.sendMessage(chatId, '❌ Admin only command!', { parse_mode: 'Markdown' });
    }

    const message = match[1];
    let successCount = 0;

    try {
        // Send broadcast with image
        for (const userId in users) {
            await bot.sendPhoto(userId, 'https://picsum.photos/800/400', {
                caption: `
📣 *Broadcast Message* 📣
${message}

🕒 ${new Date().toLocaleString()}
                `,
                parse_mode: 'Markdown'
            });
            successCount++;
        }
        bot.sendMessage(chatId, `✅ Broadcast sent to ${successCount} users!`, { parse_mode: 'Markdown' });
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`, { parse_mode: 'Markdown' });
    }
});

// Callback query handler
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;

    switch (query.data) {
        case 'game':
            users[userId].points = (users[userId].points || 0) + 10;
            await saveUsers();
            bot.sendMessage(chatId, `
🎉 *Game Played!* 🎉
You earned 10 points! 🌟
Current points: ${users[userId].points} 🎮
            `, { parse_mode: 'Markdown' });
            break;

        case 'leaderboard':
            const sortedUsers = Object.entries(users)
                .sort(([, a], [, b]) => b.points - a.points)
                .slice(0, 5);
            
            const leaderboard = sortedUsers.map(([id, data], index) => 
                `${index + 1}. ${data.name} - ${data.points} points`
            ).join('\n');

            bot.sendMessage(chatId, `
🏆 *Top 5 Leaderboard* 🏆
${leaderboard}
🌟 Keep playing to reach the top!
            `, { parse_mode: 'Markdown' });
            break;
    }
});

// Advanced features
bot.onText(/\/points/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const points = users[userId]?.points || 0;
    bot.sendMessage(chatId, `
🎮 *Your Points* 🎮
Current Points: ${points} 🌟
Earn more by playing games! 🚀
    `, { parse_mode: 'Markdown' });
});

// Referral system
bot.onText(/\/refer/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const referLink = `https://t.me/${bot.getMe().then(bot => bot.username)}?start=ref_${userId}`;
    bot.sendMessage(chatId, `
🌐 *Invite Friends* 🌐
Share this link: ${referLink}
Earn 50 bonus points per referral! 🎁
    `, { parse_mode: 'Markdown' });
});

// Health check
app.get('/', (req, res) => res.send('🤖 SuperBot is running!'));

// Webhook endpoint
app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Initialize
(async () => {
    await loadUsers();
    console.log('Bot initialized!');
})();

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(process.env.PORT || 3000, () => {
        console.log('Server running locally');
    });
}
