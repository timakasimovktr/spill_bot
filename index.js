const { Telegraf, Markup } = require("telegraf");
const path = require("path");

const bot = new Telegraf("8147782034:AAEeS1tXZxeR919ZECGl9aEI0-AOlQrTlM4");
const ADMIN_CHAT_ID = -4742476473;

const userStates = new Map();
const userProfiles = new Map();
const pendingReplies = new Map();

// Форматирование даты
const formatDate = () =>
  new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" });

// Автоудаление сообщений
const autoDeleteMessage = async (ctx, chatId, messageId, delay = 10000) => {
  try {
    setTimeout(() => {
      ctx.telegram.deleteMessage(chatId, messageId).catch((error) => {
        console.error(`Ошибка удаления сообщения ${messageId}:`, error);
      });
    }, delay);
  } catch (error) {
    console.error(
      `Ошибка при планировании удаления сообщения ${messageId}:`,
      error
    );
  }
};

// /start
// /start
// /start
bot.start(async (ctx) => {
  try {
    userStates.set(ctx.from.id, { step: "language" });

    // Отправка изображений по одному
    const images = [
      "1.png",
      "2.png",
      "3.png",
      "4.png",
      "5.png",
      "6.jpg",
      "7.jpg",
    ];
    for (const image of images) {
      await ctx.replyWithPhoto(
        { source: path.join(__dirname, image) },
        { disable_notification: true }
      );
    }

    // Отправка PDF
    await ctx.replyWithDocument({
      source: path.join(__dirname, "Инструкция Smart Dunyo Pay.pdf"),
      filename: "Smart Dunyo Pay - Yo‘riqnoma.pdf",
    });

    await ctx.reply(
      "Tilni tanlang / Выберите язык:",
      Markup.keyboard([["🇺🇿 O'zbek tili", "🇷🇺 Русский язык"]]).resize()
    );
  } catch (error) {
    console.error(`Ошибка в /start для ${ctx.from.id}:`, error);
    await ctx.reply("❌ Произошла ошибка. Попробуйте снова.");
  }
});

// Выбор языка
bot.hears(["🇺🇿 O'zbek tili", "🇷🇺 Русский язык"], async (ctx) => {
  try {
    const lang = ctx.message.text.includes("O'zbek") ? "uz" : "ru";
    const profile = userProfiles.get(ctx.from.id) || { questions: [], lang };

    userProfiles.set(ctx.from.id, profile);
    userStates.set(ctx.from.id, {
      step: profile.name ? "waiting_phone" : "waiting_name",
    });

    await ctx.reply(
      lang === "uz"
        ? profile.name
          ? "Telefon raqamingizni +998901234567 formatida kiriting:"
          : "Ismingizni yozing:"
        : profile.name
        ? "Введите номер телефона в формате +998901234567:"
        : "Введите своё имя:",
      profile.name
        ? Markup.keyboard([
            [
              Markup.button.contactRequest(
                lang === "uz" ? "📱 Raqamni yuborish" : "📱 Отправить номер"
              ),
            ],
            [Markup.button.text("+998901234567")], // Пример формата
          ])
            .resize()
            .oneTime()
        : Markup.removeKeyboard()
    );
  } catch (error) {
    console.error(`Ошибка при выборе языка для ${ctx.from.id}:`, error);
    await ctx.reply("❌ Произошла ошибка. Попробуйте снова.");
  }
});

// Обработка контакта
bot.on("contact", async (ctx) => {
  try {
    const state = userStates.get(ctx.from.id);
    if (!state || state.step !== "waiting_phone") return;

    const profile = userProfiles.get(ctx.from.id);
    profile.phone = ctx.message.contact.phone_number;
    userProfiles.set(ctx.from.id, profile);
    userStates.set(ctx.from.id, { step: "waiting_question" });

    await ctx.reply(
      profile.lang === "uz" ? "Savolingizni yozing:" : "Напишите свой вопрос:",
      Markup.removeKeyboard()
    );
  } catch (error) {
    console.error(`Ошибка при обработке контакта для ${ctx.from.id}:`, error);
    await ctx.reply("❌ Произошла ошибка. Попробуйте снова.");
  }
});

