const { Telegraf, Markup } = require("telegraf");
const path = require("path");

const bot = new Telegraf("8147782034:AAEeS1tXZxeR919ZECGl9aEI0-AOlQrTlM4");
const ADMIN_CHAT_ID = -4929636803; // ID твоей группы

const userStates = new Map(); // Храним состояние пользователя

// Команда /start
bot.start(async (ctx) => {
  userStates.set(ctx.from.id, { step: "waiting_question" });

  await ctx.reply(
    `🇺🇿 Smart Dunyo Pay platformasiga xush kelibsiz!\nIltimos, savolingizni yozing.\n\n🇷🇺 Добро пожаловать на платформу Smart Dunyo Pay!\nПожалуйста, напишите свой вопрос.`
  );

  await ctx.replyWithDocument({
    source: path.join(__dirname, "Инструкция Smart Dunyo Pay.pdf"),
    filename: "Smart Dunyo Pay - Yo‘riqnoma.pdf"
  });
});

// Двухъязычные тексты
const prompts = {
  askName: "🇺🇿 Iltimos, ismingizni yozing.\n🇷🇺 Пожалуйста, введите своё имя.",
  askPhone: "🇺🇿 Iltimos, telefon raqamingizni yuboring.\n🇷🇺 Пожалуйста, отправьте свой номер телефона.",
  thanks: "✅ Rahmat! Savolingiz yuborildi. Tez orada siz bilan bog'lanamiz.\n\n✉️ Вы также можете задать новый вопрос, если потребуется.",
  repeatButton: "✏️ Yangi savol berish / Задать новый вопрос",
  sendContactButton: "📱 Telefon raqamini yuborish / Отправить номер"
};

// Кнопка "задать вопрос заново"
bot.hears(prompts.repeatButton, async (ctx) => {
  userStates.set(ctx.from.id, { step: "waiting_question" });
  await ctx.reply("🇺🇿 Savolingizni yozing\n🇷🇺 Напишите свой вопрос");
});

// Обработка текста
bot.on("text", async (ctx) => {
  const state = userStates.get(ctx.from.id);

  if (!state) return;

  const text = ctx.message.text;

  if (state.step === "waiting_question") {
    state.question = text;
    state.step = "waiting_name";
    userStates.set(ctx.from.id, state);
    await ctx.reply(prompts.askName);
  } else if (state.step === "waiting_name") {
    state.name = text;
    state.step = "waiting_phone";
    userStates.set(ctx.from.id, state);
    await ctx.reply(
      prompts.askPhone,
      Markup.keyboard([
        Markup.button.contactRequest(prompts.sendContactButton),
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

  const message = `
📩 Yangi savol / Новый вопрос:

🧑 Ismi / Имя: ${name}
📞 Telefon: ${phone}
❓ Savol / Вопрос:
${question}
`;

  await ctx.telegram.sendMessage(ADMIN_CHAT_ID, message);

  await ctx.reply(prompts.thanks, Markup.keyboard([
    [prompts.repeatButton]
  ]).resize());

  userStates.delete(ctx.from.id); // Очистка состояния
});

// Запуск
bot.launch().then(() => console.log("🤖 Бот запущен"));

// Завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
