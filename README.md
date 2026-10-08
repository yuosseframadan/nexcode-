# NexCode — محرر الأكواد لسطح المكتب (Windows)

**NexCode** محرر أكواد كامل مبني على **Code - OSS** (نفس قلب VS Code)، بهوية NexCode وطبقة مميزات خاصة:
شكل مألوف + كل اختصارات VS Code + إضافات + IntelliSense، ومعاه عربي حقيقي وأدوات للمبتدئين.
موقعنا: https://mute-mouse-67d8.yousseframadan2211.workers.dev/

## المميزات
- **كل مميزات VS Code:** كل اللغات، الإضافات (تضيف/تحذف/تحدّث من Open VSX)، كل الاختصارات، IntelliSense والاقتراحات، Debugger، Terminal، Git.
- **عربي + English + Français + 日本語 + 中文 + Deutsch** — اللغة تتغير على التطبيق كله، وتُسأل عنها في أول تشغيل.
- **أول تشغيل:** اختيار اللغة ← اختيار الثيم (فاتح/داكن/NexCode) ← جولة ترحيبية.
- **زر تشغيل ▶** (أو `Ctrl+Shift+F10`) لـ Python / JS / TS / C / C++ / Java / Go / Rust / PHP / HTML وغيرها، مع طباعة عربية سليمة.
- **قوالب مشاريع جاهزة** (ويب، ويب عربي RTL، Python، Node، C++، C، Java).
- **GitHub:** تسجيل دخول، استنساخ كل مستودعاتك بضغطة، ونشر مجلد على GitHub.
- **شرح الأخطاء** بلغتك (أوفلاين) عند تمرير الماوس على الخطأ.
- **توقع الكلمة التالية** (نص باهت) يتعلم من ملفاتك + اقتراحات IntelliSense العادية.
- **ورقة اختصارات** بلغتك: `Ctrl+Alt+N` ← قائمة NexCode.
- **أوفلاين:** التطبيق نفسه وحزم اللغات وإضافات أساسية (Prettier، Material Icons، Live Server) داخل المثبّت. الإنترنت مطلوب فقط لتثبيت إضافات جديدة وGitHub.
- **بدون تتبّع (Telemetry) وبدون سيرفر** — كل شيء مجاني.

## النشر خطوة بخطوة (مجاني)
1. على GitHub أنشئ مستودعاً **عاماً (Public)** باسم `nexcode`.
2. افتح الطرفية داخل مجلد المشروع وشغّل:
   ```
   git init
   git add .
   git commit -m "NexCode"
   git branch -M main
   git remote add origin https://github.com/اسم_حسابك/nexcode.git
   git push -u origin main
   ```
3. في المستودع: **Settings ← Actions ← General ← Workflow permissions** اختر **Read and write permissions** ثم Save.
4. **Actions ← Build NexCode (Windows) ← Run workflow.**
5. استنَّ من **60 إلى 120 دقيقة**. بعدها من **Releases** حمّل:
   - `NexCodeUserSetup-x64-….exe` (بدون صلاحيات أدمن، الأنسب للناس)
   - `NexCodeSetup-x64-….exe` (لكل المستخدمين)
6. رابط التحميل الدائم لموقعك: `https://github.com/اسم_حسابك/nexcode/releases/latest`

### تسجيل الدخول بـ GitHub (اختياري لكنه أحسن)
بدون خطوة دي التطبيق بيطلب **Personal Access Token** (شغّال). ولتسجيل دخول بالرمز المباشر:
1. GitHub ← Settings ← Developer settings ← OAuth Apps ← New OAuth App (الصفحة الرئيسية والـ callback = رابط موقعك) ← فعّل **Enable Device Flow** ← انسخ **Client ID**.
2. في المستودع: Settings ← Secrets and variables ← Actions ← **Variables** ← أضف `NEXCODE_GITHUB_CLIENT_ID` بالقيمة دي، ثم أعد البناء.

## التحديث التلقائي
كل بناء ينشر ملفات التحديث في فرع `updates` تلقائياً، والتطبيق يفحصها ويعرض التحديث للمستخدم (من غير سيرفر).

## تعديل التطبيق
| عايز تغيّر إيه | الملف |
|---|---|
| ترجمة عربية أكتر للواجهة | `translations/ar.json` و `translations/ar.more.json` (إنجليزي ← عربي) |
| مميزات NexCode (التشغيل، القوالب، GitHub…) | `extensions/nexcode-core/` |
| نصوص اللغات الست | `extensions/nexcode-core/src/i18n.js` |
| شرح الأخطاء | `extensions/nexcode-core/src/errors.js` |
| الألوان | `extensions/nexcode-core/themes/` |
| الأيقونة | بدّل `branding/logo-source.png` ثم `python tools/make_icons.py` |
| إعدادات افتراضية | `extensions/nexcode-core/package.json` ← `configurationDefaults` |

اختبار الإضافة محلياً: `cd extensions/nexcode-core && node --test test/run-tests.js`

## حدود لازم تعرفها (بصراحة)
- **لم يُبنَ المثبّت النهائي داخل المحادثة** (يحتاج جهاز Windows قوي). اللي اتجرّب فعلاً: تطبيق كل الـ patches على كود VS Code الحقيقي، اختبارات الإضافة، توليد حزمة العربي وتغليفها، وتوليد ملفات التحديث. أول بناء على GitHub هو الاختبار النهائي؛ لو فشلت خطوة ابعتلي لوج الخطوة وأصلحها.
- **الترجمة العربية للواجهة جزئية:** حوالي **2,258 نصاً** (قوائم، مستكشف، بحث، إعدادات، ترحيب، إلخ ≈ 9% من النصوص لكنها الأكثر ظهوراً). الباقي يظهر بالإنجليزي تلقائياً. زوّد `translations/ar*.json` وأعد البناء. **عكس الواجهة يمين-يسار (RTL) غير مضمّن** (VS Code نفسه لا يدعمه).
- **الصينية:** المبسّطة فقط. الفرنسية والألمانية واليابانية والصينية هي حزم Microsoft الرسمية.
- **سوق الإضافات = Open VSX.** إضافات Microsoft المغلقة (Pylance، C# Dev Kit، Remote-SSH، Live Share، C/C++ من Microsoft) غير متاحة بسبب شروط Microsoft؛ بدائلها المفتوحة موصى بها تلقائياً.
- **تحذير SmartScreen** عند أول تثبيت لأن التطبيق غير موقّع رقمياً (التوقيع مدفوع). اضغط *More info ← Run anyway*.
- **الإصدار مثبّت** على VS Code 1.135 (ملف `upstream/stable.json`). الترقية لإصدار أحدث تحتاج مزامنة الـ patches من مشروع VSCodium.
- الأيقونة الحالية شكلها يشبه كاميرا فيديو؛ غيّرها من `branding/logo-source.png` لو عايز.

## التراخيص
MIT. مبني على Code - OSS (MIT) وسكربتات بناء مشتقة من VSCodium (MIT). انظر `LICENSE` و`LICENSE-VSCodium-build-scripts.txt`.
