# Umrah Operations SaaS

منصة SaaS متعددة الشركات لتنفيذ أوامر التشغيل داخل جلسة **نسك مسار الخاصة بالموظف** عبر إضافة Chrome. الخادم يحتفظ بمنطق العمل كاملًا، بينما الإضافة منفذ محدود للأوامر: نقر، تعبئة، قراءة، رفع ملف، وإرجاع النتيجة.

> لا يخزن المشروع اسم مستخدم نسك أو كلمة المرور، ولا يسجل الدخول بدل الموظف، ولا يتعامل مع CAPTCHA.

## الحالة الحالية

هذه هي قاعدة **Phase 1** وفق عقد المشروع:

- مخطط PostgreSQL متعدد الشركات مع soft delete وRLS وعزل المستودعات.
- Passport sessions للموقع وDevice Tokens مستقلة للإضافة.
- رمز ربط مدته خمس دقائق، ورمز الجهاز لا يخزن في الخادم إلا كـ SHA-256.
- WebSocket داخل Offscreen Document، heartbeat كل 20 ثانية، watchdog كل دقيقة، وbackoff مع jitter.
- نافذة نسك واحدة مرتبطة بكل موظف وأمر واحد فقط قيد التنفيذ لكل جهاز.
- منفذ DOM دلالي يفشل بوضوح عند غياب العنصر أو تعدده.
- تجربة رفع ملف صحيحة باستخدام `File` و`DataTransfer` بدل مسار محلي.
- مراقبة سلبية لفقدان جلسة نسك وشاشة حمراء للاستعادة.
- لوحة تشغيل عربية RTL متجاوبة.
- اختبارات عقد الـBridge، صحة الجلسة، الـadapter، سلامة pre-flight، وعزل الشركات.

لا تعتبر مرحلة الربط مكتملة إنتاجيًا قبل اختبار رفع الملف والخمسة semantic targets داخل صفحة نسك حقيقية بحساب تجريبي؛ لا توجد selectors مخمنة تُعامل كأنها مؤكدة.

## التشغيل محليًا

المتطلبات: Node.js 20+ وDocker.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

الواجهة: `http://localhost:5173` — الخادم: `http://localhost:3000/api/health`.

## بناء إضافة Chrome

```bash
npm run build:extension
```

ثم افتح `chrome://extensions`، فعّل Developer mode، واختر Load unpacked وحدد `extension/dist`.

## التحقق

```bash
npm run typecheck
npm test
npm run build
```

## ثوابت الأمان

1. لا تخزين لبيانات دخول نسك.
2. لا تنفيذ ثانٍ لعملية كتابة دون pre-flight ومفتاح idempotency.
3. لا منطق أعمال داخل الإضافة.
4. كل وصول لبيانات شركة يمر من TenantContext ومستودع scoped وPostgres RLS.
5. لا حذف فعلي، و`order_events` append-only.
6. التاريخ Gregorian ISO UTC؛ تحويل أم القرى عند الـadapter فقط.
7. الأنواع والعقود المشتركة في `shared/` فقط.
8. الخطأ يوقف التنفيذ ويظهر للاستعادة؛ لا تخمين لعناصر الصفحة.

## الهيكل

```text
shared/      العقود، الأنواع، Drizzle، Zod
server/      HTTP، الخدمات، المستودعات، Bridge
client/      واجهة React العربية
extension/   إضافة Chrome MV3
migrations/  PostgreSQL + RLS
tests/       اختبارات الأمان والعقود
```

## الخطوة التالية

إكمال إثبات Phase 1 على جلسة نسك حقيقية، ثم فقط الانتقال إلى Phase 2: Command Center، النماذج، الطلبات، dispatcher، ومحرك `CREATE_UMRAH_PROGRAM`.
