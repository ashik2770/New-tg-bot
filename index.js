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
    dataDir: '/tmp' // Use Vercel's temporary directory
};

// Initialize bot and app
const bot = new TelegramBot(config.token);
app.use(express.json());

// Data storage (in-memory for serverless)
let users = {};
const usersFile = path.join(config.dataDir, 'users.json');

// Utility functions
const saveUsers = async () => {
    try {
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Failed to save users:', error);
    }
};

const loadUsers = async () => {
    try {
        const data = await fs.readFile(usersFile, 'utf8');
        users = JSON.parse(data);
    } catch (error) {
        console.log('No existing user data found, starting fresh');
        users = {};
    }
};

// Set webhook
app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Welcome message
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name;

    users[userId] = { name: userName, joined: new Date(), points: users[userId]?.points || 0 };
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
bot.onText(/\/refer/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const botUsername = (await bot.getMe()).username;
    const referLink = `https://t.me/${botUsername}?start=ref_${userId}`;
    bot.sendMessage(chatId, `
🌐 *Invite Friends* 🌐
Share this link: ${referLink}
Earn 50 bonus points per referral! 🎁
    `, { parse_mode: 'Markdown' });
});

// Health check
app.get('/', (req, res) => res.send('🤖 SuperBot is running!'));

// Initialize
(async () => {
    await loadUsers();
    console.log('Bot initialized!');
    // Set webhook programmatically (optional, can be done manually too)
    const webhookUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}/webhook`
        : 'https://new-tg-bot-indol.vercel.app/';
    await bot.setWebHook(webhookUrl);
})();

module.exports = app;
