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

    // Отправка сообщения в зависимости от языка
    if (lang === "uz") {
      await ctx.reply(`
Ҳурматли колониядаги жазони утаётганларнинг яқинлари ота-оналари ва яқин қариндошлари!

Биз сиз учун яқинларингиз билан алоқа қилиб, уларга ғамхўрлик қилиш қанчалик муҳим эканлигини яхши биламиз.
Эндиликда бу жараён янада осон, тез ва қулай бўлди!

"OLTIN ASR DBT" IT-компанияси "Uzum Bank" билан ҳамкорликда колониялардаги ҳисоб рақамларга мобил иловалар орқали пул ўтказишнинг янги, ишончли ва қулай усулини тақдим этади.

"Smart Dunyo Pay" хизмати — бу:

🔹 Маҳкумлар учун биринчи навбатдаги эҳтиёж молларини харид қилиш учун маблағларни бир зумда ҳисоб рақамига ўтказиш
🔹 Қулайлик ва соддалик — барчаси Uzum Bank мобил иловаси орқали
🔹 Вақтни тежаш — банкларда навбатда туриш ва автобусда юришсиз
🔹 24/7 қўллаб-қувватлаш — биз ҳар доим ёнингиздамиз

👉 Xizmatdan foydalanish bo‘yicha to‘liq yo‘riqnomani Telegram-bot orqali olishingiz mumkin: @smartdunyopaybot[](https://t.me/smartdunyopaybot)

☎️ Шунингдек, барча саволлар бўйича куну тун ишлайдиган колл-марказимизга мурожаат қилишингиз мумкин: +998 71 200 93 33

Биз яқинларингизнинг ҳаётини енгиллаштиришда сизнинг ёрдамингиз беқиёс эканига ишонамиз. Биз эса, ўз навбатида, сиз ва яқинларингиз ѝртасидаги алоқани янада илиқ ва тезкор қилиш учун янги дастурий ечимлар устида ишламоқдамиз.

Сиздан илтимос қиламиз, ушбу хабарни бошқа колониялардаги маҳкумларнинг яқинларига оид Телеграм гуруҳларга ҳам юборинг, шунда иложи борича кўпроқ инсон ушбу хизматдан фойдаланиши мумкин бўлади.

Меҳр ва ғамхўрлик билан,
"Smart Dunyo" жамоаси
      `);
    } else {
      await ctx.reply(`
Уважаемые родители и близкие тех, кто находится в исправительных учреждениях!
Мы понимаем, как важно для вас поддерживать связь и заботиться о своих родных, находящихся в колонии.
Теперь сделать это стало проще, быстрее и удобнее!

IT-компания "OLTIN ASR DBT" совместно с "Uzum Bank" представляет новый, надёжный и удобный способ перечисления денежных средств на счета всех колоний через мобильное приложение.

Сервис "Smart Dunyo Pay" — это:

🔹 Моментальный перевод средств на расчётный счёт заключённого для покупки товаров первой необходимости
🔹 Удобство и простота — всё через мобильное приложение Uzum Bank
🔹 Экономия времени — без очередей в банке и поездок в автобусах
🔹 Поддержka 24/7 — мы всегда рядом

👉 Полную инструкцию по использованию сервиса вы можете получить через наш телеграм-бот: @smartdunyopaybot[](https://t.me/smartdunyopaybot)

☎️ А также задать любой вопрос в круглосуточном колл-центре: +998 71 200 93 33

Мы верим, что ваша поддержка делает жизнь ваших близких легче.
А мы, в свою очередь, работаем над новыми программными решениями для ещё более тёплой и быстрой связи между вами и теми, кто сейчас особенно нуждается в этом.

Просим Вас также переслать это сообщение в другие телеграм-группы родственников из других колоний, чтобы как можно больше людей могли воспользоваться этой услугой.

С любовью и заботой,
Команда "Smart Dunyo"
      `);
    }

    await ctx.reply(
      lang === "uz"
        ? profile.name
          ? "Telefon raqamingizni '📱 Raqamni yuborish' tugmasi orqali yuboring yoki +998901234567 formatida qo‘lda kiriting:"
          : "Ismingizni yozing:"
        : profile.name
        ? "Отправьте номер телефона через кнопку '📱 Отправить номер' или введите вручную в формате +998901234567:"
        : "Введите своё имя:",
      profile.name
        ? Markup.inlineKeyboard([
            Markup.button.contactRequest(
              lang === "uz" ? "📱 Raqamni yuborish" : "📱 Отправить номер"
            ),
          ])
        : Markup.removeKeyboard()
    );
  } catch (error) {
    console.error(`Ошибка при выборе языка для ${ctx.from.id}:`, error);
    await ctx.reply(
      lang === "uz"
        ? "❌ Xatolik yuz berdi. Qaytadan urinib ko‘ring."
        : "❌ Произошла ошибка. Попробуйте снова."
    );
  }
});

