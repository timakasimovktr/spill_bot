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
bot.start(async (ctx) => {
  try {
    userStates.set(ctx.from.id, { step: "language" });

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
            [Markup.button.text("+998901234567")],
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

      await ctx.telegram.sendMessage(targetUserId, text);
      await sortAndUpdateCards(ctx); // Сортировка после ответа

      const sentMsg = await ctx.reply("✅ Ответ отправлен пользователю.");
      await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
      await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id);

      pendingReplies.delete(userId);
      return;
    }

    // Игнорируем сообщения в группе, если пользователь не в режиме ответа
    if (ctx.chat.id === ADMIN_CHAT_ID && !pendingReplies.has(userId)) {
      if (!text.startsWith("/")) {
        await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id);
        return;
      }
      if (!["/unanswered", "/sort", "/help"].includes(text)) {
        const sentMsg = await ctx.reply(
          "❌ Неизвестная команда. Используйте /help для списка команд."
        );
        await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
        await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id);
      }
      return;
    }

    if (!state) return;

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
          [Markup.button.text("+998901234567")],
        ])
          .resize()
          .oneTime()
      );
    } else if (state.step === "waiting_question" && text) {
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
        profile.questions[0].answered = false;
      }
      userProfiles.set(userId, profile);

      await sortAndUpdateCards(ctx); // Сортировка после нового вопроса

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
  try {
    console.log("Выполняется команда /unanswered");
    let count = 0;
    for (const profile of userProfiles.values()) {
      for (const question of profile.questions) {
        if (!question.answered) count++;
      }
    }
    const message = count > 0
      ? `🔴 Неотвеченных вопросов: ${count}`
      : "✅ Все вопросы отвечены!";
    await ctx.reply(message);
    console.log(`Команда /unanswered выполнена: ${message}`);
  } catch (error) {
    console.error("Ошибка в showUnansweredCount:", error);
    await ctx.reply("❌ Ошибка при подсчете неотвеченных вопросов.");
  }
}

// Создание одной карточки
async function createAdminCard(ctx, userId, questionIndex) {
  try {
    const profile = userProfiles.get(userId);
    const question = profile.questions[questionIndex];

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
    console.error(`Ошибка создания карточки для ${userId}:`, error);
  }
}

// Сортировка и обновление всех карточек
async function sortAndUpdateCards(ctx) {
  try {
    console.log("Выполняется сортировка и обновление карточек");

    const allQuestions = [];
    for (const [userId, profile] of userProfiles.entries()) {
      profile.questions.forEach((question, index) => {
        allQuestions.push({
          userId,
          questionIndex: index,
          question,
          timestamp: question.chat[question.chat.length - 1]?.timestamp || formatDate(),
        });
      });
    }

    if (allQuestions.length === 0) {
      console.log("Нет вопросов для сортировки");
      return;
    }

    // Сортировка: отвеченные сверху, неотвеченные снизу
    allQuestions.sort((a, b) => {
      if (a.question.answered !== b.question.answered) {
        return a.question.answered ? -1 : 1; // 🟢 сверху, 🔴 снизу
      }
      return new Date(b.timestamp) - new Date(a.timestamp); // Новые выше
    });

    // Удаление старых карточек
    for (const { userId, questionIndex } of allQuestions) {
      const profile = userProfiles.get(userId);
      const question = profile.questions[questionIndex];
      if (question.adminMsgId) {
        try {
          await ctx.telegram.deleteMessage(ADMIN_CHAT_ID, question.adminMsgId);
          question.adminMsgId = null;
          userProfiles.set(userId, profile);
        } catch (error) {
          console.error(
            `Ошибка удаления карточки ${question.adminMsgId}:`,
            error
          );
        }
      }
    }

    // Создание новых карточек в отсортированном порядке
    for (const { userId, questionIndex } of allQuestions) {
      await createAdminCard(ctx, userId, questionIndex);
    }

    console.log("Сортировка и обновление карточек завершены");
  } catch (error) {
    console.error("Ошибка в sortAndUpdateCards:", error);
  }
}

// Команда /unanswered
bot.command("unanswered", async (ctx) => {
  if (ctx.chat.id !== ADMIN_CHAT_ID) {
    console.log(`Попытка вызова /unanswered вне админ-чата: ${ctx.from.id}`);
    const sentMsg = await ctx.reply("❌ Эта команда доступна только в чате администраторов.");
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
    await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id);
    return;
  }
  await showUnansweredCount(ctx);
});

// Команда /sort
bot.command("sort", async (ctx) => {
  if (ctx.chat.id !== ADMIN_CHAT_ID) {
    console.log(`Попытка вызова /sort вне админ-чата: ${ctx.from.id}`);
    const sentMsg = await ctx.reply("❌ Эта команда доступна только в чате администраторов.");
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
    await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id);
    return;
  }

  try {
    console.log("Выполняется команда /sort");
    await sortAndUpdateCards(ctx);
    const sentMsg = await ctx.reply(
      "✅ Вопросы отсортированы: отвеченные (🟢) сверху, неотвеченные (🔴) снизу."
    );
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
    console.log("Команда /sort выполнена успешно");
  } catch (error) {
    console.error("Ошибка в команде /sort:", error);
    const sentMsg = await ctx.reply("❌ Ошибка при сортировке вопросов.");
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
  }
});

// Команда /help
bot.command("help", async (ctx) => {
  if (ctx.chat.id !== ADMIN_CHAT_ID) {
    console.log(`Попытка вызова /help вне админ-чата: ${ctx.from.id}`);
    const sentMsg = await ctx.reply("❌ Эта команда доступна только в чате администраторов.");
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
    await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id);
    return;
  }

  const helpMessage = `
📋 Доступные команды для администраторов:
• /unanswered — Показать количество неотвеченных вопросов.
• /sort — Отсортировать вопросы: отвеченные (🟢) сверху, неотвеченные (🔴) снизу.
• /help — Показать это сообщение.
  `;
  const sentMsg = await ctx.reply(helpMessage);
  await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id);
  console.log("Команда /help выполнена");
});

// Запуск бота
bot.launch().then(() => console.log("🤖 Бот успешно запущен"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));