/* pages.js — หน้ารายงานประจำวัน และหน้าทวนสอบ DF เกิน 1 รายการ */
var PAGES = (function () {
  var A = SMCDF, $ = A.$, esc = A.esc, n0 = A.n0, n2 = A.n2, pct = A.pct, ic = A.ic;
  var cur = { date: null, data: null, ym: null, cal: null, staff: null };

  function kpi(k, v, s, cls, icon, tip) {
    return '<div class="kpi ' + (cls || '') + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><div class="k">' + (icon ? ic(icon) : '') + esc(k) + '</div>' +
      '<div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  }
  function isAdmin() { return A.role('admin'); }
  function canEdit() { return A.role('admin') || A.role('hr'); }
  function isDoctorOnly() { return A.role('doctor') && !A.role('admin') && !A.role('hr') && !A.role('head'); }

  /* ================= รายงานประจำวัน ================= */
  function daily(host, arg) {
    var d = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : (cur.date || A.state.boot.lastDataDate || A.today());
    cur.date = d; cur.ym = cur.ym && cur.ym === d.slice(0, 7) ? cur.ym : d.slice(0, 7);
    host.innerHTML =
      '<div class="panel tool no-print"><div class="panel-b" style="display:block">' +
      '<div class="daynav" style="margin-bottom:8px">' +
      '<button class="btn sm" id="mPrev" aria-label="เดือนก่อน">' + ic('left') + '</button>' +
      '<b class="date-lbl" id="mLbl"></b>' +
      '<button class="btn sm" id="mNext" aria-label="เดือนถัดไป">' + ic('right') + '</button>' +
      '<input type="date" id="dDate" class="inp sm" value="' + esc(d) + '" aria-label="เลือกวันที่">' +
      '<button class="btn sm ghost" id="dToday">วันนี้</button>' +
      '<span class="spacer"></span>' +
      '<span class="cache-note" id="cacheNote"></span>' +
      '</div>' +
      '<div class="strip" id="strip"><span class="none">' + '<span class="spin"></span> กำลังโหลดวันที่มีคลินิก…</span></div>' +
      '<div class="btns" style="margin-top:8px">' +
      (canEdit() ? '<button class="btn sm" id="dSync">' + ic('sync') + 'ดึงยอดใหม่</button>' : '') +
      '<span class="spacer"></span>' +
      '<button class="btn sm" id="dLine">' + ic('copy') + 'คัดลอกข้อความ</button>' +
      '<button class="btn sm primary" id="dImg">' + ic('image') + 'ภาพรายงาน</button>' +
      '<button class="btn sm accent" id="dPrint">' + ic('print') + 'พิมพ์ A4</button>' +
      '</div></div></div><div id="dBody">' + A.skeleton(5) + '</div>';

    $('mPrev').onclick = function () { cur.ym = A.addMonths(cur.ym, -1); loadCal(true); };
    $('mNext').onclick = function () { cur.ym = A.addMonths(cur.ym, 1); loadCal(true); };
    $('dDate').onchange = function () { if (this.value) pick(this.value); };
    $('dToday').onclick = function () { pick(A.today()); };
    $('dPrint').onclick = function () {
      if (!cur.data || !cur.data.exists) return A.toast('ยังไม่มีข้อมูลของวันที่เลือก', { type: 'warn' });
      A.printA4(a4(cur.data));
    };
    $('dLine').onclick = function () {
      if (!cur.data || !cur.data.exists) return A.toast('ยังไม่มีข้อมูลของวันที่เลือก', { type: 'warn' });
      lineDialog();
    };
    $('dImg').onclick = function () {
      if (!cur.data || !cur.data.exists) return A.toast('ยังไม่มีข้อมูลของวันที่เลือก', { type: 'warn' });
      shareImage();
    };
    if ($('dSync')) $('dSync').onclick = function () {
      var b = this;
      A.run(b, function () { return A.api('syncNow', { from: cur.date, to: cur.date }); },
        { busy: 'กำลังดึงยอด…', ok: function (r) { return r.changed ? 'ยอดเปลี่ยน — อัปเดตแล้ว ' + r.rows + ' รายการ' : 'ยอดยังเหมือนเดิม (' + r.rows + ' รายการ)'; } })
        .then(function () { load(true); loadCal(false); }, function () { });
    };

    loadCal(false);
    return load(false);

    function pick(date) {
      cur.date = date; $('dDate').value = date;
      if (date.slice(0, 7) !== cur.ym) { cur.ym = date.slice(0, 7); loadCal(false); } else drawStrip();
      load(false);
    }

    function loadCal(jump) {
      $('mLbl').textContent = A.ymThai(cur.ym);
      var ym = cur.ym;
      return A.cached('getCalendar', { ym: ym }, function (c) {
        if (ym !== cur.ym) return;
        cur.cal = c; drawStrip();
        if (jump && c.days.length && cur.date.slice(0, 7) !== ym) pick(c.days[c.days.length - 1].date);
      }).catch(function (e) { $('strip').innerHTML = '<span class="none">' + esc(e.message) + '</span>'; });
    }

    function drawStrip() {
      var c = cur.cal, el = $('strip');
      if (!el || !c) return;
      if (!c.days.length) { el.innerHTML = '<span class="none">ไม่มีวันที่มีคลินิกในเดือนนี้ (หรือยังไม่ได้ดึงข้อมูล)</span>'; return; }
      el.innerHTML = c.days.map(function (x) {
        return '<button data-day="' + x.date + '" class="' + (x.date === cur.date ? 'on ' : '') + (x.dropCases ? 'has-drop' : '') + '" title="' +
          esc(A.dThai(x.date, true) + (x.cases != null ? ' · ' + x.cases + ' เคส' : '')) + '"><small>' + A.TH_DAY_S[A.dow(x.date)] + '</small><b>' + Number(x.date.slice(8)) + '</b>' +
          '<i>' + (x.cases != null ? x.cases + ' เคส' : (x.items || '') + ' รายการ') + '</i></button>';
      }).join('');
      el.querySelectorAll('[data-day]').forEach(function (b) { b.onclick = function () { pick(b.getAttribute('data-day')); }; });
      var on = el.querySelector('.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    }

    function load(force) {
      var date = cur.date;
      $('cacheNote').innerHTML = '';
      if (!$('dBody').querySelector('.kpis')) $('dBody').innerHTML = A.skeleton(5);
      return A.cached('getDaily', { date: date }, function (data, fromCache, fresh, same) {
        if (date !== cur.date) return;
        cur.data = data;
        if (fromCache && !fresh) $('cacheNote').innerHTML = '<span class="spin"></span>แสดงข้อมูลที่จำไว้ · กำลังตรวจยอดล่าสุด';
        else $('cacheNote').innerHTML = data.summary && data.summary.apiAt ? ic('check') + 'ยอดล่าสุด ณ ' + esc(String(data.summary.apiAt).slice(11, 16)) + ' น.' : '';
        if (same) return;
        renderDaily($('dBody'), data);
        loadStaff(date);
        // โหลดวันก่อน/ถัดไปเก็บไว้ล่วงหน้า เปิดแล้วขึ้นทันที
        if (!fromCache && cur.cal) {
          var ds = cur.cal.days.map(function (x) { return x.date; }), i = ds.indexOf(date);
          [ds[i - 1], ds[i + 1]].forEach(function (x) { if (x) setTimeout(function () { A.prefetch('getDaily', { date: x }); }, 400); });
        }
      }, { force: force, loud: force }).catch(function (e) {
        $('dBody').innerHTML = A.errBox(e, true);
        var r = $('dBody').querySelector('[data-retry]'); if (r) r.onclick = function () { load(true); };
      });
    }
  }

  function renderDaily(host, d) {
    if (!d.exists) {
      host.innerHTML = '<div class="panel">' + A.empty('ไม่มีข้อมูลค่าธรรมเนียมแพทย์ของ' + A.dThai(d.date, true),
        'อาจเป็นวันที่คลินิกไม่เปิด หรือยอดยังไม่เข้าระบบสารสนเทศ · เลือกวันอื่นจากแถบด้านบน', 'cal') + '</div>' + pendingMsg(d);
      return;
    }
    var s = d.summary, c = d.settings;
    var html = '<div class="kpis">' +
      kpi('ยอดรับรองจ่าย', n2(s.keep), 'แพทย์ ' + n2(s.pay80) + ' · รพ. ' + n2(s.hos20), 'hero', 'money', 'ยอดที่จ่ายได้ตามกติกา (แบ่งแพทย์ ' + pct(c.sharePct) + ')') +
      kpi('ทันตแพทย์ออกตรวจ', n0(s.doctors) + '<small>ท่าน</small>', '', '', 'tooth') +
      kpi('จำนวนเคส', n0(s.cases) + '<small>เคส</small>', n0(s.items) + ' รายการ DF', '', 'cases', 'เคส = ผู้ป่วย 1 HN × 1 วัน × ทันตแพทย์ 1 ท่าน') +
      kpi('ยอดที่เก็บได้', n2(s.base), 'ชำระเงินสด + เบิกประกัน', '', 'money') +
      kpi('ยอดที่ระงับ', n2(s.drop), s.dropCases ? s.dropCases + ' เคสคีย์ DF เกิน 1' : 'ไม่มีรายการระงับ', s.drop > 0 ? 'bad' : 'ok', 'cut') +
      '</div>';

    if (!d.ruleActive) html += '<div class="msg info">' + ic('info') + '<span>วันนี้อยู่ก่อนวันที่กติกาเริ่มมีผล (' + A.dThai(c.ruleFrom) + ') ระบบจึงรับรองทุกรายการตามที่ระบบโรงพยาบาลจ่ายจริง</span></div>';
    else if (s.drop > 0) html += '<div class="msg warn">' + ic('warn') + '<span>วันนี้มี <b>' + s.dropCases + ' เคส</b> ที่คีย์ DF มากกว่า 1 รายการ ระบบรับรองเฉพาะรายการที่สูงที่สุดและระงับ <b>' + n2(s.drop) + ' บาท</b> — ดูเหตุผลในหัวข้อเคสที่คีย์เกินด้านล่าง</span></div>';
    html += pendingMsg(d);

    /* ตารางรายแพทย์ */
    html += '<div class="panel"><div class="panel-h"><h3>' + ic('tooth') + 'สรุปรายทันตแพทย์</h3><span class="spacer"></span><span class="tag">' + n0(d.byDoctor.length) + ' ท่าน</span></div>' +
      '<div class="panel-b flush wrap-x"><table class="rt"><thead><tr>' +
      '<th>ทันตแพทย์</th><th class="n">เคส</th><th class="n">ยอดที่เก็บได้</th><th class="n">ระงับ</th><th class="n">รับรอง</th>' +
      '<th class="n">แพทย์ ' + pct(c.sharePct) + '</th><th class="n">รพ. ' + pct(1 - c.sharePct) + '</th>' +
      '</tr></thead><tbody>' +
      d.byDoctor.map(function (x) {
        return '<tr><td>' + esc(x.name) + '<span class="sub-t">' + esc(x.dct) + (x.items !== x.cases ? ' · ' + x.items + ' รายการ' : '') + '</span></td>' +
          '<td class="n">' + n0(x.cases) + '</td><td class="n">' + n2(x.base) + '</td>' +
          '<td class="n">' + (x.drop > 0 ? '<span class="badge bad">' + n2(x.drop) + '</span>' : '-') + '</td>' +
          '<td class="n"><b>' + n2(x.keep) + '</b></td><td class="n">' + n2(x.pay80) + '</td><td class="n">' + n2(x.hos20) + '</td></tr>';
      }).join('') +
      '<tr class="sum"><td>รวม</td><td class="n">' + n0(s.cases) + '</td><td class="n">' + n2(s.base) + '</td><td class="n">' + n2(s.drop) + '</td>' +
      '<td class="n">' + n2(s.keep) + '</td><td class="n">' + n2(s.pay80) + '</td><td class="n">' + n2(s.hos20) + '</td></tr>' +
      '</tbody></table></div></div>';

    /* เคสที่ถูกระงับ */
    if (d.dropped.length) {
      html += '<div class="panel"><div class="panel-h"><h3>' + ic('cut') + 'เคสที่คีย์ DF เกิน 1 รายการ</h3><span class="spacer"></span><span class="tag bad">' + d.dropped.length + ' เคส</span>' +
        '<div class="sub">แถวสีแดง = รายการที่ระงับ · เคสเดียวกันรับรองเฉพาะรายการที่ยอดสูงที่สุด</div></div>' +
        '<div class="panel-b flush wrap-x">' + caseTable(d.dropped) + '</div></div>';
    }

    html += '<div class="g2">';
    /* สิทธิ + รหัส */
    html += '<div class="panel"><div class="panel-h"><h3>' + ic('users') + 'สิทธิการรักษา</h3><span class="spacer"></span><span class="tag">นับเป็นเคส</span></div><div class="panel-b">' +
      CH.hbars(d.rights.map(function (r, i) {
        return { label: r.grp, a: r.cases, ca: CH.palette()[i % 7], value: n0(r.cases) + ' เคส · ' + pct(s.cases ? r.cases / s.cases : 0), tip: n2(r.base) + ' บาท' };
      })) +
      '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line)"><div class="note" style="margin-bottom:8px">รหัส DF ที่คีย์วันนี้</div>' +
      '<div class="row">' + d.codes.map(function (k) {
        return '<span class="tag" title="' + esc(k.label) + '">' + esc(k.charge) + ' · ' + n0(k.items) + ' รายการ</span>';
      }).join('') + '</div></div></div></div>';
    /* เจ้าหน้าที่ (โหลดแยก) */
    html += '<div class="panel" id="staffPanel"><div class="panel-h"><h3>' + ic('staff') + 'เจ้าหน้าที่ปฏิบัติงาน</h3><span class="spacer"></span><span id="stTag"></span>' +
      (canEdit() ? '<button class="btn sm" id="stEdit">' + ic('edit') + 'แก้ไขรายชื่อ</button>' : '') +
      '</div><div class="panel-b flush" id="stBody">' + A.loading('กำลังดึงตารางเวรจาก SMC Duty…') + '</div></div>';
    html += '</div>';

    /* เคสทั้งหมด */
    html += '<details class="panel"><summary class="panel-h"><h3>' + ic('code') + 'รายการเคสทั้งหมดของวันนี้</h3><span class="tag">' + d.cases.length + ' เคส</span>' + ic('down', 'chev') + '</summary>' +
      '<div class="panel-b flush wrap-x">' + caseTable(d.cases) + '</div></details>';

    /* ใบ A4 */
    html += '<details class="panel no-print"><summary class="panel-h"><h3>' + ic('print') + 'ตัวอย่างใบรายงาน A4</h3>' + ic('down', 'chev') + '</summary>' +
      '<div class="a4-scroll">' + a4(d) + '</div></details>';

    host.innerHTML = html;
    A.cardify(host);
    bindCases(host);
    if ($('stEdit')) $('stEdit').onclick = editStaff;
  }

  function pendingMsg(d) {
    if (!d.pending) return '';
    return '<div class="msg warn">' + ic('warn') + '<span>มี <b>' + d.pending.items + ' รายการ</b> ที่ใช้รหัส DF ใหม่ (' + esc(d.pending.codes.join(', ')) +
      ') ซึ่งยังไม่นับจ่าย — รอผู้ดูแลระบบยืนยันที่ ตั้งค่า › รหัส DF</span>' +
      (isAdmin() ? '<button class="btn sm" onclick="SMCDF.go(\'settings:codes\')">ไปยืนยัน</button>' : '') + '</div>';
  }

  /* ---------- เจ้าหน้าที่ ---------- */
  function loadStaff(date, force) {
    var body = $('stBody'); if (!body) return;
    A.api('getStaff', { date: date, force: !!force }, { silent: true }).then(function (st) {
      if (date !== cur.date || !$('stBody')) return;
      cur.staff = st;
      drawStaff(st);
      var a4box = document.querySelector('.a4-scroll'); if (a4box && cur.data) a4box.innerHTML = a4(cur.data);
    }).catch(function (e) { if ($('stBody')) $('stBody').innerHTML = '<div class="panel-b">' + A.errBox(e) + '</div>'; });
  }
  function staffList(st) { st = st || {}; return (st.manual && st.manual.length ? st.manual : (st.list || [])); }
  function drawStaff(st) {
    var list = staffList(st), body = $('stBody'), tag = $('stTag');
    tag.innerHTML = st.manual && st.manual.length ? '<span class="tag info">คีย์เอง</span>' : st.ok ? '<span class="tag ok">จาก SMC Duty</span>' : '<span class="tag">ยังไม่เชื่อมต่อ</span>';
    var warn = st.warn ? '<div class="panel-b" style="padding-bottom:0"><div class="msg warn" style="margin:0">' + ic('warn') + '<span>' + esc(st.warn) + '</span></div></div>' : '';
    if (!list.length) {
      body.innerHTML = warn + A.empty(st.ok ? 'ไม่มีเจ้าหน้าที่ทันตกรรมในตารางเวรวันนี้' : (st.reason || 'ยังไม่ได้เชื่อมต่อระบบตารางเวร'),
        canEdit() ? 'กด "แก้ไขรายชื่อ" เพื่อคีย์รายชื่อเอง' : '', 'staff');
      return;
    }
    body.innerHTML = warn + '<div class="wrap-x"><table class="rt"><thead><tr><th>ชื่อ-นามสกุล</th><th>ตำแหน่ง</th><th>ช่วงเวร</th><th>รหัส</th></tr></thead><tbody>' +
      list.map(function (x) {
        return '<tr><td>' + esc(x.fullName || x.name || '-') + '</td><td>' + esc(x.positionName || '-') + '</td><td>' + esc(x.slot || '-') + '</td><td>' + esc(x.empCode || '-') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    A.cardify(body);
  }
  function editStaff() {
    var man = (cur.staff && cur.staff.manual) || [];
    var base = man.length ? man : ((cur.staff && cur.staff.list) || []);
    A.dialog({
      title: 'แก้ไขรายชื่อเจ้าหน้าที่ ' + A.dThai(cur.date), icon: 'staff',
      sub: 'ใช้เมื่อตารางเวรไม่ครบหรือมีการสลับเวร · ถ้าบันทึกรายชื่อไว้ ระบบจะใช้รายชื่อนี้แทนตารางเวรจาก SMC Duty',
      body: '<p class="note">พิมพ์บรรทัดละ 1 คน รูปแบบ <b>ตำแหน่ง | ชื่อ-นามสกุล | รหัส</b> · ลบทั้งหมดแล้วบันทึก = กลับไปใช้ตารางเวรจาก SMC Duty</p>' +
        '<textarea id="stTx" class="inp" rows="8" placeholder="ผู้ช่วยทันตแพทย์ | สมหญิง ใจดี | 5601234">' +
        esc(base.map(function (x) { return [x.positionName || '', x.fullName || '', x.empCode || ''].join(' | '); }).join('\n')) + '</textarea>',
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึกรายชื่อ', cls: 'primary', onClick: function (root) {
        var list = root.querySelector('#stTx').value.split('\n').map(function (l) {
          var p = l.split('|').map(function (x) { return x.trim(); });
          if (!p[0] && !p[1]) return null;
          return { positionName: p[0] || '', fullName: p[1] || '', empCode: p[2] || '', note: '' };
        }).filter(Boolean);
        return A.api('saveStaff', { date: cur.date, list: list }).then(function () {
          A.ok(list.length ? 'บันทึกรายชื่อ ' + list.length + ' คนแล้ว' : 'กลับไปใช้ตารางเวรจาก SMC Duty แล้ว', 'บันทึกแล้ว');
          loadStaff(cur.date, true);
        });
      } }]
    });
  }

  /* ---------- ตารางเคส ---------- */
  function caseTable(cases) {
    return '<table class="rt cases"><thead><tr><th>ผู้ป่วย (HN)</th><th>ทันตแพทย์</th><th>สิทธิ</th>' +
      '<th>รายการ DF ในเคสนี้</th><th class="n">รับรอง</th><th class="n">ระงับ</th></tr></thead><tbody>' +
      cases.map(function (c) {
        return '<tr class="' + (c.drop > 0 ? 'has-cut' : '') + '"><td>' + esc(c.hn) + '<span class="sub-t">' + esc(A.dThai(c.date)) + ' · ' + esc(c.pattern) + '</span></td>' +
          '<td>' + esc(c.dctName) + '</td><td>' + esc(c.pttype) + '</td>' +
          '<td class="items">' + c.items.map(function (it) {
            return '<div class="it ' + (it.keep ? 'k' : 'd') + '">' +
              '<div class="it-h"><span class="badge ' + (it.keep ? 'ok' : 'bad') + '">' + (it.keep ? 'รับรอง' : 'ระงับ') + '</span>' +
              '<b class="lbl">' + esc(it.label) + '</b><span class="sub-t">' + esc(it.charge) + '</span>' +
              '<span class="amt">' + n2(it.base) + (Number(it.total) !== Number(it.base) ? '<span class="sub-t">เรียกเก็บ ' + n2(it.total) + '</span>' : '') + '</span></div>' +
              (it.why ? '<div class="why">' + esc(it.why) + '</div>' : '') +
              (isAdmin() ? '<div class="no-print it-a">' +
                (it.override
                  ? '<button class="btn sm" data-ov-clear="' + esc(it.id) + '">' + ic('x') + 'ยกเลิกข้อยกเว้น</button>'
                  : (it.keep ? (c.nItems > 1 ? '<button class="btn sm ghost" data-ov-deny="' + esc(it.id) + '">ระงับรายการนี้</button>' : '')
                    : '<button class="btn sm" data-ov-allow="' + esc(it.id) + '">' + ic('unlock') + 'ปลดล็อกให้จ่าย</button>')) +
                '</div>' : '') +
              '</div>';
          }).join('') + '</td>' +
          '<td class="n"><b>' + n2(c.keep) + '</b></td><td class="n">' + (c.drop ? '<span class="badge bad">' + n2(c.drop) + '</span>' : '-') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function bindCases(host) {
    ['allow', 'deny', 'clear'].forEach(function (act) {
      host.querySelectorAll('[data-ov-' + act + ']').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-ov-' + act);
          if (act === 'clear') {
            return A.confirm({ title: 'ยกเลิกข้อยกเว้นรายการนี้?', sub: 'รายการจะกลับไปใช้ผลตามกติกาตามเดิม', ok: 'ยกเลิกข้อยกเว้น',
              onOk: function () { return doOverride(id, 'clear', ''); } });
          }
          A.dialog({
            title: act === 'allow' ? 'ปลดล็อกให้จ่ายรายการนี้' : 'ระงับรายการนี้', icon: act === 'allow' ? 'unlock' : 'cut', tone: 'warn',
            sub: 'ระบบยึดกติกาเป็นหลัก การปลดล็อกเป็นข้อยกเว้นรายกรณี ต้องระบุเหตุผลและจะถูกบันทึกประวัติไว้',
            body: '<label class="fld"><span>เหตุผล (อย่างน้อย 5 ตัวอักษร)</span><textarea id="ovR" class="inp" rows="3" placeholder="เช่น ตรวจเวชระเบียนแล้วพบว่าทำหัตถการจริง 2 อย่าง"></textarea></label>',
            actions: [{ label: 'ยกเลิก', value: null }, { label: 'บันทึก', cls: 'primary', onClick: function (root) {
              var r = root.querySelector('#ovR').value.trim();
              if (r.length < 5) return Promise.reject(new Error('กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร'));
              return doOverride(id, act, r);
            } }]
          });
        };
      });
    });
  }

  function doOverride(id, action, reason) {
    return A.api('setOverride', { chargeId: id, action: action, reason: reason }).then(function () {
      A.ok(action === 'allow' ? 'ปลดล็อกแล้ว ยอดคำนวณใหม่เรียบร้อย' : action === 'deny' ? 'ระงับรายการแล้ว' : 'ยกเลิกข้อยกเว้นแล้ว', 'บันทึกแล้ว');
      A.go(A.state.page, A.state.page === 'daily' ? cur.date : A.state.arg);
    });
  }

  /* ---------- ใบรายงาน A4 ---------- */
  function signBlock(c) {
    return '<div class="sign"><div><div class="cap">' + esc(c.signer1Label || 'ผู้ตรวจสอบ') + '</div><div class="ln"></div>(' + esc(c.signer1Name || '.................................') + ')<br>' + esc(c.signer1Title || '') + '</div>' +
      '<div><div class="cap">' + esc(c.signer2Label || '') + '</div><div class="ln"></div>(' + esc(c.signer2Name || '.................................') + ')<br>' + esc(c.signer2Title || '') + '</div></div>';
  }
  function a4(d) {
    var s = d.summary, c = d.settings;
    var staff = staffList(cur.date === d.date ? cur.staff : null);
    return '<div class="a4">' +
      '<div class="a4-top"><span>' + esc(c.org) + '</span><span>พิมพ์ ' + esc(A.dThai(A.today())) + '</span></div>' +
      '<h2>' + esc(c.reportTitle) + '</h2>' +
      '<div class="a4-sub">ประจำ' + esc(A.dThai(d.date, true)) + '</div>' +
      '<table><tbody><tr>' +
      '<th style="width:25%">ทันตแพทย์ออกตรวจ</th><td style="width:25%">' + n0(s.doctors) + ' ท่าน</td>' +
      '<th style="width:25%">จำนวนเคส</th><td>' + n0(s.cases) + ' เคส (' + n0(s.items) + ' รายการ)</td></tr>' +
      '<tr><th>ยอดที่เก็บได้</th><td class="n">' + n2(s.base) + ' บาท</td><th>ยอดรับรองจ่าย</th><td class="n">' + n2(s.keep) + ' บาท</td></tr>' +
      '<tr><th>ส่วนแพทย์ ' + pct(c.sharePct) + '</th><td class="n">' + n2(s.pay80) + ' บาท</td><th>ส่วนโรงพยาบาล ' + pct(1 - c.sharePct) + '</th><td class="n">' + n2(s.hos20) + ' บาท</td></tr>' +
      (s.drop > 0 ? '<tr><th>ยอดที่ระงับตามกติกา</th><td colspan="3">' + n2(s.drop) + ' บาท จาก ' + s.dropCases + ' เคสที่คีย์ DF เกิน 1 รายการ</td></tr>' : '') +
      '</tbody></table>' +
      '<div class="sec-t">รายละเอียดรายทันตแพทย์</div>' +
      '<table><thead><tr><th>ลำดับ</th><th>ทันตแพทย์</th><th>เคส</th><th>ยอดที่เก็บได้</th><th>ระงับ</th><th>รับรอง</th><th>แพทย์ ' + pct(c.sharePct) + '</th><th>รพ.</th></tr></thead><tbody>' +
      d.byDoctor.map(function (x, i) {
        return '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(x.name) + '</td><td class="c">' + n0(x.cases) + '</td>' +
          '<td class="n">' + n2(x.base) + '</td><td class="n">' + (x.drop ? n2(x.drop) : '-') + '</td><td class="n">' + n2(x.keep) + '</td>' +
          '<td class="n">' + n2(x.pay80) + '</td><td class="n">' + n2(x.hos20) + '</td></tr>';
      }).join('') +
      '<tr class="sum"><td colspan="2" class="c">รวม</td><td class="c">' + n0(s.cases) + '</td><td class="n">' + n2(s.base) + '</td><td class="n">' + (s.drop ? n2(s.drop) : '-') + '</td>' +
      '<td class="n">' + n2(s.keep) + '</td><td class="n">' + n2(s.pay80) + '</td><td class="n">' + n2(s.hos20) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="sec-t">สิทธิการรักษา</div>' +
      '<table><thead><tr><th>กลุ่มสิทธิ</th><th>เคส</th><th>รายการ</th><th>ยอดที่เก็บได้</th></tr></thead><tbody>' +
      d.rights.map(function (r) {
        return '<tr><td>' + esc(r.grp) + '</td><td class="c">' + n0(r.cases) + '</td><td class="c">' + n0(r.items) + '</td><td class="n">' + n2(r.base) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      (staff.length ? '<div class="sec-t">เจ้าหน้าที่ปฏิบัติงาน</div><div style="font-size:12px">' +
        staff.map(function (x) { return esc((x.fullName || '') + (x.positionName ? ' (' + x.positionName + ')' : '')); }).join(' · ') + '</div>' : '') +
      signBlock(c) +
      '<div class="a4-foot">ผู้จัดทำรายงาน ' + esc(A.state.me.name) + (A.state.me.title ? ' (' + esc(A.state.me.title) + ')' : '') +
      ' · ข้อมูล ณ ' + esc(A.dtThai(s.apiAt)) + ' · ' + esc(c.contactLine) + '</div>' +
      '</div>';
  }

  /* ---------- ข้อความไลน์ ---------- */
  function lineText(d, o) {
    var s = d.summary;
    var L = [];
    L.push('📋 รายงานคลินิกทันตกรรมนอกเวลา');
    L.push(A.dThai(d.date, true));
    L.push('ทันตแพทย์ ' + n0(s.doctors) + ' ท่าน · ' + n0(s.cases) + ' เคส');
    if (o.money) {
      L.push('ยอดรับรองจ่าย ' + n2(s.keep) + ' บาท');
      if (s.drop > 0) L.push('ระงับตามกติกา ' + n2(s.drop) + ' บาท (' + s.dropCases + ' เคส)');
    }
    L.push('');
    d.byDoctor.forEach(function (x) {
      L.push('• ' + x.name + ' ' + n0(x.cases) + ' เคส' + (o.docMoney ? ' · ' + n2(x.keep) + ' บาท' : ''));
    });
    if (o.rights) { L.push(''); L.push('สิทธิ: ' + d.rights.map(function (r) { return r.grp + ' ' + n0(r.cases); }).join(' · ')); }
    var staff = staffList(cur.staff);
    if (o.staff && staff.length) { L.push(''); L.push('เจ้าหน้าที่: ' + staff.map(function (x) { return x.fullName; }).join(', ')); }
    L.push('');
    L.push('ผู้รายงาน ' + A.state.me.name);
    return L.join('\n');
  }
  function lineDialog() {
    var o = { money: true, docMoney: false, rights: true, staff: true };
    var opts = [['money', 'ยอดเงินรวมของวัน', 'ยอดรับรองจ่าย และยอดที่ระงับ'], ['docMoney', 'ยอดเงินรายทันตแพทย์', 'กลุ่มไลน์มีหลายคนเห็น — เลือกเมื่อจำเป็น'],
      ['rights', 'สิทธิการรักษา', ''], ['staff', 'รายชื่อเจ้าหน้าที่', '']];
    A.dialog({
      title: 'คัดลอกข้อความส่งไลน์', icon: 'line',
      body: '<div class="shot-opts">' + opts.map(function (x) {
        return '<label class="chk"><input type="checkbox" data-lo="' + x[0] + '"' + (o[x[0]] ? ' checked' : '') + '><span><b>' + esc(x[1]) + '</b>' + (x[2] ? '<small>' + esc(x[2]) + '</small>' : '') + '</span></label>';
      }).join('') + '</div><textarea id="loTx" class="inp" rows="10" readonly></textarea>',
      actions: [{ label: 'ปิด', value: null }, { label: 'คัดลอกข้อความ', icon: 'copy', cls: 'primary', onClick: function (root) { return A.copyText(root.querySelector('#loTx').value).then(function () { return false; }); } }],
      onOpen: function (root) {
        var tx = root.querySelector('#loTx');
        var upd = function () { tx.value = lineText(cur.data, o); };
        root.querySelectorAll('[data-lo]').forEach(function (c) { c.onchange = function () { o[c.getAttribute('data-lo')] = c.checked; upd(); }; });
        upd();
      }
    });
  }

  /* ---------- ภาพรายงานสำหรับส่งไลน์ ---------- */
  function shareImage() {
    var d = cur.data;
    A.imageTool({
      title: 'ภาพรายงานประจำวัน', filename: 'รายงานทันตกรรม_' + d.date + '.png',
      options: [
        { key: 'money', label: 'ยอดเงินรวมของวัน', sub: 'ยอดรับรองจ่าย และยอดที่ระงับ', on: false },
        { key: 'docMoney', label: 'ยอดเงินรายทันตแพทย์', sub: 'กลุ่มไลน์มีหลายคนเห็น — เลือกเมื่อจำเป็น', on: false },
        { key: 'rights', label: 'สิทธิการรักษา', on: true },
        { key: 'staff', label: 'รายชื่อเจ้าหน้าที่', on: true }
      ],
      render: function (o) { return shareCard(d, o); }
    });
  }
  function shareCard(d, o) {
    var s = d.summary;
    var el = document.createElement('div');
    el.className = 'share';
    var staff = staffList(cur.staff);
    var k = [['ทันตแพทย์', n0(s.doctors) + ' ท่าน'], ['ผู้ป่วย', n0(s.cases) + ' เคส'], ['รายการ DF', n0(s.items)]];
    if (o.money) k = [['ทันตแพทย์ · เคส', n0(s.doctors) + ' · ' + n0(s.cases)], ['ยอดรับรองจ่าย', n0(s.keep)], ['ระงับตามกติกา', s.drop ? n0(s.drop) : '0', s.drop ? 'bad' : '']];
    el.innerHTML = '<div class="sh-h">' + A.LOGO_SVG + '<div><b>รายงานคลินิกทันตกรรมนอกเวลา</b><small>คลินิกพิเศษเฉพาะทางนอกเวลา · โรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา</small></div></div>' +
      '<div class="sh-d">' + esc(A.dThai(d.date, true)) + '</div>' +
      '<div class="sh-b"><div class="sh-k">' + k.map(function (x) { return '<div><small>' + esc(x[0]) + '</small><b class="' + (x[2] || '') + '">' + x[1] + '</b></div>'; }).join('') + '</div>' +
      '<h4>ทันตแพทย์ออกตรวจ</h4><table><tbody>' + d.byDoctor.map(function (x) {
        return '<tr><td>' + esc(x.name) + '</td><td class="n">' + n0(x.cases) + ' เคส</td>' + (o.docMoney ? '<td class="n">' + n2(x.keep) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table>' +
      (o.rights ? '<h4>สิทธิการรักษา</h4><div class="chips">' + d.rights.map(function (r) { return '<span>' + esc(r.grp) + ' ' + n0(r.cases) + '</span>'; }).join('') + '</div>' : '') +
      (o.staff && staff.length ? '<h4>เจ้าหน้าที่ปฏิบัติงาน</h4><div class="chips">' + staff.map(function (x) { return '<span>' + esc(x.fullName) + '</span>'; }).join('') + '</div>' : '') +
      '</div><div class="sh-f">ผู้รายงาน ' + esc(A.state.me.name) + ' · ข้อมูล ณ ' + esc(A.dtThai(s.apiAt)) + ' · SMC DF</div>';
    return el;
  }

  /* ================= ทวนสอบ DF เกิน 1 ================= */
  var aud = { from: null, to: null };

  function audit(host) {
    var last = (A.state.boot.lastDataDate || A.today());
    var ym = last.slice(0, 7);
    aud.from = aud.from || A.monthStart(ym);
    aud.to = aud.to || A.monthEnd(ym);
    var fy = A.fyOf(last), fr = A.fyRange(fy);
    host.innerHTML =
      '<div class="panel tool no-print"><div class="panel-b">' +
      '<div class="seg" id="aQuick">' +
      '<button data-q="m0">เดือนล่าสุด</button><button data-q="m1">เดือนก่อน</button><button data-q="fy">ปีงบ ' + fy + '</button><button data-q="all">ทั้งหมด</button></div>' +
      '<input type="date" id="aFrom" class="inp sm" value="' + esc(aud.from) + '" aria-label="ตั้งแต่"><span class="note">ถึง</span>' +
      '<input type="date" id="aTo" class="inp sm" value="' + esc(aud.to) + '" aria-label="ถึง">' +
      '<button class="btn sm primary" id="aGo">' + ic('filter') + 'แสดงผล</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn sm" id="aXls">' + ic('excel') + 'ส่งออก Excel</button>' +
      '</div></div><div id="aBody">' + A.skeleton(4) + '</div>';

    var Q = { m0: [A.monthStart(ym), A.monthEnd(ym)], m1: [A.monthStart(A.addMonths(ym, -1)), A.monthEnd(A.addMonths(ym, -1))], fy: [fr.from, fr.to], all: ['2025-10-01', last] };
    host.querySelectorAll('[data-q]').forEach(function (b) {
      var q = Q[b.getAttribute('data-q')];
      if (q[0] === aud.from && q[1] === aud.to) b.classList.add('on');
      b.onclick = function () { aud.from = q[0]; aud.to = q[1]; audit(host); };
    });
    $('aGo').onclick = function () {
      if ($('aFrom').value > $('aTo').value) return A.toast('วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด', { type: 'warn' });
      aud.from = $('aFrom').value; aud.to = $('aTo').value; audit(host);
    };
    var cache = null;
    $('aXls').onclick = function () { if (cache) exportAudit(cache); };

    return A.cached('getAudit', { from: aud.from, to: aud.to }, function (d) { cache = d; render(d); });

    function render(d) {
      var t = d.totals;
      var h = '<div class="kpis">' +
        kpi('เคสทั้งหมด', n0(t.cases), A.dThai(d.from) + ' – ' + A.dThai(d.to), '', 'cases') +
        kpi('เคสที่คีย์ DF เกิน 1', n0(t.over), t.cases ? pct(t.over / t.cases) + ' ของเคสทั้งหมด' : '', t.over ? 'bad' : 'ok', 'warn') +
        kpi('ยอดที่เก็บได้', n2(t.base), '', '', 'money') +
        kpi('ยอดที่ถูกระงับ', n2(t.drop), t.base ? pct(t.drop / t.base) + ' ของยอดที่เก็บได้' : '', t.drop ? 'bad' : 'ok', 'cut') +
        '</div>';

      h += '<div class="g2">';
      h += '<div class="panel"><div class="panel-h"><h3>' + ic('tooth') + 'อัตราการคีย์เกิน รายทันตแพทย์</h3><div class="sub">ร้อยละของเคสที่คีย์ DF มากกว่า 1 รายการ · เรียงจากยอดที่ถูกระงับมากไปน้อย</div></div>' +
        '<div class="panel-b">' + (d.byDoctor.length ? CH.hbars(d.byDoctor.map(function (x) {
          return { label: x.name, a: x.rate * 100, ca: x.rate > .3 ? 'var(--c-drop)' : 'var(--c-keep)', value: pct(x.rate) + ' · ' + x.over + '/' + x.cases + ' เคส', tip: 'ระงับ ' + n2(x.drop) + ' บาท' };
        })) : A.empty('ไม่มีข้อมูลในช่วงนี้')) + '</div></div>';

      h += '<div class="panel"><div class="panel-h"><h3>' + ic('code') + 'รูปแบบการคีย์ DF ต่อ 1 เคส</h3></div>' +
        '<div class="panel-b flush wrap-x"><table class="rt"><thead><tr><th>รูปแบบ</th><th class="n">เคส</th>' +
        '<th class="n">สัดส่วน</th><th class="n">ยอดที่ถูกระงับ</th></tr></thead><tbody>' +
        d.patterns.map(function (p) {
          return '<tr><td>' + esc(p.pattern) + '</td><td class="n">' + n0(p.cases) + '</td>' +
            '<td class="n">' + pct(t.cases ? p.cases / t.cases : 0) + '</td><td class="n">' + (p.drop ? '<span class="badge bad">' + n2(p.drop) + '</span>' : '-') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
      h += '</div>';

      h += '<div class="panel"><div class="panel-h"><h3>' + ic('tooth') + 'สรุปรายทันตแพทย์</h3></div>' +
        '<div class="panel-b flush wrap-x"><table class="rt"><thead><tr><th>ทันตแพทย์</th><th class="n">เคส</th>' +
        '<th class="n">คีย์เกิน</th><th class="n">อัตรา</th><th class="n">ยอดที่เก็บได้</th><th class="n">ยอดที่ถูกระงับ</th></tr></thead><tbody>' +
        d.byDoctor.map(function (x) {
          return '<tr><td>' + esc(x.name) + '</td><td class="n">' + n0(x.cases) + '</td><td class="n">' + n0(x.over) + '</td>' +
            '<td class="n">' + (x.rate > .3 ? '<span class="badge bad">' + pct(x.rate) + '</span>' : pct(x.rate)) + '</td>' +
            '<td class="n">' + n2(x.base) + '</td><td class="n">' + (x.drop ? n2(x.drop) : '-') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      h += '<div class="panel"><div class="panel-h"><h3>' + ic('cut') + 'รายการเคสที่คีย์ DF เกิน 1 รายการ</h3><span class="spacer"></span>' +
        '<span class="tag">' + d.cases.length + ' เคส' + (d.truncated ? ' (แสดง 500 เคสล่าสุด)' : '') + '</span></div>' +
        '<div class="panel-b flush scroll">' + (d.cases.length ? caseTable(d.cases) : A.empty('ไม่มีเคสที่คีย์เกินในช่วงนี้', '', 'ok')) + '</div></div>';

      $('aBody').innerHTML = h;
      A.cardify($('aBody'));
      bindCases($('aBody'));
    }

    function exportAudit(d) {
      var rows = [['ทวนสอบการคีย์ DF เกิน 1 รายการ'], ['ช่วงวันที่', A.dThai(d.from), 'ถึง', A.dThai(d.to)], []];
      rows.push(['ทันตแพทย์', 'เคส', 'เคสที่คีย์เกิน', 'สัดส่วน', 'ยอดที่เก็บได้', 'ยอดที่ถูกระงับ']);
      d.byDoctor.forEach(function (x) { rows.push([x.name, x.cases, x.over, Number((x.rate * 100).toFixed(1)) / 100, x.base, x.drop]); });
      rows.push(['รวม', d.totals.cases, d.totals.over, '', d.totals.base, d.totals.drop]);
      var det = [['วันที่', 'ทันตแพทย์', 'HN (ปิดบางส่วน)', 'สิทธิ', 'รหัส DF', 'ประเภท', 'ยอดเรียกเก็บ', 'ชำระเงินสด', 'เบิกประกัน', 'ยอดที่เก็บได้', 'สถานะ', 'เหตุผล']];
      d.cases.forEach(function (c) {
        c.items.forEach(function (i) {
          det.push([A.dThai(c.date), c.dctName, c.hn, c.pttype, i.charge, i.type, i.total, i.paid, i.claim, i.base, i.keep ? 'รับรอง' : 'ระงับ', i.why]);
        });
      });
      A.saveSheet([
        { name: 'สรุป', rows: rows, cols: [30, 10, 14, 10, 16, 16] },
        { name: 'รายการที่คีย์เกิน', rows: det, cols: [16, 28, 14, 24, 12, 10, 13, 13, 13, 14, 10, 50] }
      ], 'ทวนสอบ_DF_' + d.from + '_ถึง_' + d.to + '.xlsx');
    }
  }

  return { daily: daily, audit: audit, caseTable: caseTable, bindCases: bindCases, kpi: kpi, signBlock: signBlock };
})();