// Обработка контакта
bot.on("contact", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const state = userStates.get(userId);
    
    // Ignore if user is not in the correct state
    if (!state || state.step !== "waiting_phone") {
      await ctx.reply(
        ctx.message.from.language_code === "uz"
          ? "❌ Iltimos, telefon raqamingizni faqat '📱 Raqamni yuborish' tugmasi orqali yuboring."
          : "❌ Пожалуйста, отправьте номер телефона только через кнопку '📱 Отправить номер'."
      );
      return;
    }

    // Initialize profile if it doesn't exist
    let profile = userProfiles.get(userId) || { questions: [], lang: ctx.message.from.language_code === "uz" ? "uz" : "ru" };

    const phoneNumber = ctx.message.contact.phone_number;
    if (!/^\+998\d{9}$/.test(phoneNumber)) {
      await ctx.reply(
        profile.lang === "uz"
          ? "❌ Telefon raqami +998 bilan boshlanishi va 9 ta raqamdan iborat bo‘lishi kerak."
          : "❌ Номер телефона должен начинаться с +998 и содержать 9 цифр."
      );
      return;
    }

    profile.phone = phoneNumber;
    userProfiles.set(userId, profile);
    userStates.set(userId, { step: "waiting_question" });

    await ctx.reply(
      profile.lang === "uz"
        ? "✅ Telefon raqami qabul qilindi. Savolingizni yozing yoki fayl yuboring:"
        : "✅ Номер телефона принят. Напишите свой вопрос или отправьте файл:",
      Markup.removeKeyboard()
    );

    // Delete the contact message
    await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);
  } catch (error) {
    console.error(`Ошибка при обработке контакта для ${ctx.from.id}:`, {
      error,
      userId: ctx.from.id,
      message: ctx.message
    });
    await ctx.reply(
      ctx.message.from.language_code === "uz"
        ? "❌ Xatolik yuz berdi. Qaytadan urinib ko‘ring."
        : "❌ Произошла ошибка. Попробуйте снова."
    );
  }
});

