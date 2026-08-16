import { dateLabel, escapeHtml, initials, roleLabels, roleOptions } from "./lib/format.js";

export function loadingView() {
  return `<div class="center-state"><span class="loader"></span><p>يتم تجهيز مساحة العمل…</p></div>`;
}

export function landingView() {
  return `<main class="auth-page">
    <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
    <section class="auth-shell">
      <div class="auth-story">
        <div class="brand-lockup"><span class="brand-mark">S</span><div><strong>Survaivo</strong><span>عمليات العمرة</span></div></div>
        <div class="story-copy"><span class="eyebrow">مساحة عمل واحدة لكل شركة</span><h1>فريقك، صلاحياته، وحساباته في مكان واضح.</h1><p>أنشئ شركة مستقلة، أضف الموظفين، وحدد دور كل شخص قبل أن تبدأ طبقة التشغيل والربط مع نسك.</p></div>
        <div class="team-preview">
          <div class="preview-head"><div><small>شركة روافد العمرة</small><strong>الفريق</strong></div><span class="status-pill"><i></i> نشط</span></div>
          <div class="metric-row"><div><b>12</b><span>مستخدمًا</span></div><div><b>9</b><span>نشطون</span></div><div><b>3</b><span>مدراء</span></div></div>
          <div class="member-row"><span class="avatar avatar-blue">أ</span><div><strong>أحمد السالمي</strong><small>مدير الشركة</small></div><span class="role-pill">مالك</span></div>
          <div class="member-row muted-row"><span class="avatar avatar-violet">م</span><div><strong>منى الحربي</strong><small>موظفة عمليات</small></div><span class="role-pill neutral">موظف</span></div>
        </div>
      </div>
      <div class="auth-card-wrap"><div class="auth-card"><div class="mobile-brand">Survaivo</div><span class="card-kicker">مرحبًا بك</span><h2>ادخل إلى مساحة شركتك</h2><p>سجّل الدخول لإدارة الشركة والفريق والصلاحيات.</p><a class="primary-action" href="/signin-with-chatgpt?return_to=%2Fdashboard">تسجيل الدخول <span>←</span></a><div class="auth-note"><span class="shield">✓</span><p><strong>دخول آمن</strong><br>كل شركة معزولة عن الشركات الأخرى.</p></div></div><p class="legal-copy">بمتابعتك، أنت توافق على شروط الاستخدام وسياسة الخصوصية.</p></div>
    </section>
  </main>`;
}

export function signInRequiredView() {
  return `<main class="simple-page"><section class="simple-card"><span class="brand-mark large">S</span><span class="eyebrow">Survaivo</span><h1>انتهت جلسة الدخول</h1><p>سجّل الدخول مجددًا للعودة إلى مساحة شركتك.</p><a class="primary-action" href="/signin-with-chatgpt?return_to=%2Fdashboard">تسجيل الدخول</a></section></main>`;
}

export function onboardingView(user) {
  return `<main class="simple-page"><section class="onboarding-card"><div class="step-chip">الخطوة 1 من 1</div><span class="brand-mark large">S</span><h1>أنشئ مساحة شركتك</h1><p>سيتم إنشاء tenant مستقل، وستصبح مالك المساحة تلقائيًا.</p><div class="signed-user"><span class="avatar avatar-blue">${initials(user.displayName)}</span><div><strong>${escapeHtml(user.displayName)}</strong><small>${escapeHtml(user.email)}</small></div></div><form id="onboarding-form" class="form-stack"><label>اسم شركة العمرة<input name="name" minlength="2" maxlength="100" placeholder="مثال: شركة روافد العمرة" required autofocus></label><button class="primary-button" type="submit">إنشاء مساحة الشركة <span>←</span></button></form><div class="security-line"><span>✓</span> بيانات شركتك معزولة بالكامل عن بقية الشركات.</div></section></main>`;
}

const navItems = [
  ["/dashboard", "الرئيسية", "01"],
  ["/dashboard/team", "الفريق والمستخدمون", "02"],
  ["/dashboard/company", "إعدادات الشركة", "03"],
];

