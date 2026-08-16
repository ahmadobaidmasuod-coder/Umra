import { useState } from "react";
import { Activity, Bell, Building2, CheckCircle2, ClipboardList, Command, FileText, LayoutDashboard, Link2, LogOut, Puzzle, ShieldCheck, Unplug, Users } from "lucide-react";

type ConnectionState = "disconnected" | "pairing" | "connected" | "auth-lost";
const nav = [
  { label: "الرئيسية", icon: LayoutDashboard, active: true },
  { label: "مركز التحكم", icon: Command },
  { label: "النماذج", icon: FileText },
  { label: "الطلبات", icon: ClipboardList, badge: 4 },
];

export function App() {
  const [connection, setConnection] = useState<ConnectionState>("disconnected");
  const connected = connection === "connected";
  const startPairing = () => { setConnection("pairing"); setTimeout(() => setConnection("connected"), 900); };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">ع</span><div><strong>عمرة</strong><small>مركز العمليات</small></div></div>
      <div className="tenant"><Building2 size={18}/><div><small>الشركة الحالية</small><strong>شركة ضيوف الرحمن</strong></div><span>⌄</span></div>
      <nav>{nav.map(({ label, icon: Icon, active, badge }) => <button key={label} className={active ? "active" : ""}><Icon size={19}/><span>{label}</span>{badge && <b>{badge}</b>}</button>)}</nav>
      <div className="sidebar-foot"><button><Users size={18}/>الفريق</button><button><ShieldCheck size={18}/>سجل التدقيق</button><button><LogOut size={18}/>تسجيل الخروج</button></div>
    </aside>
    <main>
      {connection === "auth-lost" && <section className="red-screen"><Unplug/><div><strong>انتهت جلسة نسك</strong><span>سجّل الدخول من نافذة نسك، وسيُعاد الطلب من آخر نقطة حفظ آمنة.</span></div><button onClick={() => setConnection("connected")}>أعدت تسجيل الدخول</button></section>}
      <header><div><span className="eyebrow">الأحد، 16 أغسطس 2026</span><h1>صباح الخير، أحمد</h1><p>هذه حالة التشغيل اليوم داخل شركتك.</p></div><div className="header-actions"><button className="icon-button"><Bell size={19}/><i/></button><div className="avatar">أ</div></div></header>

      <section className="connection-card">
        <div className={`connection-icon ${connected ? "online" : ""}`}><Puzzle size={26}/></div>
        <div className="connection-copy"><div className="status-line"><h2>اتصال نسك</h2><span className={connected ? "status online" : "status"}>{connected ? "متصل وجاهز" : connection === "pairing" ? "جارٍ الربط…" : "غير متصل"}</span></div><p>{connected ? "النافذة المرتبطة جاهزة لاستقبال أمر واحد في كل مرة." : "اربط إضافة المتصفح بجلسة نسك الخاصة بك. لن نطلب أو نخزن اسم المستخدم أو كلمة المرور."}</p></div>
        <div className="connection-actions">{connected ? <><button className="secondary" onClick={() => setConnection("auth-lost")}>اختبار فقدان الجلسة</button><button className="primary quiet"><CheckCircle2 size={18}/> جاهز للتنفيذ</button></> : <button className="primary" onClick={startPairing} disabled={connection === "pairing"}><Link2 size={18}/>{connection === "pairing" ? "جارٍ إنشاء رمز الربط" : "ربط نسك"}</button>}</div>
      </section>

      <section className="stats">
        <article><div className="stat-icon green"><ClipboardList/></div><div><span>طلبات اليوم</span><strong>12</strong><small>8 مكتملة · 4 في الانتظار</small></div></article>
        <article><div className="stat-icon amber"><Activity/></div><div><span>حالة الـ Adapter</span><strong>5 / 5</strong><small className="positive">كل العناصر تعمل</small></div></article>
        <article><div className="stat-icon blue"><CheckCircle2/></div><div><span>نسبة النجاح</span><strong>98.4%</strong><small>آخر 30 يومًا</small></div></article>
      </section>

      <section className="content-grid">
        <article className="panel orders-panel"><div className="panel-head"><div><h3>الطلبات الحالية</h3><p>تتغير الحالة مباشرة أثناء التنفيذ</p></div><button className="link-button">عرض الكل</button></div>
          <div className="order-row"><span className="order-id">#1042</span><div><strong>إنشاء برنامج عمرة</strong><small>وكالة الأنوار · 42 معتمرًا</small></div><span className="pill working">قيد التنفيذ</span><div className="progress"><i style={{width:"68%"}}/></div><small>الخطوة 17 من 25</small></div>
          <div className="order-row"><span className="order-id">#1041</span><div><strong>برنامج عمرة مع مضيف</strong><small>الركب المميز · 18 معتمرًا</small></div><span className="pill waiting">بانتظار قرار</span><div className="progress"><i style={{width:"44%"}}/></div><small>اختيار الناقل</small></div>
          <div className="order-row"><span className="order-id">#1040</span><div><strong>إنشاء برنامج عمرة</strong><small>نسائم الحجاز · 36 معتمرًا</small></div><span className="pill done">مكتمل</span><div className="progress"><i style={{width:"100%"}}/></div><small>مرجع نسك محفوظ</small></div>
        </article>
        <article className="panel safety-panel"><div className="panel-head"><div><h3>حماية التشغيل</h3><p>فحوصات تمنع الخطأ قبل نسك</p></div><ShieldCheck className="shield"/></div>
          <div className="check"><CheckCircle2/><div><strong>منع التكرار</strong><span>كل أمر يحمل مفتاحًا فريدًا</span></div></div>
          <div className="check"><CheckCircle2/><div><strong>عزل الشركات</strong><span>3 طبقات حماية مفعلة</span></div></div>
          <div className="check"><CheckCircle2/><div><strong>لا توجد بيانات دخول</strong><span>الموظف يسجل الدخول بنفسه</span></div></div>
          <button className="test-link" onClick={() => setConnection("auth-lost")}>معاينة شاشة فقدان الجلسة</button>
        </article>
      </section>
    </main>
  </div>;
}
