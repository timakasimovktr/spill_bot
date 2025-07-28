const { Telegraf, Markup } = require("telegraf");
const path = require("path");

const bot = new Telegraf("8147782034:AAEeS1tXZxeR919ZECGl9aEI0-AOlQrTlM4");
const ADMIN_CHAT_ID = -4929636803;
const ADMIN_ID = 5292280353; // Вставь сюда свой Telegram ID

const userStates = new Map();     // Временное состояние (step)
const userProfiles = new Map();   // Имя, номер, язык и вопрос
const pendingReplies = new Map(); // Кто и кому отвечает

// Команда /start
bot.start(async (ctx) => {
  userStates.set(ctx.from.id, { step: "language" });

  await ctx.reply("Tilni tanlang / Выберите язык:", Markup.keyboard([
    ["🇺🇿 O'zbek tili", "🇷🇺 Русский язык"]
  ]).resize());
});

// Выбор языка
bot.hears(["🇺🇿 O'zbek tili", "🇷🇺 Русский язык"], async (ctx) => {
  const lang = ctx.message.text.includes("O'zbek") ? "uz" : "ru";
  userProfiles.set(ctx.from.id, { lang });
  userStates.set(ctx.from.id, { step: "waiting_question" });

  await ctx.reply(
    lang === "uz"
      ? "Savolingizni yozing, iltimos."
      : "Пожалуйста, напишите свой вопрос."
  );

  await ctx.replyWithDocument({
    source: path.join(__dirname, "Инструкция Smart Dunyo Pay.pdf"),
    filename: "Smart Dunyo Pay - Yo‘riqnoma.pdf"
  });
});

// Текстовые сообщения
bot.on("text", async (ctx) => {
  const state = userStates.get(ctx.from.id);
  const profile = userProfiles.get(ctx.from.id) || {};
  const text = ctx.message.text;

  // Админ отвечает на вопрос
  if (pendingReplies.has(ctx.from.id)) {
    const { userId, lang } = pendingReplies.get(ctx.from.id);
    pendingReplies.delete(ctx.from.id);

    await ctx.telegram.sendMessage(
      userId,
      lang === "uz"
        ? `📬 Sizga javob:\n\n${text}`
        : `📬 Вам ответили:\n\n${text}`
    );
    await ctx.reply("✅ Ответ отправлен пользователю.");
    return;
  }

  if (!state) return;

  const lang = profile.lang || "uz";

  // Новый вопрос
  if (text === "✏️ Yangi savol berish / Задать новый вопрос") {
    userStates.set(ctx.from.id, { step: "waiting_question" });
    await ctx.reply(
      lang === "uz" ? "Yangi savolingizni yozing:" : "Пожалуйста, напишите новый вопрос:"
    );
    return;
  }

  if (state.step === "waiting_question") {
    profile.question = text;
    userProfiles.set(ctx.from.id, profile);
    userStates.set(ctx.from.id, { step: "waiting_name" });

    await ctx.reply(lang === "uz" ? "Ismingizni yozing:" : "Введите своё имя:");
  } else if (state.step === "waiting_name") {
    profile.name = text;
    userProfiles.set(ctx.from.id, profile);
    userStates.set(ctx.from.id, { step: "waiting_phone" });

    await ctx.reply(
      lang === "uz" ? "Telefon raqamingizni yuboring:" : "Отправьте номер телефона:",
      Markup.keyboard([
        [Markup.button.contactRequest(lang === "uz" ? "📱 Raqamni yuborish" : "📱 Отправить номер")]
      ]).resize().oneTime()
    );
  }
});

// Контакт пользователя
bot.on("contact", async (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (!state || state.step !== "waiting_phone") return;

  const profile = userProfiles.get(ctx.from.id);
  profile.phone = ctx.message.contact.phone_number;
  userProfiles.set(ctx.from.id, profile);
  userStates.delete(ctx.from.id);

  const { name, phone, question, lang } = profile;

  const groupMessage = `
📩 Yangi savol / Новый вопрос:

🧑 Ismi / Имя: ${name}
📞 Telefon: ${phone}
❓ Savol / Вопрос:
${question}

#USER${ctx.from.id}
`;

  await ctx.telegram.sendMessage(ADMIN_CHAT_ID, groupMessage, Markup.keyboard([
    ["📩 Ответить на вопрос"]
  ]).resize());

  await ctx.reply(
    lang === "uz"
      ? "✅ Rahmat! Savolingiz yuborildi. Tez orada siz bilan bog'lanamiz."
      : "✅ Спасибо! Ваш вопрос отправлен. Мы скоро с вами свяжемся.",
    Markup.keyboard([
      ["✏️ Yangi savol berish / Задать новый вопрос"]
    ]).resize()
  );
});

// Кнопка "Ответить на вопрос"
bot.hears("📩 Ответить на вопрос", async (ctx) => {
  if (ctx.chat.id !== ADMIN_CHAT_ID || ctx.from.id !== ADMIN_ID) return;

  const reply = ctx.message.reply_to_message;
  if (!reply || !reply.text) return;

  const match = reply.text.match(/#USER(\d+)/);
  if (!match) {
    await ctx.reply("❗ Не удалось найти ID пользователя.");
    return;
  }

  const userId = Number(match[1]);
  const profile = userProfiles.get(userId);
  if (!profile) {
    await ctx.reply("❗ Пользователь не найден.");
    return;
  }

  pendingReplies.set(ctx.from.id, { userId, lang: profile.lang });
  await ctx.reply("✍️ Напишите ответ пользователю:");
});

// Запуск
bot.launch().then(() => console.log("🤖 Бот успешно запущен"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