export function shellView(content, activePath, data) {
  const { tenant, user, membership } = data;
  return `<div class="app-shell">
    <aside class="sidebar">
      <a class="side-brand route-link" href="/dashboard" data-route="/dashboard"><span class="brand-mark">S</span><div><strong>Survaivo</strong><small>عمليات العمرة</small></div></a>
      <div class="tenant-switcher"><span>مساحة الشركة</span><strong>${escapeHtml(tenant.name)}</strong><small>${escapeHtml(roleLabels[membership.role])}</small></div>
      <nav>${navItems.map(([path, label, number]) => `<a href="${path}" data-route="${path}" class="nav-link route-link ${activePath === path ? "active" : ""}"><span>${number}</span>${label}</a>`).join("")}</nav>
      <div class="sidebar-footer"><div class="user-mini"><span class="avatar avatar-blue">${initials(user.displayName)}</span><div><strong>${escapeHtml(user.displayName)}</strong><small>${escapeHtml(user.email)}</small></div></div><a class="signout-link" href="/signout-with-chatgpt?return_to=%2F">تسجيل الخروج</a></div>
    </aside>
    <main class="workspace"><header class="topbar"><button class="mobile-menu" type="button" data-menu>☰</button><div class="breadcrumb"><span>${escapeHtml(tenant.name)}</span><b>/</b><strong>${navItems.find(([path]) => path === activePath)?.[1] || "الرئيسية"}</strong></div><div class="connection-status"><i></i> SaaS جاهز</div></header><section class="page-content">${content}</section></main>
  </div>`;
}

export function dashboardView(data) {
  const { tenant, stats, recentMembers, permissions, membership } = data;
  const usage = Math.min(100, Math.round((stats.members / tenant.maxMembers) * 100));
  return `<div class="page-head"><div><span class="eyebrow">نظرة عامة</span><h1>مرحبًا في ${escapeHtml(tenant.name)}</h1><p>الطبقة الأساسية لشركتك وفريقك جاهزة.</p></div>${permissions.canInvite ? `<button class="primary-button compact" type="button" data-open-invite>دعوة مستخدم <span>＋</span></button>` : ""}</div>
    <div class="metric-grid"><article class="metric-card blue"><span class="metric-icon">ف</span><small>إجمالي الفريق</small><strong>${stats.members}</strong><p>من أصل ${tenant.maxMembers} مقعدًا</p></article><article class="metric-card green"><span class="metric-icon">ن</span><small>المستخدمون النشطون</small><strong>${stats.activeMembers}</strong><p>جاهزون للدخول والعمل</p></article><article class="metric-card violet"><span class="metric-icon">د</span><small>المدراء</small><strong>${stats.admins}</strong><p>مالك ومدراء الشركة</p></article><article class="metric-card amber"><span class="metric-icon">ع</span><small>دعوات معلقة</small><strong>${stats.pendingInvitations}</strong><p>بانتظار قبولها</p></article></div>
    <div class="dashboard-grid"><article class="panel"><div class="panel-head"><div><h2>أحدث أعضاء الفريق</h2><p>حالة وصول المستخدمين إلى المساحة.</p></div><a href="/dashboard/team" data-route="/dashboard/team" class="text-link route-link">عرض الكل ←</a></div><div class="compact-list">${recentMembers.map(memberRow).join("") || emptyLine("لا يوجد مستخدمون بعد")}</div></article><article class="panel setup-panel"><div class="panel-head"><div><h2>جاهزية طبقة SaaS</h2><p>ما تم تأسيسه في هذه المرحلة.</p></div><span class="score">100%</span></div><div class="progress"><i style="width:100%"></i></div><ul class="check-list"><li><span>✓</span> Tenant مستقل للشركة</li><li><span>✓</span> مستخدم مستقل لكل موظف</li><li><span>✓</span> صلاحيات على الخادم</li><li><span>✓</span> دعوات وسجل نشاط</li></ul><div class="seat-usage"><span>استخدام المقاعد</span><b>${stats.members} / ${tenant.maxMembers}</b></div><div class="progress thin"><i style="width:${usage}%"></i></div></article></div>
    ${inviteModal(membership.role)}`;
}

