const { Telegraf, Markup } = require("telegraf");
const path = require("path");

const bot = new Telegraf("8147782034:AAEeS1tXZxeR919ZECGl9aEI0-AOlQrTlM4");
const ADMIN_CHAT_ID = -4742476473;
const ADMIN_ID = 693825152;

const userStates = new Map();
const userProfiles = new Map();
const pendingReplies = new Map();

// Форматирование даты для вопросов и ответов
function formatDate() {
  const now = new Date();
  return now.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" });
}

// /start
bot.start(async (ctx) => {
  try {
    userStates.set(ctx.from.id, { step: "language" });

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
    const profile = userProfiles.get(ctx.from.id) || { questions: [] };
    userProfiles.set(ctx.from.id, { ...profile, lang });

    if (profile.name && profile.phone) {
      userStates.set(ctx.from.id, { step: "waiting_question" });
      await ctx.reply(
        lang === "uz"
          ? `Savolingizni yozing (ism: ${profile.name}, telefon: ${profile.phone}):`
          : `Пожалуйста, напишите свой вопрос (имя: ${profile.name}, телефон: ${profile.phone}):`,
        Markup.removeKeyboard()
      );
    } else {
      userStates.set(ctx.from.id, { step: profile.name ? "waiting_phone" : "waiting_name" });
      await ctx.reply(
        lang === "uz"
          ? (profile.name ? "Telefon raqamingizni yuboring:" : "Ismingizni yozing:")
          : (profile.name ? "Отправьте номер телефона:" : "Введите своё имя:"),
        profile.name
          ? Markup.keyboard([
              [
                Markup.button.contactRequest(
                  lang === "uz" ? "📱 Raqamni yuborish" : "📱 Отправить номер"
                ),
              ],
            ])
              .resize()
              .oneTime()
          : Markup.removeKeyboard()
      );
    }
  } catch (error) {
    console.error(`Ошибка при выборе языка для ${ctx.from.id}:`, error);
    await ctx.reply("❌ Произошла ошибка. Попробуйте снова.");
  }
});

// Контакт
bot.on("contact", async (ctx) => {
  try {
    const state = userStates.get(ctx.from.id);
    if (!state || state.step !== "waiting_phone") return;

    const profile = userProfiles.get(ctx.from.id);
    profile.phone = ctx.message.contact.phone_number;
    userProfiles.set(ctx.from.id, profile);
    userStates.set(ctx.from.id, { step: "waiting_question" });

    await ctx.reply(
      profile.lang === "uz"
        ? `Savolingizni yozing (ism: ${profile.name}, telefon: ${profile.phone}):`
        : `Пожалуйста, напишите свой вопрос (имя: ${profile.name}, телефон: ${profile.phone}):`,
      Markup.removeKeyboard()
    );
  } catch (error) {
    console.error(`Ошибка при обработке контакта для ${ctx.from.id}:`, error);
    await ctx.reply("❌ Произошла ошибка. Попробуйте снова.");
  }
});