// Обработка текста
bot.on("text", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const state = userStates.get(userId);
    let profile = userProfiles.get(userId) || { questions: [], lang: "uz" };
    const lang = profile.lang;

    // Ответ из группы (только после нажатия кнопки "Ответить")
    if (pendingReplies.has(userId)) {
      const { targetUserId, questionIndex } = pendingReplies.get(userId);
      const targetProfile = userProfiles.get(targetUserId);

      if (!targetProfile || !targetProfile.questions[questionIndex]) {
        await ctx.reply("❗ Вопрос или пользователь не найден.");
        pendingReplies.delete(userId);
        return;
      }

      const question = targetProfile.questions[questionIndex];
      question.chat = question.chat || [];
      question.chat.push({ type: "answer", text, timestamp: formatDate() });
      question.answered = !hasUnansweredQuestions(question.chat);
      userProfiles.set(targetUserId, targetProfile);

      // Уведомление пользователю (без префикса)
      await ctx.telegram.sendMessage(targetUserId, text);

      // Дублирование карточки
      await duplicateAdminCard(ctx, targetUserId, questionIndex);

      // Сообщение об успехе с автоудалением
      const sentMsg = await ctx.reply("✅ Ответ отправлен пользователю.");
      await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);

      // Автоудаление текста ответа
      await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id);

      pendingReplies.delete(userId);
      return;
    }

    // Игнорируем сообщения в группе, если пользователь не в режиме ответа
    if (ctx.chat.id === ADMIN_CHAT_ID && !pendingReplies.has(userId)) {
      await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id);
      return;
    }

    if (!state) return;

    // Обработка шагов пользователя
    if (state.step === "waiting_name") {
      profile.name = text;
      userProfiles.set(userId, profile);
      userStates.set(userId, { step: "waiting_phone" });

      await ctx.reply(
        lang === "uz"
          ? "Telefon raqamingizni yuboring:"
          : "Отправьте номер телефона:",
        Markup.keyboard([
          [
            Markup.button.contactRequest(
              lang === "uz" ? "📱 Raqamni yuborish" : "📱 Отправить номер"
            ),
          ],
        ])
          .resize()
          .oneTime()
      );
    } else if (state.step === "waiting_phone" && /^\+998\d{9}$/.test(text)) {
      profile.phone = text;
      userProfiles.set(userId, profile);
      userStates.set(userId, { step: "waiting_question" });

      await ctx.reply(
        lang === "uz" ? "Savolingizni yozing:" : "Напишите свой вопрос:",
        Markup.removeKeyboard()
      );
    } else if (state.step === "waiting_phone") {
      await ctx.reply(
        lang === "uz"
          ? "Iltimos, telefon raqamingizni +998901234567 formatida kiriting:"
          : "Пожалуйста, введите номер телефона в формате +998901234567:",
        Markup.keyboard([
          [
            Markup.button.contactRequest(
              lang === "uz" ? "📱 Raqamni yuborish" : "📱 Отправить номер"
            ),
          ],
          [Markup.button.text("+998901234567")], // Пример формата
        ])
          .resize()
          .oneTime()
      );
    } else if (state.step === "waiting_question" && text) {
      // Добавление сообщения в текущий вопрос или создание нового
      if (!profile.questions.length) {
        profile.questions.push({
          chat: [{ type: "question", text, timestamp: formatDate() }],
          answered: false,
          adminMsgId: null,
        });
      } else {
        profile.questions[0].chat = profile.questions[0].chat || [];
        profile.questions[0].chat.push({
          type: "question",
          text,
          timestamp: formatDate(),
        });
        profile.questions[0].answered = false; // Новый вопрос делает статус неотвеченным
      }
      userProfiles.set(userId, profile);

      await duplicateAdminCard(ctx, userId, 0);

      // Подтверждение с автоудалением
      const sentMsg = await ctx.reply(
        lang === "uz"
          ? "✅ Savol qabul qilindi. Tez orada javob beramiz."
          : "✅ Вопрос принят. Скоро ответим."
      );
      await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
    } else {
      await ctx.reply(
        lang === "uz"
          ? "Iltimos, to‘g‘ri ma'lumot kiriting."
          : "Пожалуйста, введите корректные данные."
      );
    }
  } catch (error) {
    console.error(`Ошибка при обработке текста от ${ctx.from.id}:`, error);
    await ctx.reply(
      profile.lang === "uz"
        ? "❌ Xatolik yuz berdi. Qaytadan urinib ko‘ring."
        : "❌ Произошла ошибка. Попробуйте снова."
    );
  }
});