function memberRow(member) {
  return `<div class="list-row"><span class="avatar avatar-soft">${initials(member.displayName)}</span><div><strong>${escapeHtml(member.displayName)}</strong><small>${escapeHtml(member.email)}</small></div><span class="role-pill ${member.role === "owner" ? "" : "neutral"}">${roleLabels[member.role]}</span><span class="dot-status ${member.status}"><i></i>${member.status === "active" ? "نشط" : "معلّق"}</span></div>`;
}

function emptyLine(text) { return `<div class="empty-line">${text}</div>`; }

export function teamView(data) {
  const { members, invitations, membership, permissions } = data;
  return `<div class="page-head"><div><span class="eyebrow">إدارة الوصول</span><h1>الفريق والمستخدمون</h1><p>لكل موظف حساب مستقل ودور وحالة خاصة به.</p></div>${permissions.canInvite ? `<button class="primary-button compact" type="button" data-open-invite>دعوة مستخدم <span>＋</span></button>` : ""}</div>
    <div class="toolbar"><label class="search-box"><span>⌕</span><input id="member-search" placeholder="ابحث بالاسم أو البريد…"></label><div class="toolbar-note"><span>${members.length}</span> مستخدمين في المساحة</div></div>
    <article class="panel table-panel"><div class="table-scroll"><table><thead><tr><th>المستخدم</th><th>الدور</th><th>الحالة</th><th>آخر ظهور</th><th>الإجراء</th></tr></thead><tbody>${members.map((member) => teamRow(member, membership.role, permissions.canManageTeam)).join("")}</tbody></table></div></article>
    <div class="section-head"><div><h2>الدعوات المعلّقة</h2><p>روابط صالحة لمدة 7 أيام.</p></div></div>
    <article class="panel invitations">${invitations.map(invitationRow).join("") || emptyLine("لا توجد دعوات معلّقة")}</article>
    ${inviteModal(membership.role)}`;
}

function teamRow(member, actorRole, canManage) {
  const immutable = member.role === "owner";
  const manageable = canManage && !immutable && !(actorRole === "admin" && member.role === "admin");
  return `<tr data-member-row data-search="${escapeHtml(`${member.displayName} ${member.email}`.toLowerCase())}"><td><div class="table-user"><span class="avatar avatar-soft">${initials(member.displayName)}</span><div><strong>${escapeHtml(member.displayName)}</strong><small>${escapeHtml(member.email)}</small></div></div></td><td>${manageable ? `<select class="role-select" data-member-role="${member.membershipId}" aria-label="دور ${escapeHtml(member.displayName)}">${roleOptions(member.role, actorRole)}</select>` : `<span class="role-pill ${immutable ? "" : "neutral"}">${roleLabels[member.role]}</span>`}</td><td><span class="dot-status ${member.status}"><i></i>${member.status === "active" ? "نشط" : "معلّق"}</span></td><td><span class="muted-text">${dateLabel(member.lastSeenAt)}</span></td><td>${manageable ? `<button class="ghost-button danger" type="button" data-toggle-member="${member.membershipId}" data-next-status="${member.status === "active" ? "suspended" : "active"}">${member.status === "active" ? "تعليق" : "تفعيل"}</button>` : `<span class="muted-text">محمي</span>`}</td></tr>`;
}

function invitationRow(invitation) {
  return `<div class="invitation-row"><span class="mail-icon">@</span><div><strong>${escapeHtml(invitation.email)}</strong><small>${roleLabels[invitation.role]} · تنتهي ${dateLabel(invitation.expiresAt)}</small></div><button class="ghost-button" type="button" data-copy-invite="${escapeHtml(invitation.invitePath)}">نسخ الرابط</button><button class="ghost-button danger" type="button" data-revoke-invite="${invitation.id}">إلغاء</button></div>`;
}

function inviteModal(actorRole) {
  const elevatedRoles = actorRole === "manager" ? "" : `<option value="manager">مشرف</option><option value="admin">مدير</option>`;
  return `<div class="modal-backdrop hidden" data-invite-modal><section class="modal" role="dialog" aria-modal="true" aria-labelledby="invite-title"><div class="modal-head"><div><span class="eyebrow">إضافة إلى الفريق</span><h2 id="invite-title">دعوة مستخدم جديد</h2></div><button class="icon-button" type="button" data-close-invite aria-label="إغلاق">×</button></div><form id="invite-form" class="form-stack"><label>البريد الإلكتروني<input name="email" type="email" placeholder="employee@company.com" dir="ltr" required></label><label>الدور<select name="role"><option value="operator">موظف</option><option value="viewer">مشاهد</option>${elevatedRoles}</select></label><div class="permission-note"><strong>صلاحيات الموظف</strong><p>يمكنه الدخول إلى مساحة الشركة وعرض الفريق، ولا يمكنه إدارة المستخدمين.</p></div><button class="primary-button" type="submit">إنشاء رابط الدعوة</button></form></section></div>`;
}