// Обработка текста
bot.on("text", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const state = userStates.get(userId);
    let profile = userProfiles.get(userId) || { questions: [], lang: "uz" };
    const lang = profile.lang || "uz";

    // Handle replies in admin chat
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
      question.chat.push({
        type: "answer",
        contentType: "text",
        content: text,
        timestamp: formatDate(),
        message_id: ctx.message.message_id,
      });
      question.answered = !hasUnansweredQuestions(question.chat);
      userProfiles.set(targetUserId, targetProfile);

      await ctx.telegram.sendMessage(targetUserId, text);
      await sortAndUpdateCards(ctx);

      const sentMsg = await ctx.reply("✅ Ответ отправлен пользователю.");
      await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
      await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);

      pendingReplies.delete(userId);
      return;
    }

    // Delete non-card-related messages in admin chat
    if (Number(ctx.chat.id) === ADMIN_CHAT_ID && !pendingReplies.has(userId)) {
      if (!text.startsWith("/")) {
        await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);
        return;
      }
      return;
    }

    if (!state) {
      console.log(`Состояние не найдено для ${userId}, игнорируем сообщение`);
      return;
    }

    if (state.step === "waiting_name") {
      profile.name = text;
      profile.lang = lang;
      userProfiles.set(userId, profile);
      userStates.set(userId, { step: "waiting_phone" });

      await ctx.reply(
        lang === "uz"
          ? "Telefon raqamingizni '📱 Raqamni yuborish' tugmasi orqali yuboring. Agar tugma ishlamasa, +998901234567 formatida qo‘lda kiriting:"
          : "Отправьте номер телефона через кнопку '📱 Отправить номер'. Если кнопка недоступна, введите вручную в формате +998901234567:",
        Markup.inlineKeyboard([
          Markup.button.contactRequest(
            lang === "uz" ? "📱 Raqamni yuborish" : "📱 Отправить номер"
          ),
        ])
      );

      // Delete the name message
      await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);
    } else if (state.step === "waiting_phone") {
      // Check if the message is a phone number
      if (/^\+998\d{9}$/.test(text)) {
        // Enforce "share contact" button for clients that support it
        const isDesktopClient = ctx.message.source === "web" || !ctx.message.via_bot;
        if (!isDesktopClient) {
          await ctx.reply(
            lang === "uz"
              ? "❌ Iltimos, telefon raqamingizni faqat '📱 Raqamni yuborish' tugmasi orqali yuboring."
              : "❌ Пожалуйста, отправьте номер телефона только через кнопку '📱 Отправить номер'."
          );
          return;
        }

        profile.phone = text;
        profile.dim = lang;
        userProfiles.set(userId, profile);
        userStates.set(userId, { step: "waiting_question" });

        await ctx.reply(
          lang === "uz"
            ? "✅ Telefon raqami qabul qilindi. Savolingizni yozing yoki fayl yuboring:"
            : "✅ Номер телефона принят. Напишите свой вопрос или отправьте файл:",
          Markup.removeKeyboard()
        );

        // Delete the phone number message
        await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);
      } else {
        await ctx.reply(
          lang === "uz"
            ? "❌ Iltimos, telefon raqamingizni '📱 Raqamni yuborish' tugmasi orqali yuboring yoki +998901234567 formatida qo‘lda kiriting:"
            : "❌ Пожалуйста, отправьте номер телефона через кнопку '📱 Отправить номер' или введите вручную в формате +998901234567:"
        );
      }
    } else if (state.step === "waiting_question" && text) {
      if (!profile.questions.length) {
        profile.questions.push({
          chat: [
            {
              type: "question",
              contentType: "text",
              content: text,
              timestamp: formatDate(),
              message_id: ctx.message.message_id,
            },
          ],
          answered: false,
          adminMsgId: null,
        });
      } else {
        profile.questions[0].chat = profile.questions[0].chat || [];
        profile.questions[0].chat.push({
          type: "question",
          contentType: "text",
          content: text,
          timestamp: formatDate(),
          message_id: ctx.message.message_id,
        });
        profile.questions[0].answered = false;
      }
      userProfiles.set(userId, profile);

      await sortAndUpdateCards(ctx);

      const sentMsg = await ctx.reply(
        lang === "uz"
          ? "✅ Savol qabul qilindi. Tez orada javob beramiz."
          : "✅ Вопрос принят. Скоро ответим."
      );
      await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
      await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);
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
      "❌ Произошла ошибка. Попробуйте снова."
    );
  }
});

