/* app.js — แกนกลางของหน้าเว็บ: เรียกหลังบ้าน · แคชในเครื่อง · ล็อกอิน · เมนู · ป๊อปอัป · แจ้งเตือน · เครื่องมือช่วย
   รุ่น 2569-10-13.2 */
var SMCDF = (function () {
  var BUILD = '2569-10-13.2';
  var MANUAL = (typeof MANUAL_URL !== 'undefined' && MANUAL_URL && MANUAL_URL.indexOf('PLACEHOLDER') < 0) ? MANUAL_URL : 'https://claude.ai/artifact/FrieHW2DQUStQMuPHonvNZ';
  var S = { token: null, me: null, cfg: null, boot: null, page: 'daily', arg: null, ver: '', alerts: [] };
  var $ = function (id) { return document.getElementById(id); };

  /* ================= ไอคอน (เส้น 1.8 px) ================= */
  var IP = {
    daily: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 14h3M7.5 17h6"/>',
    audit: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m8.8 12 2.2 2.2 4.4-4.4"/>',
    month: '<path d="M6 2.5h8.5L19 7v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4a1.5 1.5 0 0 1 1-1.5Z"/><path d="M14 2.5V7h5"/><path d="M8.5 12.5h7M8.5 16h7M8.5 9h3"/>',
    report: '<path d="M4 5h16M4 12h10M4 19h6"/><circle cx="17.5" cy="16.5" r="3"/><path d="m19.7 18.7 2 2"/>',
    dash: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a3 3 0 0 1 5.6 1.3c0 2-2.8 2.5-2.8 4"/><path d="M12 17.6h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    key: '<circle cx="8" cy="15" r="4.5"/><path d="m11.2 11.8 9.3-9.3M17 6l3 3M14.5 8.5l2 2"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5h.01"/>',
    logout: '<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 17l5-5-5-5M15 12H3.5"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5"/>',
    image: '<rect x="3" y="3.5" width="18" height="17" rx="2.5"/><circle cx="9" cy="9.5" r="2"/><path d="m21 15.5-5-5L5 20.5"/>',
    share: '<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    download: '<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L3 9M4 13a8 8 0 0 0 14.6 4.5L21 15"/><path d="M3 4v5h5M21 20v-5h-5"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    warn: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4.5M12 17.5h.01"/>',
    ok: '<circle cx="12" cy="12" r="9.5"/><path d="m8 12.3 2.8 2.8L16.3 9.5"/>',
    err: '<circle cx="12" cy="12" r="9.5"/><path d="M15 9l-6 6M9 9l6 6"/>',
    excel: '<path d="M6 2.5h8.5L19 7v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4a1.5 1.5 0 0 1 1-1.5Z"/><path d="M14 2.5V7h5"/><path d="m9 11 5 6M14 11l-5 6"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    unlock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 7.7-1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.8 3 2.6 3.5 5.2"/>',
    tooth: '<path d="M8 3.5c-2.6 0-4 2-3.6 4.8.3 2.2 1.4 3.3 1.8 5.6.5 3 .9 6.6 2.5 6.6 1.4 0 1.6-2.6 1.9-4.2.2-1 .6-1.6 1.4-1.6s1.2.6 1.4 1.6c.3 1.6.5 4.2 1.9 4.2 1.6 0 2-3.6 2.5-6.6.4-2.3 1.5-3.4 1.8-5.6.4-2.8-1-4.8-3.6-4.8-1.6 0-2.4.8-4 .8s-2.4-.8-4-.8Z"/>',
    money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    cases: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    cut: '<circle cx="12" cy="12" r="9.5"/><path d="M5.5 5.5l13 13"/>',
    cal: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    filter: '<path d="M3 5h18l-7 8.5V20l-4-2v-4.5L3 5Z"/>',
    code: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    staff: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-1.5A5.5 5.5 0 0 1 10.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21"/><path d="M12 14v4M10 16h4"/>',
    line: '<path d="M21 11.2C21 7 17 3.7 12 3.7S3 7 3 11.2c0 3.8 3.3 6.9 7.8 7.5.3.1.7.2.8.5.1.3 0 .6 0 .9l-.1.8c0 .2-.2.9.8.5s5.4-3.2 7.4-5.5c1.4-1.5 2.3-3 2.3-4.7Z"/>',
    sync: '<path d="M21 12a9 9 0 0 1-15.3 6.4L3 16M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M3 21v-5h5M21 3v5h-5"/>'
  };
  function ic(name, cls) {
    return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IP[name] || '') + '</svg>';
  }

  /* โลโก้: ฟันกรามในกรอบโค้งสีเขียวทะเลลึก + เหรียญทองแดงเครื่องหมายถูก (ตรวจแล้ว ถูกต้อง) */
  var LOGO_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="16" fill="#127C80"/>' +
    '<rect x="2" y="2" width="60" height="60" rx="16" fill="url(#lg1)"/>' +
    '<defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A9396"/><stop offset="1" stop-color="#0F3D47"/></linearGradient></defs>' +
    '<path d="M22.5 13c-6 0-9.2 4.6-8.3 10.8.7 5 3.1 7.6 4.1 12.7 1.1 6.8 2 15 5.7 15 3.2 0 3.6-5.9 4.3-9.5.5-2.3 1.4-3.6 3.2-3.6s2.7 1.3 3.2 3.6c.7 3.6 1.1 9.5 4.3 9.5 3.7 0 4.6-8.2 5.7-15 1-5.1 3.4-7.7 4.1-12.7.9-6.2-2.3-10.8-8.3-10.8-3.6 0-5.5 1.8-9 1.8s-5.4-1.8-9-1.8Z" fill="#fff"/>' +
    '<circle cx="46" cy="46" r="11" fill="#B4693A" stroke="#fff" stroke-width="3"/>' +
    '<path d="m40.8 46.2 3.6 3.6 6.8-7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function logoHtml(sub) {
    return LOGO_SVG + '<div class="logo-t"><b>SMC <em>DF</em></b><small>' + esc(sub || 'ค่าธรรมเนียมแพทย์ · ทันตกรรมนอกเวลา') + '</small></div>';
  }

  /* ================= เครื่องมือ ================= */
  var TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var TH_MON_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var TH_DAY = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  var TH_DAY_S = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function n0(v) { return Number(v || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }); }
  function n2(v) { return Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function nk(v) { var x = Number(v || 0); return Math.abs(x) >= 1e6 ? (x / 1e6).toFixed(2) + ' ล.' : Math.abs(x) >= 1e4 ? (x / 1e3).toFixed(1) + 'K' : n0(x); }
  function pct(v) { return (Number(v || 0) * 100).toFixed(1) + '%'; }
  /* วันที่ทั้งหมดคิดบนฐาน UTC เสมอ เพื่อไม่ให้โซนเวลาของเครื่องผู้ใช้ทำให้วันเลื่อน */
  function utcOf(iso) { var p = String(iso).split('-'); return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2] || 1)); }
  function dow(iso) { return new Date(utcOf(iso)).getUTCDay(); }
  function dThai(iso, full) {
    if (!iso) return '-';
    var p = String(iso).split('-');
    var m = full ? TH_MON_FULL[Number(p[1]) - 1] : TH_MON[Number(p[1]) - 1];
    return (full ? 'วัน' + TH_DAY[dow(iso)] + 'ที่ ' : '') + Number(p[2]) + ' ' + m + ' ' + (Number(p[0]) + 543);
  }
  /* "2026-10-13 18:18:23" → "13 ต.ค. 2569 เวลา 18:18 น." */
  function dtThai(s) {
    var m = String(s || '').match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (!m) return s || '-';
    return dThai(m[1]) + (m[2] ? ' เวลา ' + m[2] + ':' + m[3] + ' น.' : '');
  }
  function ymThai(ym) { var p = String(ym).split('-'); return TH_MON_FULL[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543); }
  function ymShort(ym) { var p = String(ym).split('-'); return TH_MON[Number(p[1]) - 1] + ' ' + String(Number(p[0]) + 543).slice(-2); }
  function today() { var d = new Date(); return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10); }
  function addDays(iso, n) { return new Date(utcOf(iso) + n * 86400000).toISOString().slice(0, 10); }
  function monthStart(ym) { return ym + '-01'; }
  function monthEnd(ym) { var p = ym.split('-'), d = new Date(Date.UTC(Number(p[0]), Number(p[1]), 0)); return ym + '-' + ('0' + d.getUTCDate()).slice(-2); }
  function addMonths(ym, n) { var p = ym.split('-'), d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1 + n, 1)); return d.toISOString().slice(0, 7); }
  function fyOf(iso) { var p = String(iso).split('-'); return Number(p[1]) >= 10 ? Number(p[0]) + 544 : Number(p[0]) + 543; }
  function fyRange(fy) { var y = fy - 543; return { from: (y - 1) + '-10-01', to: y + '-09-30' }; }
  function initials(name) { var n = String(name || '').replace(/^(นาย|นางสาว|นาง|ทพญ\.|ทพ\.|นพ\.|พญ\.)\s*/, ''); return n.charAt(0) || '?'; }

  /* ================= แถบโหลด ================= */
  var inflight = 0;
  function loadOn() { inflight++; $('loadBar').classList.add('on'); }
  function loadOff() { inflight = Math.max(0, inflight - 1); if (!inflight) $('loadBar').classList.remove('on'); }

  /* ================= แจ้งเตือนมุมจอ ================= */
  function toast(msg, opt) {
    if (typeof opt === 'number') opt = { ms: opt };
    opt = opt || {};
    var type = opt.type || (opt.ms && opt.ms >= 4000 ? 'err' : 'ok');
    var icon = { ok: 'ok', err: 'err', warn: 'warn', info: 'info' }[type] || 'info';
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', type === 'err' ? 'alert' : 'status');
    el.innerHTML = '<span class="ti">' + ic(icon) + '</span><div class="tt">' +
      (opt.title ? '<b>' + esc(opt.title) + '</b>' : '') + '<span>' + esc(msg) + '</span></div>' +
      '<button class="tx" aria-label="ปิด">' + ic('x') + '</button>';
    $('toasts').appendChild(el);
    var kill = function () { if (!el.parentNode) return; el.classList.add('out'); setTimeout(function () { el.remove(); }, 220); };
    el.querySelector('.tx').onclick = kill;
    setTimeout(kill, opt.ms || (type === 'err' ? 6500 : 3200));
    var all = $('toasts').children;
    if (all.length > 4) all[0].remove();
  }
  function ok(msg, title) { toast(msg, { type: 'ok', title: title }); }
  function err(e, title) { toast(e && e.message ? e.message : String(e), { type: 'err', title: title || 'ทำรายการไม่สำเร็จ' }); }

  /* ================= ป๊อปอัป =================
     dialog({ title, sub, icon, tone, body, size, actions:[{label, cls, value, onClick}], dismiss }) → Promise(value) */
  var stack = [];
  function dialog(o) {
    return new Promise(function (resolve) {
      var root = document.createElement('div');
      root.className = 'modal';
      var acts = (o.actions || [{ label: 'ปิด', value: null }]);
      root.innerHTML = '<div class="modal-box ' + (o.size || '') + '" role="dialog" aria-modal="true">' +
        '<div class="mh">' + (o.icon ? '<span class="ico ' + (o.tone || '') + '">' + ic(o.icon) + '</span>' : '') +
        '<div><h3>' + esc(o.title || '') + '</h3>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div>' +
        '<button class="x" data-x aria-label="ปิด">' + ic('x') + '</button></div>' +
        '<div class="mb">' + (o.body || '') + '</div>' +
        (acts.length ? '<div class="mf">' + acts.map(function (a, i) {
          return '<button class="btn ' + (a.cls || '') + '" data-a="' + i + '">' + (a.icon ? ic(a.icon) : '') + esc(a.label) + '</button>';
        }).join('') + '</div>' : '') + '</div>';
      $('modalRoot').appendChild(root);
      stack.push(root);
      var done = function (v) {
        if (!root.parentNode) return;
        root.remove(); stack = stack.filter(function (x) { return x !== root; });
        resolve(v);
      };
      root._close = done;
      root.addEventListener('click', function (e) { if (e.target === root && o.dismiss !== false) done(null); });
      root.querySelector('[data-x]').onclick = function () { done(null); };
      root.querySelectorAll('[data-a]').forEach(function (b) {
        b.onclick = function () {
          var a = acts[Number(b.getAttribute('data-a'))];
          if (a.onClick) {
            var r = a.onClick(root, b);
            if (r && r.then) {
              busyBtn(b, true);
              r.then(function (v) { busyBtn(b, false); if (v !== false) done(v === undefined ? a.value : v); })
               .catch(function (e) { busyBtn(b, false); showErrIn(root, e); });
              return;
            }
            if (r === false) return;
          }
          done(a.value);
        };
      });
      var f = root.querySelector('input,select,textarea');
      if (f) setTimeout(function () { try { f.focus(); } catch (e) { } }, 60);
      if (o.onOpen) o.onOpen(root);
    });
  }
  function showErrIn(root, e) {
    var m = root.querySelector('.dlg-err');
    if (!m) { m = document.createElement('div'); m.className = 'msg err dlg-err'; root.querySelector('.mb').appendChild(m); }
    m.innerHTML = ic('err') + '<span>' + esc(e && e.message ? e.message : e) + '</span>';
  }
  function closeTop() { var t = stack[stack.length - 1]; if (t) t._close(null); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePop(); closeTop(); } });

  function confirmBox(o) {
    return dialog({ title: o.title, sub: o.sub, icon: o.icon || (o.danger ? 'warn' : 'help'), tone: o.danger ? 'warn' : '', body: o.body || '', size: 'narrow',
      actions: [{ label: o.cancel || 'ยกเลิก', value: false }, { label: o.ok || 'ยืนยัน', cls: o.danger ? 'danger' : 'primary', value: true, onClick: o.onOk }] });
  }
  /* ถามรหัสผ่านยืนยันการกระทำสำคัญ */
  function askPassword(o) {
    return dialog({ title: o.title, sub: o.sub, icon: 'lock', tone: o.tone || 'warn', size: 'narrow',
      body: (o.body || '') + '<label class="fld"><span>ยืนยันด้วยรหัสผ่านของคุณ</span><input type="password" id="dlgPw" autocomplete="current-password"></label>' +
        (o.reason ? '<label class="fld"><span>' + esc(o.reason) + '</span><input id="dlgReason"></label>' : ''),
      actions: [{ label: 'ยกเลิก', value: null }, { label: o.ok || 'ยืนยัน', cls: o.danger ? 'danger' : 'primary', onClick: function (root) {
        var pw = root.querySelector('#dlgPw').value, rs = root.querySelector('#dlgReason');
        if (!pw) return Promise.reject(new Error('กรุณาใส่รหัสผ่าน'));
        return o.run(pw, rs ? rs.value.trim() : '');
      } }] });
  }

  /* ปุ่มกำลังทำงาน: หมุน + ปิดปุ่ม · คืนข้อความเดิมเมื่อเสร็จ */
  function busyBtn(b, on, text) {
    if (!b) return;
    if (on) {
      if (b._html == null) b._html = b.innerHTML;
      b.classList.add('busy'); b.disabled = true;
      b.innerHTML = '<span class="spin"></span>' + esc(text || b.textContent.trim() || 'กำลังทำงาน');
    } else {
      b.classList.remove('busy'); b.disabled = false;
      if (b._html != null) { b.innerHTML = b._html; b._html = null; }
    }
  }
  /* run(ปุ่ม, ฟังก์ชันที่คืน Promise, {busy:'กำลัง…', ok:'สำเร็จ'}) */
  function run(btn, fn, o) {
    o = o || {};
    busyBtn(btn, true, o.busy);
    return Promise.resolve().then(fn).then(function (r) {
      busyBtn(btn, false);
      if (o.ok) ok(typeof o.ok === 'function' ? o.ok(r) : o.ok);
      return r;
    }, function (e) {
      busyBtn(btn, false);
      err(e, o.errTitle);
      throw e;
    });
  }

  /* ================= เรียกหลังบ้าน ================= */
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function api(action, payload, opt) {
    opt = opt || {};
    var body = { action: action, token: S.token, payload: payload || {}, _rid: opt.rid || rid() };
    var isRead = /^(get|list|ping|login|bootstrap|backfillInfo)/.test(action);
    var tries = isRead ? 3 : 1, attempt = 0;
    if (!opt.silent) loadOn();

    function go() {
      attempt++;
      return fetch(API_URL, { method: 'POST', credentials: 'omit', body: JSON.stringify(body) })
        .then(function (r) { return r.text(); })
        .then(function (txt) {
          if (txt && txt.charAt(0) === '<') throw new Error('เซิร์ฟเวอร์ Google ไม่ว่างชั่วคราว กรุณาลองใหม่อีกครั้ง');
          var j;
          try { j = JSON.parse(txt); } catch (e) { throw new Error('ข้อมูลที่ได้รับไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'); }
          if (!j.ok) {
            var e2 = new Error(j.error || 'เกิดข้อผิดพลาด');
            e2.mustChange = j.mustChange; e2.server = true;
            if (/หมดเวลาการใช้งาน|ออกจากระบบแล้ว|ถูกปิดการใช้งาน/.test(e2.message) && action !== 'login') setTimeout(function () { sessionExpired(e2.message); }, 50);
            throw e2;
          }
          if (j.build && j.build !== BUILD) showVerWarn(j.build);
          if (j.ver) noteVer(j.ver);
          return j.data;
        })
        .catch(function (e) {
          if (!e.server && attempt < tries) return new Promise(function (res) { setTimeout(res, 700 * attempt); }).then(go);
          if (!e.server && /Failed to fetch|NetworkError|Load failed/i.test(e.message)) e.message = 'เชื่อมต่อระบบไม่ได้ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
          throw e;
        });
    }
    return go().then(function (d) { if (!opt.silent) loadOff(); return d; }, function (e) { if (!opt.silent) loadOff(); throw e; });
  }

  /* ================= แคชในเครื่อง (เปิดซ้ำขึ้นทันที แล้วอัปเดตเบื้องหลัง) ================= */
  var CK = 'smcdf.c2.';
  function ckey(action, payload) { return CK + (S.me ? S.me.empCode : '-') + '.' + action + '.' + JSON.stringify(payload || {}); }
  function cacheGet(action, payload) {
    try { var s = localStorage.getItem(ckey(action, payload)); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function cachePut(action, payload, data) {
    var k = ckey(action, payload), v = JSON.stringify({ at: Date.now(), ver: data && data.ver, data: data });
    try { localStorage.setItem(k, v); }
    catch (e) { cacheTrim(20); try { localStorage.setItem(k, v); } catch (x) { } }
    try {
      var idx = JSON.parse(localStorage.getItem(CK + 'idx') || '[]').filter(function (x) { return x !== k; });
      idx.push(k);
      while (idx.length > 80) { localStorage.removeItem(idx.shift()); }
      localStorage.setItem(CK + 'idx', JSON.stringify(idx));
    } catch (e) { }
  }
  function cacheTrim(n) {
    try {
      var idx = JSON.parse(localStorage.getItem(CK + 'idx') || '[]');
      idx.splice(0, n).forEach(function (k) { localStorage.removeItem(k); });
      localStorage.setItem(CK + 'idx', JSON.stringify(idx));
    } catch (e) { }
  }
  function cacheClear() {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(CK) === 0) localStorage.removeItem(k); }); } catch (e) { }
  }
  /* อ่านแบบมีแคช: onData(data, fromCache) อาจถูกเรียก 2 ครั้ง (แคชก่อน แล้วข้อมูลล่าสุด) */
  function cached(action, payload, onData, opt) {
    opt = opt || {};
    var hit = cacheGet(action, payload);
    // แคชตรงรุ่นข้อมูลล่าสุดที่รู้ และเพิ่งตรวจรุ่นไม่เกิน 2 นาที → ใช้ได้เลยไม่ต้องถามหลังบ้าน
    var fresh = hit && hit.ver && hit.ver === S.ver && (Date.now() - (S.verAt || 0) < 120000);
    if (hit) onData(hit.data, true, fresh);
    if (fresh && !opt.force) return Promise.resolve(hit.data);
    var send = {}; for (var k in (payload || {})) send[k] = payload[k];
    if (hit && hit.ver) send._v = hit.ver;
    return api(action, send, { silent: !!hit && !opt.loud }).then(function (d) {
      if (d && d.notModified && hit) { hit.data.ver = d.ver; cachePut(action, payload, hit.data); onData(hit.data, false, true, true); return hit.data; }
      cachePut(action, payload, d);
      if (!hit || JSON.stringify(hit.data) !== JSON.stringify(d)) onData(d, false, true);
      else onData(d, false, true, true);
      return d;
    }, function (e) { if (hit) { toast('แสดงข้อมูลที่จำไว้ในเครื่อง — ' + e.message, { type: 'warn' }); return hit.data; } throw e; });
  }
  /* โหลดเก็บไว้ล่วงหน้า (ไม่แสดงผล) */
  function prefetch(action, payload) {
    var hit = cacheGet(action, payload);
    if (hit && hit.ver === S.ver && (Date.now() - (S.verAt || 0) < 120000)) return;
    api(action, payload, { silent: true }).then(function (d) { cachePut(action, payload, d); }, function () { });
  }
  function noteVer(v) {
    if (!v) return;
    S.verAt = Date.now();
    if (v === S.ver) return;
    var first = !S.ver; S.ver = v;
    if (!first) refreshAlerts(true);
  }

  function showVerWarn(serverBuild) {
    var el = $('verWarn');
    el.innerHTML = ic('warn') + '<span>มีระบบรุ่นใหม่ (' + esc(serverBuild) + ') — กดปุ่มนี้เพื่อโหลดหน้าเว็บรุ่นล่าสุด</span>' +
      '<button class="btn sm" id="vwGo">' + ic('refresh') + 'โหลดใหม่</button>';
    el.classList.remove('hidden');
    $('vwGo').onclick = function () { location.reload(true); };
  }

  /* ================= เนื้อหาระหว่างโหลด / ผิดพลาด ================= */
  function loading(msg) { return '<div class="loading-box"><span class="spin"></span>' + esc(msg || 'กำลังโหลดข้อมูล…') + '</div>'; }
  function skeleton(n) {
    var k = '<div class="kpis">' + new Array(n || 4).join('.').split('.').map(function () { return '<div class="sk sk-kpi"></div>'; }).join('') + '</div>';
    return k + '<div class="panel"><div class="panel-b">' + [80, 95, 70, 88, 60].map(function (w) { return '<div class="sk sk-row" style="width:' + w + '%"></div>'; }).join('') + '</div></div>';
  }
  function errBox(e, retry) {
    return '<div class="msg err">' + ic('err') + '<span><b>โหลดข้อมูลไม่สำเร็จ</b><br>' + esc(e && e.message ? e.message : e) + '</span>' +
      (retry ? '<button class="btn sm" data-retry>' + ic('refresh') + 'ลองใหม่</button>' : '') + '</div>';
  }
  function empty(title, sub, icon) {
    return '<div class="empty">' + ic(icon || 'info') + '<b>' + esc(title) + '</b>' + (sub ? '<span class="note">' + sub + '</span>' : '') + '</div>';
  }

  /* ตารางทุกตัวในหน้า → การ์ดบนมือถือ (ใส่ชื่อคอลัมน์ให้แต่ละช่อง) */
  function cardify(root) {
    (root || document).querySelectorAll('table.rt').forEach(function (t) {
      var heads = [].map.call(t.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
      t.querySelectorAll('tbody tr').forEach(function (tr) {
        var i = 0;
        [].forEach.call(tr.children, function (td) {
          if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] || '');
          i += Number(td.getAttribute('colspan') || 1);
        });
      });
    });
  }

  /* ================= เมนู ================= */
  var MENU = [
    { id: 'daily', icon: 'daily', label: 'รายงานประจำวัน', sub: 'ยอดและเคสของแต่ละวัน', short: 'ประจำวัน', roles: ['admin', 'hr', 'head', 'doctor'] },
    { id: 'audit', icon: 'audit', label: 'ทวนสอบ DF เกิน 1', sub: 'เคสที่คีย์ DF หลายรายการ', short: 'ทวนสอบ', roles: ['admin', 'hr', 'head', 'doctor'] },
    { id: 'month', icon: 'month', label: 'รอบเบิกรายเดือน', sub: 'ปิดรอบ · รายงานส่ง HR', short: 'รอบเบิก', roles: ['admin', 'hr', 'head', 'doctor'] },
    { id: 'report', icon: 'report', label: 'รายงานเลือกมุมมอง', sub: 'แพทย์ · DF · สิทธิ · ช่วงเวลา', short: 'รายงาน', roles: ['admin', 'hr', 'head', 'doctor'] },
    { id: 'dash', icon: 'dash', label: 'แดชบอร์ด', sub: 'กราฟแนวโน้มและสัดส่วน', short: 'แดชบอร์ด', roles: ['admin', 'hr', 'head', 'doctor'] },
    { id: 'settings', icon: 'settings', label: 'ตั้งค่า', sub: 'กติกา · รหัส DF · ผู้ใช้', short: 'ตั้งค่า', roles: ['admin'] }
  ];
  function can(ids) { return ids.some(function (r) { return S.me.roles.indexOf(r) >= 0; }); }
  function role(r) { return S.me && S.me.roles.indexOf(r) >= 0; }

  function drawMenu() {
    var items = MENU.filter(function (m) { return can(m.roles); });
    $('menu').innerHTML = '<div class="grp">เมนูหลัก</div>' + items.map(function (m) {
      var cnt = m.id === 'settings' ? S.alerts.filter(function (a) { return a.key === 'codes'; }).length : 0;
      return '<button data-go="' + m.id + '" class="' + (m.id === S.page ? 'on' : '') + '">' + ic(m.icon) +
        '<span>' + esc(m.label) + '<small>' + esc(m.sub) + '</small></span>' + (cnt ? '<span class="cnt">!</span>' : '') + '</button>';
    }).join('');
    var bn = items.filter(function (m) { return m.id !== 'settings'; }).slice(0, 5);
    $('bnav').style.gridTemplateColumns = 'repeat(' + bn.length + ',1fr)';
    $('bnav').innerHTML = bn.map(function (m) {
      return '<button data-go="' + m.id + '" class="' + (m.id === S.page ? 'on' : '') + '">' + ic(m.icon) + esc(m.short) + '</button>';
    }).join('');
    document.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-go')); }; });
  }

  function go(page, arg) {
    var parts = String(page).split(':');
    page = parts[0]; if (parts[1] && arg == null) arg = parts.slice(1).join(':');
    if (!MENU.some(function (m) { return m.id === page && can(m.roles); })) page = 'daily';
    S.page = page; S.arg = arg || null;
    try { localStorage.setItem('smcdf.page', page); } catch (e) { }
    drawMenu();
    closeSide(); closePop();
    var def = MENU.filter(function (m) { return m.id === page; })[0];
    $('pageTitle').textContent = def ? def.label : '';
    $('pageSub').textContent = def ? def.sub : '';
    document.title = (def ? def.label + ' — ' : '') + 'SMC DF';
    var host = $('page');
    host.classList.remove('page-in'); void host.offsetWidth; host.classList.add('page-in');
    host.innerHTML = (window.HELP ? HELP.hint(page) : '') + '<div id="pg">' + skeleton() + '</div>';
    if (window.HELP) HELP.bindHint(host, page);
    var fn = ({ daily: PAGES.daily, audit: PAGES.audit, month: REPORTS.month, report: EXPLORE.page, dash: REPORTS.dash, settings: REPORTS.settings })[page];
    var pg = $('pg');
    Promise.resolve().then(function () { return fn(pg, S.arg); })
      .catch(function (e) {
        pg.innerHTML = errBox(e, true);
        var r = pg.querySelector('[data-retry]'); if (r) r.onclick = function () { go(page, arg); };
      });
    window.scrollTo(0, 0);
  }

  function openSide() {
    $('side').classList.add('open');
    var sc = document.createElement('div'); sc.className = 'scrim'; sc.id = 'scrim';
    sc.onclick = closeSide; document.body.appendChild(sc);
  }
  function closeSide() { $('side').classList.remove('open'); var s = $('scrim'); if (s) s.remove(); }

  /* ================= เมนูลอย ================= */
  var popEl = null;
  function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
  function openPop(anchor, html, bind) {
    closePop();
    var el = document.createElement('div'); el.className = 'pop'; el.innerHTML = html;
    document.body.appendChild(el); popEl = el;
    var r = anchor.getBoundingClientRect(), w = el.offsetWidth;
    var left = Math.min(Math.max(12, r.right - w), window.innerWidth - w - 12);
    var top = r.bottom + 8;
    if (top + el.offsetHeight > window.innerHeight - 12) top = Math.max(12, r.top - el.offsetHeight - 8);
    el.style.left = left + 'px'; el.style.top = top + 'px';
    setTimeout(function () { document.addEventListener('click', outside, true); }, 0);
    function outside(e) { if (popEl && !popEl.contains(e.target) && !anchor.contains(e.target)) { closePop(); document.removeEventListener('click', outside, true); } }
    if (bind) bind(el);
  }

  /* กระดิ่งแจ้งเตือน */
  function drawBell() {
    var n = S.alerts.length;
    $('btnBell').innerHTML = ic('bell') + (n ? '<span class="badge-n">' + n + '</span>' : '');
  }
  function refreshAlerts(silent) {
    if (!S.me) return;
    api('getAlerts', {}, { silent: true }).then(function (r) { S.alerts = r.alerts || []; drawBell(); drawMenu(); }, function () { });
  }
  function showBell() {
    var a = S.alerts;
    openPop($('btnBell'), '<div class="pop-h">' + ic('bell') + 'การแจ้งเตือน</div>' +
      (a.length ? a.map(function (x, i) {
        var ico = x.level === 'bad' ? 'err' : x.level === 'warn' ? 'warn' : 'info';
        return '<button class="pop-i" data-al="' + i + '"><span class="pi ' + esc(x.level) + '">' + ic(ico) + '</span><span><b>' + esc(x.title) + '</b><small>' + esc(x.body) + '</small></span></button>';
      }).join('') : '<div class="pop-empty">' + ic('ok') + '<br>ไม่มีเรื่องที่ต้องดำเนินการ</div>'),
      function (el) {
        el.querySelectorAll('[data-al]').forEach(function (b) {
          b.onclick = function () { var x = a[Number(b.getAttribute('data-al'))]; closePop(); if (x.go) go(x.go); };
        });
      });
  }

  /* เมนูบัญชีของฉัน */
  function showMe(anchor) {
    openPop(anchor, '<div class="pop-h"><span class="avatar">' + esc(initials(S.me.name)) + '</span><span><b>' + esc(S.me.name) + '</b><br><small class="note">' +
      esc(S.me.empCode + (S.me.title ? ' · ' + S.me.title : '')) + '</small></span></div>' +
      popItem('key', 'เปลี่ยนรหัสผ่าน', 'ตั้งรหัสผ่านใหม่ด้วยตัวเอง', 'pass') +
      popItem('book', 'คู่มือการใช้งาน', 'คู่มือฉบับเต็ม ทุกหน้า ทุกขั้นตอน', 'manual') +
      popItem('help', 'วิธีใช้งานหน้านี้', 'สรุปขั้นตอนของหน้าที่เปิดอยู่', 'help') +
      popItem('info', 'รายละเอียดระบบ', 'กติกา รุ่น และผู้ติดต่อ', 'about') +
      popItem('logout', 'ออกจากระบบ', 'ออกจากเครื่องนี้ และล้างข้อมูลที่จำไว้', 'out'),
      function (el) {
        el.querySelectorAll('[data-me]').forEach(function (b) {
          b.onclick = function () {
            var k = b.getAttribute('data-me'); closePop();
            if (k === 'pass') askChangePass(false);
            if (k === 'manual') window.open(MANUAL, '_blank', 'noopener');
            if (k === 'help' && window.HELP) HELP.show(S.page);
            if (k === 'about') about();
            if (k === 'out') confirmBox({ title: 'ออกจากระบบ?', sub: 'ข้อมูลที่จำไว้ในเครื่องนี้จะถูกล้างด้วย', ok: 'ออกจากระบบ' }).then(function (y) { if (y) logout(); });
          };
        });
      });
  }
  function popItem(icon, t, s, k) {
    return '<button class="pop-i" data-me="' + k + '"><span class="pi">' + ic(icon) + '</span><span><b>' + esc(t) + '</b><small>' + esc(s) + '</small></span></button>';
  }

  /* ================= เริ่มทำงาน ================= */
  function start() {
    try { S.token = localStorage.getItem('smcdf.token'); } catch (e) { }
    $('bootLogo').innerHTML = LOGO_SVG;
    $('loginLogo').innerHTML = logoHtml('ระบบรายงานและตรวจสอบค่าธรรมเนียมแพทย์');
    $('sideLogo').innerHTML = logoHtml();
    $('loginPoints').innerHTML = [
      'ดึงยอดค่าธรรมเนียมแพทย์จากระบบโรงพยาบาลทุก 30 นาที',
      'รับรอง DF สูงสุด 1 รายการต่อผู้ป่วยต่อวัน ตามมติที่ประชุม',
      'ออกรายงานประจำวัน รายงานส่งเบิก HR และไฟล์ HRMi'
    ].map(function (t) { return '<li>' + ic('check') + '<span>' + esc(t) + '</span></li>'; }).join('');
    $('btnSide').innerHTML = ic('menu');
    $('btnHelp').innerHTML = ic('help') + '<span class="lbl">วิธีใช้งาน</span>';
    $('btnMe2').innerHTML = ic('user');
    $('footLine').textContent = 'SMC DF ' + BUILD;
    $('btnAbout').onclick = about;
    $('btnSide').onclick = openSide;
    $('btnHelp').onclick = function () { if (window.HELP) HELP.show(S.page); };
    $('btnBell').onclick = showBell;
    $('btnMe').onclick = function () { showMe($('btnMe')); };
    $('btnMe2').onclick = function () { showMe($('btnMe2')); };
    $('liEye').onclick = function () {
      var i = $('liPass'); i.type = i.type === 'password' ? 'text' : 'password';
      $('liEye').textContent = i.type === 'password' ? 'แสดง' : 'ซ่อน';
    };
    $('loginForm').onsubmit = function (e) { e.preventDefault(); doLogin(); };

    if (S.token) {
      api('bootstrap', {}).then(function (b) { enter(b); }).catch(function () { showLogin(); });
    } else showLogin();
    setInterval(function () { if (S.me && !document.hidden) refreshAlerts(true); }, 10 * 60 * 1000);
  }

  function showLogin() {
    $('boot').classList.add('hidden');
    $('shell').classList.add('hidden');
    $('login').classList.remove('hidden');
    setTimeout(function () { $('liCode').focus(); }, 50);
    api('ping', {}, { silent: true }).then(function (d) {
      $('liDot').className = 'dot ok';
      $('liConn').textContent = 'เชื่อมต่อระบบแล้ว · รุ่น ' + d.version + ' (' + d.buildTh + ')';
    }).catch(function () {
      $('liDot').className = 'dot bad';
      $('liConn').textContent = 'เชื่อมต่อหลังบ้านไม่ได้ — ตรวจลิงก์ใน config.js หรือแจ้งผู้ดูแลระบบ';
    });
  }

  function doLogin() {
    var code = $('liCode').value.trim(), pass = $('liPass').value;
    var msg = $('liMsg');
    msg.classList.add('hidden');
    busyBtn($('liGo'), true, 'กำลังเข้าสู่ระบบ…');
    api('login', { empCode: code, password: pass })
      .then(function (d) {
        S.token = d.token;
        try { localStorage.setItem('smcdf.token', d.token); } catch (e) { }
        if (d.me.mustChange) { S.me = d.me; return askChangePass(true); }
        enter(d.boot);
        ok('ยินดีต้อนรับ ' + d.me.name);
      })
      .catch(function (e) { msg.innerHTML = ic('err') + '<span>' + esc(e.message) + '</span>'; msg.classList.remove('hidden'); })
      .then(function () { busyBtn($('liGo'), false); });
  }

  function askChangePass(first) {
    return dialog({
      title: first ? 'ตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน' : 'เปลี่ยนรหัสผ่าน', icon: 'key',
      sub: first ? 'รหัสผ่านเริ่มต้นคือรหัสเจ้าหน้าที่ เพื่อความปลอดภัยกรุณาตั้งรหัสผ่านของคุณเอง' : 'เมื่อเปลี่ยนแล้ว ทุกเครื่องที่เคยเข้าระบบจะต้องเข้าสู่ระบบใหม่',
      size: 'narrow', dismiss: !first,
      body: '<label class="fld"><span>รหัสผ่านเดิม</span><input id="cpOld" type="password" autocomplete="current-password"></label>' +
        '<label class="fld"><span>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</span><input id="cpNew" type="password" autocomplete="new-password"></label>' +
        '<label class="fld"><span>พิมพ์รหัสผ่านใหม่อีกครั้ง</span><input id="cpNew2" type="password" autocomplete="new-password"></label>' +
        '<div class="note">แนะนำให้ผสมตัวอักษรและตัวเลข และไม่ใช้รหัสเดียวกับระบบอื่น · ลืมรหัสผ่านให้แจ้งผู้ดูแลระบบตั้งใหม่</div>',
      actions: (first ? [] : [{ label: 'ยกเลิก', value: null }]).concat([{ label: 'บันทึกรหัสผ่านใหม่', cls: 'primary', onClick: function (root) {
        var a = root.querySelector('#cpOld').value, b = root.querySelector('#cpNew').value, c = root.querySelector('#cpNew2').value;
        if (b.length < 8) return Promise.reject(new Error('รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร'));
        if (b !== c) return Promise.reject(new Error('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'));
        if (a === b) return Promise.reject(new Error('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'));
        return api('changePass', { oldPassword: a, newPassword: b }).then(function () {
          ok('เปลี่ยนรหัสผ่านเรียบร้อย กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่', 'บันทึกแล้ว');
          logout();
        });
      } }])
    });
  }

  function enter(b) {
    S.boot = b; S.me = b.me; S.cfg = b.settings; S.alerts = b.alerts || [];
    if (b.ver) { S.ver = b.ver; S.verAt = Date.now(); }
    $('boot').classList.add('hidden');
    $('login').classList.add('hidden');
    $('shell').classList.remove('hidden');
    $('meName').textContent = S.me.name || S.me.empCode;
    $('meAv').textContent = initials(S.me.name);
    $('meRole').textContent = S.me.roles.map(function (r) {
      return ({ admin: 'ผู้ดูแลระบบ', hr: 'ทรัพยากรบุคคล', head: 'ผู้บริหาร', doctor: 'ทันตแพทย์' })[r] || r;
    }).join(' · ');
    $('footLine').textContent = S.cfg.appFull + ' · รุ่น ' + S.cfg.version + ' build ' + S.cfg.build;
    drawBell();
    if (S.me.mustChange) { askChangePass(true); return; }
    var want = null;
    try { want = localStorage.getItem('smcdf.page'); } catch (e) { }
    go(want || 'daily');
  }

  function sessionExpired(m) {
    if (!S.token) return;
    try { localStorage.removeItem('smcdf.token'); } catch (e) { }
    S.token = null; S.me = null;
    stack.slice().forEach(function (r) { r._close(null); });
    $('shell').classList.add('hidden');
    showLogin();
    toast(m, { type: 'warn', title: 'กรุณาเข้าสู่ระบบอีกครั้ง' });
  }

  function logout() {
    try { localStorage.removeItem('smcdf.token'); } catch (e) { }
    cacheClear();
    S.token = null; S.me = null; S.ver = '';
    stack.slice().forEach(function (r) { r._close(null); });
    closePop();
    $('shell').classList.add('hidden');
    showLogin();
  }

  function about() {
    var c = S.cfg || {};
    dialog({ title: 'รายละเอียดระบบ', icon: 'info', size: 'wide',
      body: '<table><tbody>' +
        tr('ชื่อระบบ', c.appFull) + tr('หน่วยงาน', c.org) +
        tr('รุ่น', c.version + ' · build ' + c.build + ' (' + c.buildTh + ') · หน้าเว็บ ' + BUILD) +
        tr('กติกาที่ใช้', c.ruleMode === 'A' ? 'A — รับรอง DF ที่สูงที่สุดเพียงรายการเดียวต่อเคส' : 'B — รับรอง DF ที่สูงที่สุดประเภทละ 1 รายการ') +
        tr('เคส คือ', 'ผู้ป่วย 1 HN × 1 วัน × ทันตแพทย์ 1 ท่าน') +
        tr('กติกาเริ่มมีผล', dThai(c.ruleFrom)) +
        tr('ฐานคำนวณ', 'ยอดที่เก็บได้ = ชำระเงินสด (PAID) + เบิกประกันได้ (CLAIM)') +
        tr('ส่วนแบ่ง', 'แพทย์ ' + pct(c.sharePct) + ' · โรงพยาบาล ' + pct(1 - c.sharePct) + ' (ปัดเศษ 2 ตำแหน่งรายคน)') +
        tr('รหัสรายได้ HRMi', c.incomeCodePay + ' (ส่วนแพทย์) · ' + c.incomeCodeHos + ' (ส่วนโรงพยาบาล)') +
        tr('ติดต่อ', c.contactLine) +
        '</tbody></table>' +
        '<p class="note" style="margin-top:12px">ข้อมูลผู้ป่วยถูกปิดบางส่วนตามหลัก PDPA · การเปิดดู HN เต็มทำได้เฉพาะผู้ดูแลระบบและถูกบันทึกประวัติทุกครั้ง</p>',
      actions: [{ label: 'คู่มือการใช้งาน', icon: 'book', value: 'm' }, { label: 'ปิด', cls: 'primary', value: null }]
    }).then(function (v) { if (v === 'm') window.open(MANUAL, '_blank', 'noopener'); });
  }
  function tr(k, v) { return '<tr><th style="width:34%;position:static">' + esc(k) + '</th><td>' + esc(v) + '</td></tr>'; }

  /* ================= โหลดไลบรารีเมื่อใช้ ================= */
  var lazyP = {};
  function lazy(src, test) {
    if (test()) return Promise.resolve();
    if (lazyP[src]) return lazyP[src];
    lazyP[src] = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { delete lazyP[src]; rej(new Error('โหลดเครื่องมือไม่สำเร็จ — ตรวจการเชื่อมต่ออินเทอร์เน็ต')); };
      document.head.appendChild(s);
    });
    return lazyP[src];
  }
  function needXlsx() { return lazy('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', function () { return !!window.XLSX; }); }
  function needCanvas() { return lazy('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', function () { return !!window.html2canvas; }); }
  function needChart() { return lazy('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', function () { return !!window.Chart; }); }

  /* sheets: [{name, rows, cols:[ความกว้าง], merges:[...]}] */
  function saveSheet(sheets, filename) {
    return needXlsx().then(function () {
      var wb = XLSX.utils.book_new();
      sheets.forEach(function (s) {
        var ws = XLSX.utils.aoa_to_sheet(s.rows);
        if (s.cols) ws['!cols'] = s.cols.map(function (w) { return { wch: w }; });
        if (s.merges) ws['!merges'] = s.merges;
        XLSX.utils.book_append_sheet(wb, ws, s.name.substring(0, 31));
      });
      XLSX.writeFile(wb, filename);
      ok('บันทึกไฟล์ ' + filename + ' แล้ว — ดูในโฟลเดอร์ดาวน์โหลด', 'ส่งออกแล้ว');
    });
  }

  function copyText(text) {
    var done = function () { ok('คัดลอกข้อความแล้ว — วางในไลน์ได้เลย', 'คัดลอกแล้ว'); };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(done, function () { return legacyCopy(text) ? done() : showTextBox(text); });
    }
    if (legacyCopy(text)) { done(); return Promise.resolve(); }
    showTextBox(text); return Promise.resolve();
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    var okk = false; try { okk = document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(ta); return okk;
  }
  function showTextBox(text) {
    dialog({ title: 'คัดลอกข้อความ', sub: 'เครื่องนี้ไม่อนุญาตให้คัดลอกอัตโนมัติ — กดค้างที่ข้อความแล้วเลือก "คัดลอก"', icon: 'copy',
      body: '<textarea class="inp" rows="12" readonly>' + esc(text) + '</textarea>', actions: [{ label: 'ปิด', cls: 'primary' }] });
  }

  function isAndroid() { return /Android/i.test(navigator.userAgent); }
  function isIOS() { return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function inLine() { return /\bLine\//i.test(navigator.userAgent); }

  /* ================= ภาพรายงาน: คัดลอก / แชร์ / ดาวน์โหลด — ใช้ได้ทุกเครื่อง =================
     render: ฟังก์ชันคืน element ที่จะถ่ายภาพ · filename · opts: [{key,label,sub,on}] ตัวเลือกบนภาพ */
  function imageTool(o) {
    var optsHtml = (o.options || []).map(function (x) {
      return '<label class="chk"><input type="checkbox" data-opt="' + x.key + '"' + (x.on ? ' checked' : '') + '><span><b>' + esc(x.label) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</span></label>';
    }).join('');
    var state = {}; (o.options || []).forEach(function (x) { state[x.key] = !!x.on; });
    var blob = null, url = null;
    return dialog({
      title: o.title || 'ภาพรายงาน', icon: 'image', size: 'wide',
      sub: 'เลือกสิ่งที่จะแสดงบนภาพ แล้วกด คัดลอกภาพ เพื่อวางในไลน์ หรือ แชร์ / ดาวน์โหลด',
      body: (optsHtml ? '<div class="shot-opts">' + optsHtml + '</div>' : '') + '<div id="shotBox">' + loading('กำลังสร้างภาพ…') + '</div>' +
        (inLine() ? '<div class="msg info" style="margin-top:12px">' + ic('info') + '<span>เปิดอยู่ในแอปไลน์ — ถ้าคัดลอก/แชร์ไม่ได้ ให้กดค้างที่ภาพแล้วเลือกบันทึก หรือ <a href="' + esc(location.href.split('#')[0]) + (location.href.indexOf('?') < 0 ? '?' : '&') + 'openExternalBrowser=1" target="_blank">เปิดในเบราว์เซอร์</a></span></div>' : ''),
      actions: [
        { label: 'ดาวน์โหลด', icon: 'download', onClick: function () { if (!url) return false; var a = document.createElement('a'); a.href = url; a.download = o.filename; document.body.appendChild(a); a.click(); a.remove(); ok('บันทึกภาพแล้ว'); return false; } },
        { label: 'แชร์', icon: 'share', onClick: function () { return share().then(function () { return false; }); } },
        { label: 'คัดลอกภาพ', icon: 'copy', cls: 'primary', onClick: function () { return copyImg().then(function () { return false; }); } }
      ],
      onOpen: function (root) {
        root.querySelectorAll('[data-opt]').forEach(function (c) {
          c.onchange = function () { state[c.getAttribute('data-opt')] = c.checked; make(root); };
        });
        make(root);
      }
    });
    function make(root) {
      var box = root.querySelector('#shotBox');
      box.innerHTML = loading('กำลังสร้างภาพ…');
      blob = null;
      var el = o.render(state);
      var wrap = $('shareWrap'); wrap.innerHTML = ''; wrap.appendChild(el);
      needCanvas().then(function () {
        return html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      }).then(function (canvas) {
        url = canvas.toDataURL('image/png');
        box.innerHTML = '<img class="shot-img" src="' + url + '" alt="ภาพรายงาน">' +
          '<p class="note" style="margin:8px 0 0">' + (isAndroid() || isIOS() ? 'มือถือ: กด <b>แชร์</b> แล้วเลือกไลน์ หรือกดค้างที่ภาพเพื่อบันทึก' : 'คอมพิวเตอร์: กด <b>คัดลอกภาพ</b> แล้วไปกด Ctrl+V ในไลน์') + '</p>';
        return new Promise(function (res) { canvas.toBlob(function (b) { blob = b; res(); }, 'image/png'); });
      }).catch(function (e) { box.innerHTML = errBox(e); })
        .then(function () { wrap.innerHTML = ''; });
    }
    function copyImg() {
      if (!blob) return Promise.reject(new Error('ภาพยังสร้างไม่เสร็จ รอสักครู่'));
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write && window.isSecureContext) {
        return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          .then(function () { ok('คัดลอกภาพแล้ว — ไปที่ไลน์แล้วกด วาง (Ctrl+V)', 'คัดลอกภาพแล้ว'); })
          .catch(function () { return share(true); });
      }
      return share(true);
    }
    function share(fromCopy) {
      if (!blob) return Promise.reject(new Error('ภาพยังสร้างไม่เสร็จ รอสักครู่'));
      var file = new File([blob], o.filename, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: o.title || 'ภาพรายงาน' }).catch(function (e) { if (e && e.name !== 'AbortError') throw e; });
      }
      toast(fromCopy ? 'เครื่องนี้คัดลอกภาพอัตโนมัติไม่ได้ — กดค้างที่ภาพแล้วเลือก "คัดลอก" หรือ "บันทึกรูปภาพ"' : 'เครื่องนี้ไม่รองรับการแชร์ — กดดาวน์โหลด หรือกดค้างที่ภาพเพื่อบันทึก', { type: 'warn', ms: 6000 });
      return Promise.resolve();
    }
  }

  /* พิมพ์เฉพาะใบรายงาน: html = เนื้อหา .a4 หนึ่งใบหรือหลายใบ */
  function printA4(html) {
    var area = document.createElement('div');
    area.className = 'print-area';
    area.innerHTML = html;
    $('page').appendChild(area);
    document.body.classList.add('print-a4');
    var clean = function () { document.body.classList.remove('print-a4'); area.remove(); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean);
    setTimeout(function () { window.print(); setTimeout(clean, 1500); }, 80);
  }

  return {
    start: start, api: api, cached: cached, prefetch: prefetch, go: go, state: S, esc: esc, n0: n0, n2: n2, nk: nk, pct: pct,
    dThai: dThai, dtThai: dtThai, ymThai: ymThai, ymShort: ymShort, today: today, addDays: addDays, addMonths: addMonths, dow: dow,
    monthStart: monthStart, monthEnd: monthEnd, fyOf: fyOf, fyRange: fyRange, toast: toast, ok: ok, err: err,
    dialog: dialog, confirm: confirmBox, askPassword: askPassword, closeTop: closeTop, busyBtn: busyBtn, run: run,
    loading: loading, skeleton: skeleton, errBox: errBox, empty: empty, cardify: cardify, ic: ic, LOGO_SVG: LOGO_SVG,
    saveSheet: saveSheet, copyText: copyText, imageTool: imageTool, printA4: printA4, needChart: needChart,
    isAndroid: isAndroid, inLine: inLine, $: $, role: role, TH_MON: TH_MON, TH_MON_FULL: TH_MON_FULL, TH_DAY: TH_DAY, TH_DAY_S: TH_DAY_S,
    refreshAlerts: refreshAlerts, MANUAL: MANUAL, BUILD: BUILD
  };
})();