// Текст
bot.on("text", async (ctx) => {
  try {
    console.log(`Получен текст: "${ctx.message.text}" от ${ctx.from.id}`);
    let state = userStates.get(ctx.from.id);
    let profile = userProfiles.get(ctx.from.id) || { questions: [] };
    const text = ctx.message.text;

    // Админ пишет ответ
    if (pendingReplies.has(ctx.from.id)) {
      const { userId, lang, adminMsgId, questionIndex } = pendingReplies.get(ctx.from.id);

      if (text === "Yangi savol berish / Задать новый вопрос") {
        await ctx.reply(
          "❗ Это кнопка, а не текст ответа. Напишите реальный ответ."
        );
        return;
      }

      const userProfile = userProfiles.get(userId);
      if (!userProfile || !userProfile.questions[questionIndex]) {
        await ctx.reply("❗ Вопрос или пользователь не найден.");
        pendingReplies.delete(ctx.from.id);
        return;
      }

      // Сохраняем ответ для конкретного вопроса
      const question = userProfile.questions[questionIndex];
      question.answers = question.answers || [];
      question.answers.push({ text, timestamp: formatDate() });
      userProfiles.set(userId, userProfile);

      // Отправляем ответ пользователю с указанием вопроса
      await ctx.telegram.sendMessage(
        userId,
        lang === "uz"
          ? `📬 Sizga javob (savol: ${question.question}):\n\n${text}`
          : `📬 Вам ответили (вопрос: ${question.question}):\n\n${text}`
      );

      // Обновляем карточку в админском чате
      await updateAdminCard(userId, userProfile);

      // Удаляем сообщение админа
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, adminMsgId);
      } catch (error) {
        console.error(`Ошибка при удалении сообщения ${adminMsgId}:`, error);
      }

      await ctx.reply("✅ Ответ отправлен пользователю и добавлен в карточку.");
      pendingReplies.delete(ctx.from.id);
      return;
    }

    // Новый вопрос
    if (text === "Yangi savol berish / Задать новый вопрос") {
      console.log(`Обработка кнопки "Yangi savol berish" для ${ctx.from.id}: state=${JSON.stringify(state)}, profile=${JSON.stringify(profile)}`);
      pendingReplies.delete(ctx.from.id);
      const lang = profile.lang || "uz";

      userProfiles.set(ctx.from.id, { ...profile, lang });

      if (profile.name && profile.phone) {
        userStates.set(ctx.from.id, { step: "waiting_question" });
        await ctx.reply(
          lang === "uz"
            ? `Yangi savolingizni yozing (ism: ${profile.name}, telefon: ${profile.phone}):`
            : `Пожалуйста, напишите новый вопрос (имя: ${profile.name}, телефон: ${profile.phone}):`,
          Markup.removeKeyboard()
        );
      } else {
        userStates.set(ctx.from.id, { step: profile.name ? "waiting_phone" : "waiting_name" });
        await ctx.reply(
          lang === "uz"
            ? (profile.name ? "Telefon raqamingizni yuboring:" : "Ismingizni yozing:")
            : (profile.name ? "Отправьте номер телефона:" : "Введите своё имя:"),
          profile.name
            ? Markup.keyboard([
                [
                  Markup.button.contactRequest(
                    lang === "uz" ? "📱 Raqamni yuborish" : "📱 Отправить номер"
                  ),
                ],
              ])
                .resize()
                .oneTime()
            : Markup.removeKeyboard()
        );
      }
      return;
    }

    if (!state) return;

    const lang = profile.lang || "uz";

    // Вопрос
    if (state.step === "waiting_question") {
      if (!text.trim() || text === "Yangi savol berish / Задать новый вопрос") {
        await ctx.reply(
          lang === "uz"
            ? "Iltimos, savolingizni matn ko'rinishida yozing."
            : "Пожалуйста, напишите свой вопрос текстом."
        );
        return;
      }

      profile.questions.push({ question: text, answers: [], timestamp: formatDate() });
      userProfiles.set(ctx.from.id, profile);

      if (profile.name && profile.phone) {
        await handleCompleteProfile(ctx, profile, profile.questions.length - 1);
      } else {
        userStates.set(ctx.from.id, { step: profile.name ? "waiting_phone" : "waiting_name" });
        await ctx.reply(
          lang === "uz"
            ? (profile.name ? "Telefon raqamingizni yuboring:" : "Ismingizni yozing:")
            : (profile.name ? "Отправьте номер телефона:" : "Введите своё имя:"),
          profile.name
            ? Markup.keyboard([
                [
                  Markup.button.contactRequest(
                    lang === "uz" ? "📱 Raqamni yuborish" : "📱 Отправить номер"
                  ),
                ],
              ])
                .resize()
                .oneTime()
            : Markup.removeKeyboard()
        );
      }
    }
    // Имя
    else if (state.step === "waiting_name") {
      profile.name = text;
      userProfiles.set(ctx.from.id, profile);
      userStates.set(ctx.from.id, { step: "waiting_phone" });

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
    }
    // Ручной номер телефона
    else if (state.step === "waiting_phone") {
      if (/^\+?\d{7,15}$/.test(text)) {
        profile.phone = text;
        userProfiles.set(ctx.from.id, profile);
        userStates.set(ctx.from.id, { step: "waiting_question" });

        await ctx.reply(
          lang === "uz"
            ? `Savolingizni yozing (ism: ${profile.name}, telefon: ${profile.phone}):`
            : `Пожалуйста, напишите свой вопрос (имя: ${profile.name}, телефон: ${profile.phone}):`,
          Markup.removeKeyboard()
        );
      } else {
        await ctx.reply(
          lang === "uz"
            ? "Iltimos, telefon raqamingizni to‘g‘ri kiriting yoki pastdagi tugmadan foydalaning."
            : "Пожалуйста, введите корректный номер или используйте кнопку ниже."
        );
      }
    }
  } catch (error) {
    console.error(`Ошибка при обработке текста от ${ctx.from.id}:`, error);
    await ctx.reply(
      profile.lang === "uz"
        ? "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring."
        : "❌ Произошла ошибка. Пожалуйста, попробуйте снова."
    );
  }
});

