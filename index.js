// const { Telegraf } = require("telegraf");
// const path = require("path");

// const bot = new Telegraf("8147782034:AAEeS1tXZxeR919ZECGl9aEI0-AOlQrTlM4");

// bot.start((ctx) => {
//   ctx.reply(`
// 🇺🇿 Smart Dunyo Pay platformasiga xush kelibsiz!
// Savolingizni yozing.

// 🇷🇺 Добро пожаловать на платформу Smart Dunyo Pay!
// Напишите свой вопрос.
//   `);

//   return ctx.replyWithDocument({
//     source: path.join(__dirname, "Инструкция Smart Dunyo Pay.pdf"),
//   });
// });

// bot
//   .launch()
//   .then(() => console.log("🤖 Бот успешно запущен"))
//   .catch((err) => console.error("Ошибка при запуске:", err));

// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));


const { Telegraf, Markup } = require("telegraf");
const path = require("path");

const bot = new Telegraf("8147782034:AAEeS1tXZxeR919ZECGl9aEI0-AOlQrTlM4");
const ADMIN_CHAT_ID = -4929636803; // Замените на ваш ID группы

const userStates = new Map(); // Храним состояния пользователя

bot.start((ctx) => {
  ctx.reply(
    `🇺🇿 Smart Dunyo Pay platformasiga xush kelibsiz!\nSavolingizni yozing.\n\n🇷🇺 Добро пожаловать на платформу Smart Dunyo Pay!\nНапишите свой вопрос.`
  );

  ctx.replyWithDocument({
    source: path.join(__dirname, "Инструкция Smart Dunyo Pay.pdf"),
  });

  userStates.set(ctx.from.id, { step: "waiting_question" });
});

// Обработка текстовых сообщений
bot.on("text", async (ctx) => {
  const state = userStates.get(ctx.from.id);

  if (!state) return;

  if (state.step === "waiting_question") {
    state.question = ctx.message.text;
    state.step = "waiting_contact";
    userStates.set(ctx.from.id, state);

    await ctx.reply(
      `Iltimos, ismingizni yozing va yuboring.\nПожалуйста, введите своё имя.`
    );
  } else if (state.step === "waiting_contact") {
    state.name = ctx.message.text;
    state.step = "waiting_phone";
    userStates.set(ctx.from.id, state);

    await ctx.reply(
      `Iltimos, telefon raqamingizni yuboring.\nПожалуйста, отправьте свой номер телефона.`,
      Markup.keyboard([
        Markup.button.contactRequest("📱 Телефон номерини юбориш"),
      ])
        .oneTime()
        .resize()
    );
  }
});

// Обработка контакта
bot.on("contact", async (ctx) => {
  const state = userStates.get(ctx.from.id);

  if (!state || state.step !== "waiting_phone") return;

  const phone = ctx.message.contact.phone_number;
  const name = state.name;
  const question = state.question;

  const finalMessage = `
📩 Yangi savol:

🧑 Ismi: ${name}
📞 Telefon: ${phone}
❓ Savol: ${question}
`;

  // Отправка в админ-группу
  await ctx.telegram.sendMessage(ADMIN_CHAT_ID, finalMessage);

  await ctx.reply("Rahmat! Siz bilan tez orada bog'lanamiz. ✅");
  userStates.delete(ctx.from.id); // Очистим состояние
});

bot.launch().then(() => console.log("🤖 Бот успешно запущен"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

