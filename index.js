const { Telegraf } = require("telegraf");
const path = require("path");

const bot = new Telegraf("8147782034:AAEeS1tXZxeR919ZECGl9aEI0-AOlQrTlM4");

bot.start((ctx) => {
  ctx.reply(`
🇺🇿 Bot tez orada ishga tushadi!  
Yangi imkoniyatlar va qulayliklar bilan sizni kutmoqda.

🇷🇺 Бот скоро заработает!  
Он будет доступен с новыми возможностями и удобствами.

📢 Kuzatishda davom eting / Следите за новостями!
  `);

  // Отправка PDF-файла из проекта
  return ctx.replyWithDocument({ source: path.join(__dirname, "Инструкция Smart Dunyo Pay.pdf") });
});

bot
  .launch()
  .then(() => console.log("🤖 Бот успешно запущен"))
  .catch((err) => console.error("Ошибка при запуске:", err));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