// Ответ из инлайн-кнопки
bot.on("callback_query", async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    console.log(`Callback query: ${data} от ${ctx.from.id}`);

    if (!data.startsWith("reply_")) return;

    const [_, userId, questionIndex] = data.split("_");
    const userIdNum = Number(userId);
    const questionIndexNum = Number(questionIndex);
    const profile = userProfiles.get(userIdNum);

    if (!profile || !profile.questions[questionIndexNum]) {
      await ctx.answerCbQuery("❗ Вопрос или пользователь не найден.");
      return;
    }

    pendingReplies.set(ctx.from.id, {
      userId: userIdNum,
      lang: profile.lang,
      adminMsgId: ctx.message ? ctx.message.message_id : null,
      questionIndex: questionIndexNum,
    });

    await ctx.answerCbQuery();
    await ctx.reply(
      profile.lang === "uz"
        ? `✍️ Savolga javob yozing (savol: ${profile.questions[questionIndexNum].question}):`
        : `✍️ Напишите ответ на вопрос (вопрос: ${profile.questions[questionIndexNum].question}):`
    );
  } catch (error) {
    console.error(`Ошибка при обработке callback_query от ${ctx.from.id}:`, error);
    await ctx.answerCbQuery("❌ Произошла ошибка.");
  }
});

// Функция: обновление карточки в админском чате
async function updateAdminCard(userId, profile) {
  try {
    const { name, phone, lang, questions, adminMsgId } = profile;

    const questionsText = questions
      .slice(-10) // Ограничиваем до 10 последних вопросов
      .map((q, index) => {
        const answersText = q.answers
          ? q.answers
              .slice(-5) // Ограничиваем до 5 последних ответов
              .map((a, aIndex) => `  ${aIndex + 1}. [${a.timestamp}] ${a.text}`)
              .join("\n")
          : "Пока нет ответов";
        return `
Savol #${index + 1} / Вопрос #${index + 1} [${q.timestamp}]:
${q.question}
📬 Javoblar / Ответы:
${answersText}`;
      })
      .join("\n\n");

    const groupMessage = `
📩 Foydalanuvchi / Пользователь: ${name}
📞 Telefon: ${phone}

${questionsText}

#USER${userId}
    `;

    const buttons = questions.map((_, index) => [
      Markup.button.callback(
        lang === "uz" ? `📩 Savol #${index + 1} ga javob` : `📩 Ответить на вопрос #${index + 1}`,
        `reply_${userId}_${index}`
      ),
    ]);

    if (adminMsgId) {
      await bot.telegram.editMessageText(
        ADMIN_CHAT_ID,
        adminMsgId,
        null,
        groupMessage,
        Markup.inlineKeyboard(buttons)
      );
    } else {
      const sent = await bot.telegram.sendMessage(
        ADMIN_CHAT_ID,
        groupMessage,
        Markup.inlineKeyboard(buttons)
      );
      profile.adminMsgId = sent.message_id;
      userProfiles.set(userId, profile);
    }
  } catch (error) {
    console.error(`Ошибка при обновлении карточки для ${userId}:`, error);
  }
}

// Функция: обработка заполненного профиля
async function handleCompleteProfile(ctx, profile, questionIndex) {
  try {
    const { name, phone, lang, questions } = profile;
    const question = questions[questionIndex];

    if (!name || !phone || !question.question) {
      console.error(`Неполный профиль для ${ctx.from.id}:`, profile);
      await ctx.reply(
        lang === "uz"
          ? "❌ Ma'lumotlar to'liq emas. Iltimos, qaytadan urinib ko‘ring."
          : "❌ Данные неполные. Пожалуйста, попробуйте снова."
      );
      return;
    }

    await updateAdminCard(ctx.from.id, profile);

    userStates.delete(ctx.from.id);
    await ctx.reply(
      lang === "uz"
        ? "✅ Rahmat! Savolingiz yuborildi. Tez orada siz bilan bog'lanamiz."
        : "✅ Спасибо! Ваш вопрос отправлен. Мы скоро с вами свяжемся.",
      Markup.keyboard([["Yangi savol berish / Задать новый вопрос"]]).resize()
    );
  } catch (error) {
    console.error(`Ошибка в handleCompleteProfile для ${ctx.from.id}:`, error);
    await ctx.reply(
      profile.lang === "uz"
        ? "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring."
        : "❌ Произошла ошибка. Пожалуйста, попробуйте снова."
    );
  }
}

// Запуск
bot.launch().then(() => console.log("🤖 Бот успешно запущен"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));