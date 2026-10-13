/* app.js — แกนกลางของหน้าเว็บ: เรียก API, ล็อกอิน, เมนู, เครื่องมือช่วย */
var SMCDF = (function () {
  var BUILD = '2569-10-13.1';
  var S = { token: null, me: null, cfg: null, boot: null, page: 'daily', busy: false };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- เครื่องมือ ---------- */
  var TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var TH_MON_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var TH_DAY = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function n0(v) { return Number(v || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 }); }
  function n2(v) { return Number(v || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(v) { return (Number(v || 0) * 100).toFixed(1) + '%'; }
  /* วันที่ทั้งหมดคิดบนฐาน UTC เสมอ เพื่อไม่ให้โซนเวลาของเครื่องผู้ใช้ทำให้วันเลื่อน */
  function utcOf(iso) {
    var p = String(iso).split('-');
    return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function dThai(iso, full) {
    if (!iso) return '-';
    var p = String(iso).split('-'), d = new Date(utcOf(iso));
    var m = full ? TH_MON_FULL[Number(p[1]) - 1] : TH_MON[Number(p[1]) - 1];
    return (full ? TH_DAY[d.getUTCDay()] + 'ที่ ' : '') + Number(p[2]) + ' ' + m + ' ' + (Number(p[0]) + 543);
  }
  function ymThai(ym) {
    var p = String(ym).split('-');
    return TH_MON_FULL[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
  }
  function ymShort(ym) {
    var p = String(ym).split('-');
    return TH_MON[Number(p[1]) - 1] + ' ' + String(Number(p[0]) + 543).slice(-2);
  }
  function today() { var d = new Date(); return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10); }
  function addDays(iso, n) { return new Date(utcOf(iso) + n * 86400000).toISOString().slice(0, 10); }
  function monthStart(ym) { return ym + '-01'; }
  function monthEnd(ym) {
    var p = ym.split('-'), d = new Date(Date.UTC(Number(p[0]), Number(p[1]), 0));
    return ym + '-' + ('0' + d.getUTCDate()).slice(-2);
  }
  function fyOf(iso) { var p = String(iso).split('-'); return Number(p[1]) >= 10 ? Number(p[0]) + 544 : Number(p[0]) + 543; }

  function toast(msg, ms) {
    var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.add('hidden'); }, ms || 2600);
  }
  function modal(html) {
    $('modalBox').innerHTML = html;
    $('modal').classList.remove('hidden');
  }
  function closeModal() { $('modal').classList.add('hidden'); $('modalBox').innerHTML = ''; }
  $('modal') && $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });

  /* ---------- เรียกหลังบ้าน ---------- */
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function api(action, payload, opt) {
    opt = opt || {};
    var body = { action: action, token: S.token, payload: payload || {}, _rid: opt.rid || rid() };
    var isRead = /^(get|list|ping|login|bootstrap|backfillInfo)/.test(action);
    var tries = isRead ? 3 : 1, attempt = 0;

    function go() {
      attempt++;
      return fetch(API_URL, { method: 'POST', credentials: 'omit', body: JSON.stringify(body) })
        .then(function (r) { return r.text(); })
        .then(function (txt) {
          if (txt && txt.charAt(0) === '<') throw new Error('เซิร์ฟเวอร์ Google ไม่ว่างชั่วคราว');
          var j;
          try { j = JSON.parse(txt); } catch (e) { throw new Error('ข้อมูลที่ได้รับไม่ถูกต้อง'); }
          if (!j.ok) {
            var err = new Error(j.error || 'เกิดข้อผิดพลาด');
            err.mustChange = j.mustChange;
            err.server = true;              // หลังบ้านตอบกลับแล้วว่าไม่สำเร็จ — ไม่ต้องลองซ้ำ
            throw err;
          }
          if (j.build && j.build !== BUILD) showVerWarn(j.build);
          return j.data;
        })
        .catch(function (e) {
          if (!e.server && attempt < tries) return new Promise(function (res) { setTimeout(res, 700 * attempt); }).then(go);
          throw e;
        });
    }
    return go();
  }

  function showVerWarn(serverBuild) {
    var el = $('verWarn');
    el.textContent = 'หน้าเว็บเป็นรุ่น ' + BUILD + ' แต่หลังบ้านเป็นรุ่น ' + serverBuild +
      ' — กรุณากด Ctrl+F5 เพื่อโหลดหน้าเว็บใหม่ หรือแจ้งผู้ดูแลระบบให้ Deploy รุ่นล่าสุด';
    el.classList.remove('hidden');
  }

  function busy(on) {
    S.busy = on;
    document.body.style.cursor = on ? 'progress' : '';
  }

  function loading(msg) {
    return '<div class="empty">' + esc(msg || 'กำลังโหลดข้อมูล…') + '</div>';
  }
  function errBox(e) {
    return '<div class="msg err">' + esc(e && e.message ? e.message : e) + '</div>';
  }

  /* ---------- เมนู ---------- */
  var MENU = [
    { id: 'daily', icon: '▦', label: 'รายงานประจำวัน', roles: ['admin', 'hr', 'head', 'doctor'] },
    { id: 'audit', icon: '⚖', label: 'ทวนสอบ DF เกิน 1', roles: ['admin', 'hr', 'head', 'doctor'] },
    { id: 'month', icon: '▤', label: 'รอบเบิกรายเดือน', roles: ['admin', 'hr', 'head', 'doctor'] },
    { id: 'dash', icon: '◴', label: 'แดชบอร์ด', roles: ['admin', 'hr', 'head', 'doctor'] },
    { id: 'settings', icon: '⚙', label: 'ตั้งค่า', roles: ['admin'] }
  ];

  function can(ids) { return ids.some(function (r) { return S.me.roles.indexOf(r) >= 0; }); }

  function drawMenu() {
    $('menu').innerHTML = MENU.filter(function (m) { return can(m.roles); }).map(function (m) {
      return '<button data-go="' + m.id + '" class="' + (m.id === S.page ? 'on' : '') + '">' +
        '<span class="mk">' + m.icon + '</span>' + esc(m.label) + '</button>';
    }).join('');
    $('menu').querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () { go(b.getAttribute('data-go')); };
    });
  }

  function go(page) {
    if (!MENU.some(function (m) { return m.id === page && can(m.roles); })) page = 'daily';
    S.page = page;
    try { localStorage.setItem('smcdf.page', page); } catch (e) { }
    drawMenu();
    $('side').classList.remove('open');
    var def = MENU.filter(function (m) { return m.id === page; })[0];
    $('pageTitle').textContent = def ? def.label : '';
    var host = $('page');
    host.innerHTML = loading();
    var fn = ({ daily: PAGES.daily, audit: PAGES.audit, month: REPORTS.month, dash: REPORTS.dash, settings: REPORTS.settings })[page];
    Promise.resolve().then(function () { return fn(host); })
      .catch(function (e) { host.innerHTML = errBox(e); });
  }

  /* ---------- เริ่มทำงาน ---------- */
  function start() {
    try { S.token = localStorage.getItem('smcdf.token'); } catch (e) { }
    $('footLine').textContent = 'SMC DF ' + BUILD;
    $('btnAbout').onclick = about;
    $('btnSide').onclick = function () { $('side').classList.toggle('open'); };
    $('btnLogout').onclick = logout;
    $('liEye').onclick = function () {
      var i = $('liPass'); i.type = i.type === 'password' ? 'text' : 'password';
      $('liEye').textContent = i.type === 'password' ? 'ดู' : 'ซ่อน';
    };
    $('loginForm').onsubmit = function (e) { e.preventDefault(); doLogin(); };

    if (S.token) {
      api('bootstrap', {}).then(function (b) { enter(b); })
        .catch(function () { showLogin(); });
    } else showLogin();
  }

  function showLogin() {
    $('boot').classList.add('hidden');
    $('shell').classList.add('hidden');
    $('login').classList.remove('hidden');
    $('liCode').focus();
    api('ping', {}).then(function (d) {
      $('liConn').textContent = 'เชื่อมต่อระบบแล้ว · รุ่น ' + d.version + ' (' + d.buildTh + ')';
    }).catch(function () {
      $('liConn').textContent = 'เชื่อมต่อหลังบ้านไม่ได้ — ตรวจลิงก์ใน config.js หรือแจ้งผู้ดูแลระบบ';
    });
  }

  function doLogin() {
    var code = $('liCode').value.trim(), pass = $('liPass').value;
    var msg = $('liMsg');
    msg.classList.add('hidden');
    $('liGo').disabled = true; $('liGo').textContent = 'กำลังเข้าสู่ระบบ…';
    api('login', { empCode: code, password: pass })
      .then(function (d) {
        S.token = d.token;
        try { localStorage.setItem('smcdf.token', d.token); } catch (e) { }
        if (d.me.mustChange) return askChangePass(true);
        enter(d.boot);
      })
      .catch(function (e) {
        msg.textContent = e.message; msg.className = 'msg err';
      })
      .then(function () { $('liGo').disabled = false; $('liGo').textContent = 'เข้าสู่ระบบ'; });
  }

  function askChangePass(first) {
    modal('<h3>' + (first ? 'เข้าใช้งานครั้งแรก — กรุณาตั้งรหัสผ่านใหม่' : 'เปลี่ยนรหัสผ่าน') + '</h3>' +
      (first ? '<p class="note">รหัสผ่านเริ่มต้นคือรหัสเจ้าหน้าที่ของคุณ เพื่อความปลอดภัยกรุณาตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร</p>' : '') +
      '<label class="fld"><span>รหัสผ่านเดิม</span><input id="cpOld" type="password"></label>' +
      '<label class="fld"><span>รหัสผ่านใหม่</span><input id="cpNew" type="password"></label>' +
      '<label class="fld"><span>ยืนยันรหัสผ่านใหม่</span><input id="cpNew2" type="password"></label>' +
      '<div id="cpMsg" class="msg err hidden"></div>' +
      '<div class="btns" style="justify-content:flex-end">' +
      (first ? '' : '<button class="btn" data-x="close">ยกเลิก</button>') +
      '<button class="btn primary" id="cpGo">บันทึกรหัสผ่าน</button></div>');
    bindClose();
    $('cpGo').onclick = function () {
      var a = $('cpOld').value, b = $('cpNew').value, c = $('cpNew2').value, m = $('cpMsg');
      if (b !== c) { m.textContent = 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'; m.classList.remove('hidden'); return; }
      api('changePass', { oldPassword: a, newPassword: b })
        .then(function () {
          closeModal(); toast('เปลี่ยนรหัสผ่านเรียบร้อย กรุณาเข้าสู่ระบบใหม่');
          logout();
        })
        .catch(function (e) { m.textContent = e.message; m.classList.remove('hidden'); });
    };
  }

  function enter(b) {
    S.boot = b; S.me = b.me; S.cfg = b.settings;
    $('boot').classList.add('hidden');
    $('login').classList.add('hidden');
    $('shell').classList.remove('hidden');
    $('meName').textContent = S.me.name || S.me.empCode;
    $('meRole').textContent = S.me.roles.map(function (r) {
      return ({ admin: 'ผู้ดูแลระบบ', hr: 'ทรัพยากรบุคคล', head: 'ผู้บริหาร', doctor: 'ทันตแพทย์' })[r] || r;
    }).join(' · ');
    $('dataPill').textContent = b.lastDataDate ? 'ข้อมูลล่าสุด ' + dThai(b.lastDataDate) : 'ยังไม่มีข้อมูล';
    $('footLine').textContent = S.cfg.appFull + ' · ' + S.cfg.org + ' · รุ่น ' + S.cfg.version + ' build ' + S.cfg.build;
    if (S.me.mustChange) { askChangePass(true); return; }
    var want = null;
    try { want = localStorage.getItem('smcdf.page'); } catch (e) { }
    go(want || 'daily');
  }

  function logout() {
    try { localStorage.removeItem('smcdf.token'); } catch (e) { }
    S.token = null; S.me = null;
    closeModal();
    $('shell').classList.add('hidden');
    showLogin();
  }

  function about() {
    var c = S.cfg || {};
    modal('<h3>รายละเอียดระบบ</h3>' +
      '<table><tbody>' +
      tr('ชื่อระบบ', c.appFull) + tr('หน่วยงาน', c.org) +
      tr('รุ่น', c.version + ' · build ' + c.build + ' (' + c.buildTh + ')') +
      tr('หน้าเว็บ', BUILD) +
      tr('กติกาที่ใช้', c.ruleMode === 'A' ? 'A — รับรอง DF ที่สูงที่สุดเพียงรายการเดียวต่อเคส' : 'B — รับรอง DF ที่สูงที่สุดประเภทละ 1 รายการ') +
      tr('กติกาเริ่มมีผล', dThai(c.ruleFrom)) +
      tr('ส่วนแบ่ง', 'แพทย์ ' + pct(c.sharePct) + ' · โรงพยาบาล ' + pct(1 - c.sharePct)) +
      tr('รหัสรายได้ HRMi', c.incomeCodePay + ' (ส่วนแพทย์) · ' + c.incomeCodeHos + ' (ส่วนโรงพยาบาล)') +
      tr('ฐานคำนวณ', 'ยอดที่เก็บได้ = ชำระเงินสด (PAID) + เบิกประกันได้ (CLAIM)') +
      tr('ติดต่อ', c.contactLine) +
      '</tbody></table>' +
      '<p class="note" style="margin-top:12px">ข้อมูลผู้ป่วยถูกปิดบางส่วนตามหลัก PDPA · การเปิดดู HN เต็มทำได้เฉพาะผู้ดูแลระบบและถูกบันทึกประวัติทุกครั้ง</p>' +
      '<div class="btns" style="justify-content:flex-end;margin-top:12px">' +
      '<button class="btn" data-x="pass">เปลี่ยนรหัสผ่าน</button>' +
      '<button class="btn primary" data-x="close">ปิด</button></div>');
    bindClose();
    $('modalBox').querySelector('[data-x="pass"]').onclick = function () { closeModal(); askChangePass(false); };
  }
  function tr(k, v) { return '<tr><th style="width:38%">' + esc(k) + '</th><td>' + esc(v) + '</td></tr>'; }

  function bindClose() {
    $('modalBox').querySelectorAll('[data-x="close"]').forEach(function (b) { b.onclick = closeModal; });
  }

  /* ---------- โหลดไลบรารีเมื่อใช้ ---------- */
  function lazy(src, test) {
    if (test()) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('โหลดเครื่องมือไม่สำเร็จ — ตรวจการเชื่อมต่ออินเทอร์เน็ต')); };
      document.head.appendChild(s);
    });
  }
  function needXlsx() {
    return lazy('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', function () { return !!window.XLSX; });
  }
  function needCanvas() {
    return lazy('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', function () { return !!window.html2canvas; });
  }

  function saveSheet(sheets, filename) {
    return needXlsx().then(function () {
      var wb = XLSX.utils.book_new();
      sheets.forEach(function (s) {
        var ws = XLSX.utils.aoa_to_sheet(s.rows);
        if (s.cols) ws['!cols'] = s.cols.map(function (w) { return { wch: w }; });
        XLSX.utils.book_append_sheet(wb, ws, s.name.substring(0, 31));
      });
      XLSX.writeFile(wb, filename);
      toast('บันทึกไฟล์ ' + filename + ' แล้ว');
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { toast('คัดลอกข้อความแล้ว'); });
    }
    var ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('คัดลอกข้อความแล้ว'); } catch (e) { toast('คัดลอกไม่สำเร็จ'); }
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function isAndroid() { return /Android/i.test(navigator.userAgent); }
  function inLine() { return /Line/i.test(navigator.userAgent); }

  function shotToImage(el, filename) {
    return needCanvas().then(function () {
      return html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    }).then(function (canvas) {
      var url = canvas.toDataURL('image/png');
      modal('<h3>ภาพรายงาน</h3>' +
        '<p class="note">' + (isAndroid()
          ? 'บนแอนดรอยด์ให้ <b>กดค้างที่ภาพ</b> แล้วเลือกบันทึกหรือแชร์'
          : 'กดปุ่มดาวน์โหลด หรือกดค้างที่ภาพเพื่อบันทึก') + '</p>' +
        '<img src="' + url + '" style="width:100%;border:1px solid var(--line);border-radius:8px">' +
        '<div class="btns" style="justify-content:flex-end;margin-top:12px">' +
        '<a class="btn primary" download="' + filename + '" href="' + url + '">ดาวน์โหลดภาพ</a>' +
        '<button class="btn" data-x="close">ปิด</button></div>');
      bindClose();
    });
  }

  return {
    start: start, api: api, go: go, state: S, esc: esc, n0: n0, n2: n2, pct: pct,
    dThai: dThai, ymThai: ymThai, ymShort: ymShort, today: today, addDays: addDays,
    monthStart: monthStart, monthEnd: monthEnd, fyOf: fyOf, toast: toast, modal: modal,
    closeModal: closeModal, bindClose: bindClose, loading: loading, errBox: errBox,
    saveSheet: saveSheet, copyText: copyText, shotToImage: shotToImage, busy: busy,
    isAndroid: isAndroid, inLine: inLine, $: $, TH_MON: TH_MON
  };
})();