export function companyView(data) {
  const { tenant, permissions } = data;
  return `<div class="page-head"><div><span class="eyebrow">إعدادات Tenant</span><h1>إعدادات الشركة</h1><p>الهوية والإعدادات الأساسية لمساحة العمل.</p></div><span class="status-pill"><i></i> ${tenant.status === "active" ? "الشركة نشطة" : "معلّقة"}</span></div>
    <div class="settings-grid"><article class="panel company-profile"><div class="company-logo">${initials(tenant.name)}</div><div><h2>${escapeHtml(tenant.name)}</h2><p>${escapeHtml(tenant.slug)}</p><div class="inline-tags"><span>الخطة الأساسية</span><span>${tenant.maxMembers} مقعدًا</span></div></div></article><article class="panel isolation-card"><span class="shield large-shield">✓</span><div><h2>عزل البيانات مفعّل</h2><p>كل استعلام وصلاحية مرتبطان بمعرّف الشركة على الخادم.</p></div></article></div>
    <article class="panel form-panel"><div class="panel-head"><div><h2>بيانات الشركة</h2><p>تظهر هذه المعلومات لكل أعضاء الفريق.</p></div></div><form id="company-form" class="settings-form"><label class="wide">اسم الشركة<input name="name" value="${escapeHtml(tenant.name)}" minlength="2" maxlength="100" required ${permissions.canManageTenant ? "" : "disabled"}></label><label>لغة المساحة<select name="locale" ${permissions.canManageTenant ? "" : "disabled"}><option value="ar-SA" ${tenant.locale === "ar-SA" ? "selected" : ""}>العربية</option><option value="en-US" ${tenant.locale === "en-US" ? "selected" : ""}>English</option></select></label><label>المنطقة الزمنية<select name="timeZone" ${permissions.canManageTenant ? "" : "disabled"}><option value="Asia/Riyadh" ${tenant.timeZone === "Asia/Riyadh" ? "selected" : ""}>الرياض</option><option value="Asia/Dubai" ${tenant.timeZone === "Asia/Dubai" ? "selected" : ""}>دبي</option><option value="UTC" ${tenant.timeZone === "UTC" ? "selected" : ""}>UTC</option></select></label>${permissions.canManageTenant ? `<div class="form-actions"><button class="primary-button compact" type="submit">حفظ التغييرات</button></div>` : `<p class="read-only-note">هذه الإعدادات متاحة للمالك والمدير فقط.</p>`}</form></article>`;
}

export function inviteView(invitation, signedIn = false) {
  return `<main class="simple-page"><section class="invite-card"><span class="brand-mark large">S</span><span class="eyebrow">دعوة فريق</span><h1>أنت مدعو إلى ${escapeHtml(invitation.tenantName)}</h1><p>ستُضاف إلى مساحة الشركة بدور <strong>${roleLabels[invitation.role]}</strong>.</p><div class="invite-email"><span>@</span><div><small>البريد المدعو</small><strong>${escapeHtml(invitation.email)}</strong></div></div>${signedIn ? `<button class="primary-button" type="button" data-accept-invite>قبول الدعوة</button>` : `<a class="primary-action" href="/signin-with-chatgpt?return_to=${encodeURIComponent(location.pathname)}">سجّل الدخول لقبول الدعوة</a>`}<small class="expiry">تنتهي الدعوة في ${dateLabel(invitation.expiresAt)}</small></section></main>`;
}

export function errorView(message) {
  return `<main class="simple-page"><section class="simple-card"><span class="error-mark">!</span><h1>تعذر فتح الصفحة</h1><p>${escapeHtml(message)}</p><a class="primary-action" href="/">العودة للرئيسية</a></section></main>`;
}
