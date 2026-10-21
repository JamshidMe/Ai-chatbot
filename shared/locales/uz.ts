import type { LocaleShape } from './en.ts';

/** O'zbekcha (lotin yozuvi). Must mirror the shape of `en`. */
export const uz = {
  meta: {
    code: 'uz',
    name: "O'zbekcha",
    dir: 'ltr',
  },
  app: {
    title: "Ko'p tilli AI yordamchi",
    subtitle: "O'zbek · Ingliz · Rus",
    tagline: 'Siz yozgan tilda javob beradi.',
  },
  lang: {
    label: 'Til',
    uz: "O'zbekcha",
    en: 'Inglizcha',
    ru: 'Ruscha',
  },
  nav: {
    newChat: 'Yangi suhbat',
    conversations: 'Suhbatlar',
    collapse: "Yon panelni yig'ish",
    expand: 'Yon panelni ochish',
    openMenu: 'Menyuni ochish',
    closeMenu: 'Menyuni yopish',
    delete: "Suhbatni o'chirish",
    deleteConfirm: "Bu suhbat o'chirilsinmi?",
    deleteYes: "O'chirish",
    deleteNo: 'Bekor qilish',
    empty: "Hozircha suhbat yo'q",
    localNote: 'Brauzerda saqlanadi',
  },
  welcome: {
    heading: 'Bugun sizga qanday yordam beray?',
    body: "O'zbek, ingliz yoki rus tilida savol bering. Javob siz yozgan tilda qaytadi.",
  },
  suggestions: {
    label: 'Sinab ko\u2018ring',
    s1: 'Murakkab mavzuni sodda tilda tushuntir',
    s2: 'Rezyume matnini yaxshilashga yordam ber',
    s3: "Mijozga xushmuomala xat yozib ber",
    s4: "SQL so'rov yozib, uni izohlab ber",
  },
  chat: {
    heading: 'Suhbat',
    placeholder: 'Xabaringizni yozing…',
    send: 'Yuborish',
    sending: 'Yuborilmoqda…',
    clear: 'Suhbatni tozalash',
    you: 'Siz',
    assistant: 'Yordamchi',
    empty: "Hozircha xabar yo'q. Boshlash uchun salomlashing.",
    hintChars: 'Har bir xabar uchun maksimal {max} belgi',
    historyNote: 'Kontekst sifatida faqat oxirgi {max} xabar yuboriladi.',
  },
  message: {
    copy: 'Nusxalash',
    copied: 'Nusxalandi',
    retry: 'Qayta urinish',
    thinking: "O'ylanmoqda…",
  },
  composer: {
    hint: 'Yuborish uchun Enter · yangi qator uchun Shift+Enter',
  },
  provider: {
    live: 'Jonli',
  },
  assistant: {
    refusal:
      "Kechirasiz, men faqat kompaniyaning mahsulotlari va xizmatlariga oid tasdiqlangan ma'lumotlar asosida yordam bera olaman. Bu savol bo'yicha ishonchli ma'lumot topilmadi. Iltimos, kompaniya bilan bevosita bog'laning.",
    groundedNotice: "Javoblar faqat kompaniyaning tasdiqlangan ma'lumotlariga asoslanadi.",
    demoNotice: "Namunaviy ma'lumotlar — yordamchi hali haqiqiy kompaniya ma'lumotlariga ulanmagan.",
  },
  mock: {
    badge: 'Mock provayder',
    notice: "Mock rejimi yoqilgan: AI modeli chaqirilmaydi va API uchun to'lov olinmaydi.",
    reply:
      'Mock javob ({lang} lokali) — to\'liq UI va API ni API xarajatisiz sinash mumkin. Siz yozdingiz: "{message}"',
  },
  errors: {
    emptyMessage: "Xabar bo'sh bo'lmasligi kerak.",
    tooLong: 'Xabar juda uzun (maksimal {max} belgi).',
    invalidRequest: "So'rov ma'lumotlari noto'g'ri.",
    unsupportedLanguage: "Qo'llab-quvvatlanmaydigan til. Mavjud: uz, en, ru.",
    providerUnavailable: 'AI provayder hali sozlanmagan.',
    providerFailed: 'AI provayder javob bera olmadi.',
    serverError: 'Kutilmagan server xatosi.',
    networkError: "API serverga ulanib bo'lmadi.",
    timeout: "So'rov juda uzoq davom etdi. Qayta urinib ko'ring.",
    malformedResponse: "Server o'qib bo'lmaydigan javob qaytardi.",
    rateLimited: "Juda ko'p so'rov yuborildi. {seconds} soniyadan keyin qayta urinib ko'ring.",
    invalidWidget: 'Bu vidjet identifikatori tanilmadi.',
    originNotAllowed: "Bu saytga yordamchidan foydalanishga ruxsat berilmagan.",
    payloadTooLarge: "So'rov hajmi juda katta.",
  },
  health: {
    label: 'Server',
    ok: 'onlayn',
    offline: 'oflayn',
    provider: 'Provayder',
    model: 'Model',
    languages: 'Tillar',
  },
} satisfies LocaleShape;