// Проверка, есть ли неотвеченные вопросы
function hasUnansweredQuestions(chat) {
  if (!chat || chat.length === 0) return false;
  for (let i = chat.length - 1; i >= 0; i--) {
    if (chat[i].type === "question") return true;
    if (chat[i].type === "answer") return false;
  }
  return false;
}

// Обработка callback-запросов
bot.on("callback_query", async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("reply_")) {
      await ctx.answerCbQuery("❌ Неверное действие.");
      return;
    }

    const [_, userId, questionIndex] = data.split("_");
    const targetUserId = Number(userId);
    const questionIndexNum = Number(questionIndex);
    const profile = userProfiles.get(targetUserId);

    if (!profile || !profile.questions[questionIndexNum]) {
      await ctx.answerCbQuery("❗ Вопрос или пользователь не найден.");
      return;
    }

    pendingReplies.set(ctx.from.id, {
      targetUserId,
      questionIndex: questionIndexNum,
    });

    await ctx.answerCbQuery();
    const sentMsg = await ctx.reply("✍️ Напишите ответ пользователю:");
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
  } catch (error) {
    console.error(`Ошибка в callback_query от ${ctx.from.id}:`, error);
    await ctx.answerCbQuery("❌ Произошла ошибка.");
  }
});

async function showUnansweredCount(ctx) {
  let count = 0;
  for (const profile of userProfiles.values()) {
    for (const question of profile.questions) {
      if (!question.answered) count++;
    }
  }
  await ctx.reply(`🔴 Неотвеченных вопросов: ${count}`);
}

// Дублирование карточки админа
async function duplicateAdminCard(ctx, userId, questionIndex) {
  try {
    const profile = userProfiles.get(userId);
    const question = profile.questions[questionIndex];

    // Сортировка сообщений и ответов по времени
    const chatText = (question.chat || [])
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-10)
      .map((item) => {
        const prefix = item.type === "question" ? "👨‍🦰" : "🤖";
        const text = item.text;
        return `<i>${item.timestamp}</i>\n${prefix} ${text}\n---`;
      })
      .join("\n");

    const status = question.answered ? "🟢 Отвечено" : "🔴 Ожидает ответа";
    const statusEmoji = question.answered ? "🟢" : "🔴";
    const lastUpdated = formatDate();

    const groupMessage = `
<b>📩 Savol / Вопрос #${questionIndex + 1}</b>

<b>🧑 Имя:</b> ${profile.name}
<b>📞 Телефон:</b> ${profile.phone}
<b>📅 Последнее обновление:</b> ${lastUpdated}
<b>📊 Статус:</b> ${status}

<b>💬 Чат:</b>
${chatText || "Нет сообщений"}

#USER${userId}
    `;

    // Удаление предыдущей карточки
    if (question.adminMsgId) {
      try {
        await ctx.telegram.deleteMessage(ADMIN_CHAT_ID, question.adminMsgId);
      } catch (error) {
        console.error(
          `Ошибка удаления карточки ${question.adminMsgId}:`,
          error
        );
      }
    }

    // Создание новой карточки с HTML-разметкой
    const sent = await ctx.telegram.sendMessage(ADMIN_CHAT_ID, groupMessage, {
      parse_mode: "HTML",
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback(
          profile.lang === "uz"
            ? `📩 Javob berish ${statusEmoji}`
            : `📩 Ответить ${statusEmoji}`,
          `reply_${userId}_${questionIndex}`
        ),
      ]).reply_markup,
    });

    question.adminMsgId = sent.message_id;
    userProfiles.set(userId, profile);
  } catch (error) {
    console.error(`Ошибка дублирования карточки для ${userId}:`, error);
  }
}

bot.command("unanswered", async (ctx) => {
  if (ctx.chat.id !== ADMIN_CHAT_ID) return;
  await showUnansweredCount(ctx);
});

// Запуск бота
bot.launch().then(() => console.log("🤖 Бот успешно запущен"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
