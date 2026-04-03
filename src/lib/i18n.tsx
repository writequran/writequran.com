"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getStorage, setStorage } from "./storage";

export type Language = "en" | "ar";

type Dictionary = Record<string, string>;

export const translations: Record<Language, Dictionary> = {
  en: {
    // Landing Page
    "master_the_quran_1": "Master the Quran,",
    "master_the_quran_2": "One Letter at a Time",
    "practice_memorize_review": "Practice · Memorize · Review",
    "typing_revelation": "Typing Revelation",
    "start_writing": "Start Writing",
    "start_writing_desc": "Practice spelling and building visual memory of the Mushaf by typing verse by verse.",
    "begin_practice": "Begin Practice",
    "review_mistakes": "Review Mistakes",
    "review_mistakes_desc": "Clear your tracked weak spots using spaced repetition. Re-practice exactly where you stumbled.",
    "check_status": "Check Status",
    "memorization_test": "Memorization Test",
    "memorization_test_desc": "Pick a range of Surahs and jump into random Ayat to test your retention and recall.",
    "test_memory": "Test Memory",
    "privacy": "Privacy",
    "terms": "Terms",
    "contact": "Contact",
    "all_rights_reserved": "WriteQuran.com All rights reserved.",
    "memorization_range": "Memorization Range",
    "from_surah": "From Surah:",
    "to_surah": "To Surah:",
    "start_testing": "Start Testing",

    // Drawers and Navigation
    "write_quran": "Write Quran",
    "open_menu": "Open Menu",
    "account": "ACCOUNT",
    "user_profile": "User Profile",
    "preferences": "PREFERENCES",
    "light_mode": "Light Mode",
    "night_mode": "Night Mode",
    "typing_mode": "Typing Mode",
    "typing_mode_desc": "Choose how progress is checked",
    "letter_by_letter": "Letter by Letter",
    "word_by_word": "Word by Word",
    "support": "SUPPORT",
    "contact_us": "Contact Us",
    "language_toggle": "Language / اللغة",

    // Components & Modals
    "search_surah": "Search Surah...",
    "review_scheduled": "Review Scheduled",
    "review_scheduled_body": "Mistakes are tracked using spaced repetition. You have tracked mistakes, but none are due for review quite yet! Come back later.",
    "page": "Page",
    "juz": "Juz",
    "enter": "Enter",
    "go": "GO",
    "no_matches": "No matches found",
    "review_queue_completed": "Review Queue Completed",
    "review_queue_completed_body": "You have successfully reviewed all due items. Great job!",
    "review": "Review",
    "close": "Close",
    "no_mistakes": "No Mistakes Yet",
    "no_mistakes_body": "You don't have any logged weak spots yet. Keep typing and making mistakes!",
    "reset_session_history": "Reset Session & History",
    "exit_review_mode": "Exit Review Mode",
    "review_weak_spots": "Review Weak Spots",
    "done": "Done",
    "reviewing": "Reviewing",
    "errors": "Errors",
    "next_weak_spot": "Next Weak Spot",
    "space": "SPACE",
    "backspace": "Backspace",
    "hide": "hide",
    "hidden": "Hidden",
    "ayah_label": "ayah",
    "active_ayah": "Active Ayah",
    "all_label": "all",
    "show_all": "Show All",
    "on_screen_keyboard": "On-Screen Keyboard",
    "rewrite": "rewrite",
    "rewrite_ayah": "Rewrite Ayah",
    "rewrite_surah": "Rewrite Surah",
    "rewrite_current_ayah_q": "Rewrite current Ayah?",
    "yes": "Yes",
    "no": "No",
    "toggle_theme": "Toggle Night/Day Mode",
    "reset_all_progress_q": "Reset All Progress?",
    "reset_all_progress_body": "This will clear your current session mistakes and your entire mistake history for this Surah.",
    "rewrite_surah_q": "Rewrite Surah?",
    "rewrite_surah_body": "This will reset your progress to the beginning of this Surah.",
    "review_mistake": "Review Mistake",
    "reviewing_ayah": "Reviewing Ayah",
    "how_well_remember": "How well did you remember this?",
    "failed": "Failed",
    "hard": "Hard",
    "good": "Good",
    "easy": "Easy",
    "skip": "Skip",
    "start_test": "Start Test",
    "test_range": "Test Range",
    "new_random_ayah": "New Random Ayah",
    "surahs": "Surahs",
    "memorization_score": "Memorization Score",
    "ayah": "Ayah",
    "grade": "Grade",
    "close_details": "Close Details",
    "typing_details": "Typing Details",
    "clear_stats": "Clear Stats",
    "clear_stats_body": "Are you sure you want to clear your mistyped history and progress? All spaced repetition data will be lost.",
    "reset_stats": "Reset Stats",
    "cancel": "Cancel",
    "restart_surah": "Restart Surah",
    "restart_surah_body": "Are you sure you want to restart your progress for this Surah?",
    "restart": "Restart",
    "restart_ayah": "Restart Ayah",
    "restart_ayah_body": "Are you sure you want to clear your current progress for this specific Ayah?",
    "exit_review": "Exit Review Flow",
    "exit_review_body": "Are you sure you want to exit the review flow? Your progress will be saved.",
    "exit": "Exit",
    "reset_session": "Reset Session & History",
    "resume": "Resume",
    "stats": "Stats",
    "weak": "Weak",

    // AuthWidget
    "sign_in": "Sign In",
    "sign_out": "Sign Out",
    "synced": "Synced",
    "sign_up": "Sign Up",
    "email_address": "Email Address",
    "password": "Password",
    "dont_have_account": "Don't have an account?",
    "already_have_account": "Already have an account?",
    "loading": "Loading...",
    "check_email": "Check your email for the confirmation link!",
    "continue": "Continue",
    "email": "Email",
    "password_min_6": "Password (min 6)",
    "forgot_password_q": "Forgot password?",
    "need_account_signup": "Need an account? Sign up",
    "have_account_signin": "Have an account? Sign in",
    "create_account": "Create Account",
    "sign_in_to_sync": "Sign In to Sync",
    "syncing": "Syncing...",
  },
  ar: {
    // Landing Page
    "master_the_quran_1": "أتقن القرآن،",
    "master_the_quran_2": "حرفاً بحرف",
    "practice_memorize_review": "الممارسة · الحفظ · المراجعة",
    "typing_revelation": "كتابة الوحي",
    "start_writing": "ابدأ الكتابة",
    "start_writing_desc": "تدرّب على الإملاء وابنِ ذاكرتك البصرية للمصحف عبر الكتابة آية بآية.",
    "begin_practice": "ابدأ الممارسة",
    "review_mistakes": "مراجعة الأخطاء",
    "review_mistakes_desc": "امسح الأخطاء باستخدام التكرار المتباعد. أعد التدرب بالضبط حيث تعثرت.",
    "check_status": "تحقق من الحالة",
    "memorization_test": "اختبار الحفظ",
    "memorization_test_desc": "اختر نطاقاً من السور واقفز إلى آيات عشوائية لاختبار حفظك وتذكرك.",
    "test_memory": "اختبر حفظك",
    "privacy": "الخصوصية",
    "terms": "الشروط",
    "contact": "اتصل بنا",
    "all_rights_reserved": "WriteQuran.com جميع الحقوق محفوظة.",
    "memorization_range": "نطاق الحفظ",
    "from_surah": "من سورة:",
    "to_surah": "إلى سورة:",
    "start_testing": "ابدأ الاختبار",

    // Drawers and Navigation
    "write_quran": "Write Quran",
    "open_menu": "فتح القائمة",
    "account": "الحساب",
    "user_profile": "الملف الشخصي",
    "preferences": "التفضيلات",
    "light_mode": "الوضع الفاتح",
    "night_mode": "الوضع الليلي",
    "typing_mode": "طريقة الكتابة",
    "typing_mode_desc": "اختر كيفية التحقق من التقدم",
    "letter_by_letter": "حرفاً بحرف",
    "word_by_word": "كلمة بكلمة",
    "support": "الدعم",
    "contact_us": "اتصل بنا",
    "language_toggle": "English / الإنجليزية",

    // Components & Modals
    "search_surah": "ابحث عن السورة...",
    "review_scheduled": "مراجعة مجدولة",
    "review_scheduled_body": "يتم تتبع الأخطاء باستخدام التكرار المتباعد. لديك أخطاء مسجلة، لكن لا توجد أخطاء مستحقة للمراجعة حالياً! عد لاحقاً.",
    "page": "الصفحة",
    "juz": "الجزء",
    "enter": "أدخل",
    "go": "انطلق",
    "no_matches": "لم يتم العثور على نتائج",
    "review_queue_completed": "اكتملت طابور المراجعة",
    "review_queue_completed_body": "لقد قمت بمراجعة جميع الأخطاء المستحقة بنجاح. عمل رائع!",
    "review": "مراجعة",
    "close": "إغلاق",
    "no_mistakes": "لا توجد أخطاء بعد",
    "no_mistakes_body": "ليس لديك أي نقاط ضعف مسجلة حتى الآن. استمر في الكتابة!",
    "reset_session_history": "إعادة تعيين الجلسة والسجل",
    "exit_review_mode": "الخروج من وضع المراجعة",
    "review_weak_spots": "مراجعة الأخطاء",
    "done": "تم",
    "reviewing": "مراجعة",
    "errors": "أخطاء",
    "next_weak_spot": "الخطأ التالي",
    "space": "مسافة",
    "backspace": "حذف",
    "hide": "إخفاء",
    "hidden": "مخفي",
    "ayah_label": "آية",
    "active_ayah": "الآية الحالية",
    "all_label": "الكل",
    "show_all": "إظهار الكل",
    "on_screen_keyboard": "لوحة المفاتيح",
    "rewrite": "إعادة كتابة",
    "rewrite_ayah": "إعادة كتابة الآية",
    "rewrite_surah": "إعادة كتابة السورة",
    "rewrite_current_ayah_q": "إعادة كتابة الآية الحالية؟",
    "yes": "نعم",
    "no": "لا",
    "toggle_theme": "تبديل المظهر",
    "reset_all_progress_q": "إعادة تعيين كل التقدم؟",
    "reset_all_progress_body": "سيؤدي ذلك إلى مسح أخطاء الجلسة الحالية وسجل الأخطاء بالكامل لهذه السورة.",
    "rewrite_surah_q": "إعادة كتابة السورة؟",
    "rewrite_surah_body": "سيؤدي ذلك إلى إعادة تعيين تقدمك إلى بداية هذه السورة.",
    "review_mistake": "راجع الخطأ",
    "reviewing_ayah": "مراجعة الآية",
    "how_well_remember": "ما مدى تذكرك لها؟",
    "failed": "نسيت",
    "hard": "صعب",
    "good": "جيد",
    "easy": "سهل",
    "skip": "تخطي",
    "start_test": "ابدأ الاختبار",
    "test_range": "نطاق الاختبار",
    "new_random_ayah": "آية عشوائية جديدة",
    "surahs": "السور",
    "memorization_score": "علامة الحفظ",
    "ayah": "آية",
    "grade": "الدرجة",
    "close_details": "إغلاق التفاصيل",
    "typing_details": "تفاصيل الكتابة",
    "clear_stats": "مسح الإحصائيات",
    "clear_stats_body": "هل أنت متأكد أنك تريد مسح سجل الأخطاء والتقدم؟ سيتم فقدان بيانات التكرار المتباعد.",
    "reset_stats": "مسح الإحصائيات",
    "cancel": "إلغاء",
    "restart_surah": "إعادة السورة",
    "restart_surah_body": "هل أنت متأكد أنك تريد إرجاع تقدمك في هذه السورة؟",
    "restart": "إعادة",
    "restart_ayah": "إعادة الآية",
    "restart_ayah_body": "هل أنت متأكد أنك تريد إعادة التقدم في هذه الآية؟",
    "exit_review": "الخروج من المراجعة",
    "exit_review_body": "هل أنت متأكد أنك تريد الخروج من المراجعة؟ سيتم حفظ تقدمك.",
    "exit": "خروج",
    "reset_session": "إعادة تعيين الجلسة والسجل",
    "resume": "متابعة",
    "stats": "الإحصائيات",
    "weak": "ضعف",

    // AuthWidget
    "sign_in": "تسجيل الدخول",
    "sign_out": "تسجيل الخروج",
    "synced": "متزامن",
    "sign_up": "حساب جديد",
    "email_address": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "dont_have_account": "ليس لديك حساب؟",
    "already_have_account": "لديك حساب بالفعل؟",
    "loading": "جارٍ التحميل...",
    "check_email": "تحقق من بريدك لفتح الرابط!",
    "continue": "متابعة",
    "email": "البريد الإلكتروني",
    "password_min_6": "كلمة المرور (6 حروف على الأقل)",
    "forgot_password_q": "نسيت كلمة المرور؟",
    "need_account_signup": "ليس لديك حساب؟ إنشاء حساب",
    "have_account_signin": "لديك حساب بالفعل؟ تسجيل الدخول",
    "create_account": "إنشاء حساب",
    "sign_in_to_sync": "تسجيل الدخول للمزامنة",
    "syncing": "جارٍ المزامنة...",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = getStorage("language") as Language;
    if (saved === "en" || saved === "ar") {
      setLanguageState(saved);
      if (saved === "ar") {
        document.documentElement.dir = "rtl";
        document.documentElement.lang = "ar";
      } else {
        document.documentElement.dir = "ltr";
        document.documentElement.lang = "en";
      }
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setStorage("language", lang);
    if (lang === "ar") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    }
    // We emit an event so independent components (like AuthWidget sometimes out of React tree updates or Layout) can react
    window.dispatchEvent(new Event('language-change'));
  };

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key] || key;
  };

  if (!mounted) {
    // Avoid hydration mismatch by rendering children directly,
    // though the locale might be mismatched for a split second,
    // or return null to avoid flash. But returning children is safer for layouts.
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