// Обработка медиа
bot.on(
  ["photo", "video", "document", "audio", "voice", "sticker", "animation"],
  async (ctx) => {
    try {
      const userId = ctx.from.id;
      const state = userStates.get(userId);
      let profile = userProfiles.get(userId) || { questions: [], lang: "uz" };
      const lang = profile.lang || "uz";

      // Ответ из группы
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

        let contentType = ctx.message.photo
          ? "photo"
          : ctx.message.video
          ? "video"
          : ctx.message.document
          ? "document"
          : ctx.message.audio
          ? "audio"
          : ctx.message.voice
          ? "voice"
          : ctx.message.sticker
          ? "sticker"
          : ctx.message.animation
          ? "animation"
          : "unknown";
        let content =
          ctx.message[contentType]?.file_id ||
          ctx.message[contentType]?.[ctx.message[contentType].length - 1]
            ?.file_id;

        question.chat.push({
          type: "answer",
          contentType,
          content,
          timestamp: formatDate(),
          caption: ctx.message.caption || "",
          message_id: ctx.message.message_id,
        });
        question.answered = !hasUnansweredQuestions(question.chat);
        userProfiles.set(targetUserId, targetProfile);

        await ctx.telegram.copyMessage(
          targetUserId,
          ctx.chat.id,
          ctx.message.message_id
        );
        await sortAndUpdateCards(ctx);

        const sentMsg = await ctx.reply("✅ Файл отправлен пользователю.");
        await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
        await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);

        pendingReplies.delete(userId);
        return;
      }

      // Удаление всех медиа в админ-чате, не связанных с ответами
      if (Number(ctx.chat.id) === ADMIN_CHAT_ID) {
        await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);
        return;
      }

      if (!state || state.step !== "waiting_question") return;

      let contentType = ctx.message.photo
        ? "photo"
        : ctx.message.video
        ? "video"
        : ctx.message.document
        ? "document"
        : ctx.message.audio
        ? "audio"
        : ctx.message.voice
        ? "voice"
        : ctx.message.sticker
        ? "sticker"
        : ctx.message.animation
        ? "animation"
        : "unknown";
      let content =
        ctx.message[contentType]?.file_id ||
        ctx.message[contentType]?.[ctx.message[contentType].length - 1]
          ?.file_id;

      if (!profile.questions.length) {
        profile.questions.push({
          chat: [
            {
              type: "question",
              contentType,
              content,
              timestamp: formatDate(),
              caption: ctx.message.caption || "",
              message_id: ctx.message.message_id,
            },
          ],
          answered: false,
          adminMsgId: null,
        });
      } else {
        profile.questions[0].chat = profile.questions[0].chat || [];
        profile.questions[0].chat.push({
          type: "question",
          contentType,
          content,
          timestamp: formatDate(),
          caption: ctx.message.caption || "",
          message_id: ctx.message.message_id,
        });
        profile.questions[0].answered = false;
      }
      userProfiles.set(userId, profile);

      await sortAndUpdateCards(ctx);

      const sentMsg = await ctx.reply(
        lang === "uz"
          ? "✅ Fayl qabul qilindi. Tez orada javob beramiz."
          : "✅ Файл принят. Скоро ответим."
      );
      await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
    } catch (error) {
      console.error(`Ошибка при обработке файла от ${ctx.from.id}:`, error);
      await ctx.reply(
        profile?.lang === "uz"
          ? "❌ Xatolik yuz berdi. Qaytadan urinib ko‘ring."
          : "❌ Произошла ошибка. Попробуйте снова."
      );
    }
  }
);

// Проверка неотвеченных вопросов
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
    const sentMsg = await ctx.reply(
      "✍️ Напишите ответ или отправьте файл пользователю:"
    );
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
  } catch (error) {
    console.error(`Ошибка в callback_query от ${ctx.from.id}:`, error);
    await ctx.answerCbQuery("❌ Произошла ошибка.");
  }
});

// Команда /unanswered
bot.command("unanswered", async (ctx) => {
  try {
    if (Number(ctx.chat.id) !== ADMIN_CHAT_ID) {
      const sentMsg = await ctx.reply(
        "❌ Эта команда доступна только в чате администраторов."
      );
      await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
      await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);
      return;
    }

    let count = 0;
    for (const profile of userProfiles.values()) {
      for (const question of profile.questions) {
        if (!question.answered) count++;
      }
    }
    const message =
      count > 0
        ? `🔴 Неотвеченных вопросов: ${count}`
        : "✅ Все вопросы отвечены!";
    const sentMsg = await ctx.reply(message);
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
  } catch (error) {
    console.error("Ошибка в команде /unanswered:", error);
    const sentMsg = await ctx.reply(
      "❌ Ошибка при подсчете неотвеченных вопросов."
    );
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
  }
});

// Команда /sort
bot.command("sort", async (ctx) => {
  try {
    if (Number(ctx.chat.id) !== ADMIN_CHAT_ID) {
      const sentMsg = await ctx.reply(
        "❌ Эта команда доступна только в чате администраторов."
      );
      await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
      await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);
      return;
    }

    await sortAndUpdateCards(ctx);
    const sentMsg = await ctx.reply(
      "✅ Вопросы отсортированы: отвеченные (🟢) сверху, неотвеченные (🔴) снизу."
    );
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
  } catch (error) {
    console.error("Ошибка в команде /sort:", error);
    const sentMsg = await ctx.reply("❌ Ошибка при сортировке вопросов.");
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
  }
});

// Команда /help
bot.command("help", async (ctx) => {
  try {
    if (Number(ctx.chat.id) !== ADMIN_CHAT_ID) {
      const sentMsg = await ctx.reply(
        "❌ Эта команда доступна только в чате администраторов."
      );
      await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
      await autoDeleteMessage(ctx, ctx.chat.id, ctx.message.message_id, 5000);
      return;
    }

    const helpMessage = `
📋 Доступные команды для администраторов:
• /unanswered — Показать количество неотвеченных вопросов.
• /sort — Отсортировать вопросы: отвеченные (🟢) сверху, неотвеченные (🔴) снизу.
• /help — Показать это сообщение.
  `;
    const sentMsg = await ctx.reply(helpMessage);
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
  } catch (error) {
    console.error("Ошибка в команде /help:", error);
    const sentMsg = await ctx.reply("❌ Ошибка при выполнении команды /help.");
    await autoDeleteMessage(ctx, ctx.chat.id, sentMsg.message_id, 5000);
  }
});

// Создание одной карточки
async function createAdminCard(ctx, userId, questionIndex) {
  try {
    const profile = userProfiles.get(userId);
    const question = profile.questions[questionIndex];

    // Формируем текст чата с медиа
    const chatText = (question.chat || [])
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-10)
      .map(async (item) => {
        const prefix = item.type === "question" ? "👨‍🦰" : "🤖";
        let content;

        switch (item.contentType) {
          case "text":
            content = item.content;
            break;
          case "photo":
            content = `📸 Фото${item.caption ? `: ${item.caption}` : ""}`;
            await ctx.telegram.sendPhoto(ADMIN_CHAT_ID, item.content, {
              caption: `${prefix} ${item.caption || "Фото"} (${
                item.timestamp
              })`,
            });
            break;
          case "video":
            content = `📹 Видео${item.caption ? `: ${item.caption}` : ""}`;
            await ctx.telegram.sendVideo(ADMIN_CHAT_ID, item.content, {
              caption: `${prefix} ${item.caption || "Видео"} (${
                item.timestamp
              })`,
            });
            break;
          case "document":
            content = `📄 Документ${item.caption ? `: ${item.caption}` : ""}`;
            await ctx.telegram.sendDocument(ADMIN_CHAT_ID, item.content, {
              caption: `${prefix} ${item.caption || "Документ"} (${
                item.timestamp
              })`,
            });
            break;
          case "audio":
            content = `🎵 Аудио${item.caption ? `: ${item.caption}` : ""}`;
            await ctx.telegram.sendAudio(ADMIN_CHAT_ID, item.content, {
              caption: `${prefix} ${item.caption || "Аудио"} (${
                item.timestamp
              })`,
            });
            break;
          case "voice":
            content = `🎙 Голосовое сообщение${
              item.caption ? `: ${item.caption}` : ""
            }`;
            await ctx.telegram.sendVoice(ADMIN_CHAT_ID, item.content, {
              caption: `${prefix} ${item.caption || "Голосовое"} (${
                item.timestamp
              })`,
            });
            break;
          case "sticker":
            content = `😀 Стикер`;
            await ctx.telegram.sendSticker(ADMIN_CHAT_ID, item.content);
            break;
          case "animation":
            content = `🎞 Анимация${item.caption ? `: ${item.caption}` : ""}`;
            await ctx.telegram.sendAnimation(ADMIN_CHAT_ID, item.content, {
              caption: `${prefix} ${item.caption || "Анимация"} (${
                item.timestamp
              })`,
            });
            break;
          default:
            content = `Неизвестный тип контента`;
        }
        return `<i>${item.timestamp}</i>\n${prefix} ${content}\n---`;
      });

    // Ждем завершения всех отправок медиа
    const chatTextResolved = (await Promise.all(chatText)).join("\n");

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
${chatTextResolved || "Нет сообщений"}

#USER${userId}
    `;

    // Отправляем текстовую карточку
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
          timestamp:
            question.chat[question.chat.length - 1]?.timestamp || formatDate(),
        });
      });
    }

    if (allQuestions.length === 0) {
      console.log("Нет вопросов для сортировки");
      return;
    }

    allQuestions.sort((a, b) => {
      if (a.question.answered !== b.question.answered) {
        return a.question.answered ? -1 : 1;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

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

    for (const { userId, questionIndex } of allQuestions) {
      await createAdminCard(ctx, userId, questionIndex);
    }

    console.log("Сортировка и обновление карточек завершены");
  } catch (error) {
    console.error("Ошибка в sortAndUpdateCards:", error);
  }
}

// Запуск бота
bot.launch().then(() => console.log("🤖 Бот успешно запущен"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
