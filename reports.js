/* reports.js — รอบเบิกรายเดือน (รายงานส่งเบิก HR) · แดชบอร์ด · ตั้งค่า */
var REPORTS = (function () {
  var A = SMCDF, $ = A.$, esc = A.esc, n0 = A.n0, n2 = A.n2, pct = A.pct, ic = A.ic;
  var kpi = PAGES.kpi;
  var cur = { ym: null, data: null, tab: 'sum' };

  function isAdmin() { return A.role('admin'); }
  function canClose() { return isAdmin() || A.role('hr'); }

  /* ทุกเดือนตั้งแต่วันเริ่มเก็บข้อมูลถึงเดือนปัจจุบัน — เดือนที่ยังไม่มีข้อมูลก็แสดง เพื่อกดดึงได้ */
  function ymList() {
    var have = {};
    (A.state.boot.months || []).forEach(function (m) { have[m.ym] = m.status || 'open'; });
    var th = A.today().slice(0, 7);
    var from = String(A.state.boot.dataFrom || '2025-10-01').slice(0, 7);
    var list = [], y = from, guard = 0;
    while (y <= th && guard++ < 120) { list.push(y); y = A.addMonths(y, 1); }
    Object.keys(have).forEach(function (k) { if (list.indexOf(k) < 0) list.push(k); });
    var last = (A.state.boot.lastDataDate || '').slice(0, 7);
    if (last && list.indexOf(last) < 0) list.push(last);
    return list.sort().reverse().map(function (k) { return { ym: k, has: !!have[k], closed: have[k] === 'closed' }; });
  }
  function ymLabel(x) {
    return A.ymThai(x.ym) + (x.closed ? ' · ปิดรอบแล้ว' : x.has ? '' : ' · ยังไม่มีข้อมูล');
  }

  /* ================= รอบเบิกรายเดือน ================= */
  function month(host, arg) {
    if (arg && /^\d{4}-\d{2}$/.test(arg)) cur.ym = arg;
    var ym = cur.ym || (A.state.boot.lastDataDate || A.today()).slice(0, 7);
    cur.ym = ym;
    host.innerHTML =
      '<div class="panel tool no-print"><div class="panel-b">' +
      '<span class="note">รอบเดือน</span><select id="mYm" class="inp sm">' +
      ymList().map(function (y) { return '<option value="' + y.ym + '"' + (y.ym === ym ? ' selected' : '') + '>' + esc(ymLabel(y)) + '</option>'; }).join('') + '</select>' +
      (canClose() ? '<button class="btn sm ghost" id="mSync" title="ดึงข้อมูลจาก API โรงพยาบาลใหม่ทั้งเดือน">' + ic('sync') + 'ดึงข้อมูลเดือนนี้ใหม่</button>' : '') +
      '<span class="spacer"></span>' +
      '<button class="btn sm accent" id="mHr">' + ic('month') + 'รายงานส่งเบิก HR</button>' +
      '<button class="btn sm" id="mDrop">' + ic('cut') + 'รายงานรายการระงับ</button>' +
      '<button class="btn sm" id="mHrmi">' + ic('excel') + 'ไฟล์ HRMi</button>' +
      '</div></div><div id="mBody">' + A.skeleton(6) + '</div>';
    $('mYm').onchange = function () { cur.ym = this.value; month(host); };
    if ($('mSync')) $('mSync').onclick = function () { syncThisMonth(this); };
    function syncThisMonth(btn) {
      return A.syncMonth(ym, btn).then(function (r) {
        A.ok(r.rows ? 'ดึงข้อมูล ' + A.ymThai(ym) + ' แล้ว ' + n0(r.rows) + ' รายการ' + (r.changed ? ' (ยอดมีการเปลี่ยนแปลง)' : ' (ยอดเหมือนเดิม)')
                    : 'API โรงพยาบาลไม่มีรายการ DF ทันตกรรมในเดือน ' + A.ymThai(ym), 'ดึงข้อมูลเสร็จแล้ว');
        month(host, ym);
      }, function () { });
    }

    return A.cached('getMonth', { ym: ym }, function (d) {
      if (ym !== cur.ym) return;
      cur.data = d;
      render(d);
      $('mHr').onclick = function () { hrDialog(d); };
      $('mDrop').onclick = function () { dropDialog(d); };
      $('mHrmi').onclick = function () { exportHrmi(d); };
    });

    function render(d) {
      var t = d.totals, c = d.settings;
      var closed = d.status === 'closed';
      var nDrop = d.dropped.length, nBp = (d.backpay || []).filter(function (b) { return b.status === 'รอดำเนินการ'; }).length;
      var h = '';

      if (!d.byDoctor.length && !(d.clinicDays || []).length) {
        $('mBody').innerHTML = '<div class="panel"><div class="panel-b">' +
          A.empty('ยังไม่มีข้อมูลของ ' + A.ymThai(d.ym || ym) + ' ในระบบ',
            canClose() ? 'ถ้าเดือนนี้มีคลินิก แปลว่าระบบยังดึงข้อมูลย้อนหลังมาไม่ถึง — กดปุ่มด้านล่างเพื่อดึงเดี๋ยวนี้ (ใช้เวลาประมาณ 1–3 นาที)' : 'ถ้าเดือนนี้มีคลินิก กรุณาแจ้งผู้ดูแลระบบให้ดึงข้อมูลเดือนนี้', 'cal') +
          (canClose() ? '<div class="btns" style="justify-content:center"><button class="btn primary" id="mSync2">' + ic('sync') + 'ดึงข้อมูล ' + esc(A.ymThai(d.ym || ym)) + '</button>' +
            (isAdmin() ? '<button class="btn" onclick="SMCDF.go(\'settings:data\')">' + ic('info') + 'ดูสถานะข้อมูลทุกเดือน</button>' : '') + '</div>' : '') +
          '</div></div>';
        if ($('mSync2')) $('mSync2').onclick = function () { syncThisMonth(this); };
        return;
      }

      /* แถบขั้นตอน */
      var steps = [
        { t: 'ตรวจรายการระงับ', s: nDrop ? nDrop + ' เคส' : 'ไม่มีรายการระงับ', done: closed || !nDrop },
        { t: 'ปิดรอบเดือน', s: closed ? 'ปิดแล้ว ' + esc(A.dThai(String(d.closedAt).slice(0, 10))) : 'ยังไม่ปิด', done: closed },
        { t: 'รายงานส่งเบิก HR', s: 'พิมพ์/PDF หรือ Excel', done: false },
        { t: 'ไฟล์ HRMi', s: esc(d.hrmi.pay) + ' · ' + esc(d.hrmi.hos), done: false }
      ];
      h += '<div class="steps no-print">' + steps.map(function (x, i) {
        return '<div class="step ' + (x.done ? 'done' : '') + '"><span class="n">' + (x.done ? ic('check') : (i + 1)) + '</span><span><b>' + esc(x.t) + '</b><small>' + x.s + '</small></span></div>';
      }).join('') + '</div>';

      if (closed) {
        h += '<div class="msg ok">' + ic('lock') + '<span>รอบเดือนนี้ <b>ปิดแล้ว</b> เมื่อ ' + esc(A.dtThai(d.closedAt)) + ' โดย ' + esc(d.closedBy) +
          ' — ยอดถูกบันทึกไว้ ถ้ายอดเปลี่ยนภายหลังระบบจะตั้งเป็นยอดตกเบิก</span>' +
          (isAdmin() ? '<button class="btn sm" id="mReopen">' + ic('unlock') + 'เปิดรอบใหม่</button>' : '') + '</div>';
      } else if (canClose() && d.byDoctor.length) {
        var past = d.ym < A.today().slice(0, 7);
        h += '<div class="msg ' + (past ? 'warn' : 'info') + '">' + ic(past ? 'warn' : 'info') + '<span>' +
          (past ? 'เดือนนี้สิ้นสุดแล้ว ตรวจรายการระงับแล้วกด <b>ปิดรอบเดือนนี้</b> ก่อนออกรายงานส่ง HR (ส่งภายในวันที่ 4)' : 'เดือนนี้ยังไม่สิ้นสุด ยอดยังเปลี่ยนได้ — ปิดรอบเมื่อสิ้นเดือน') +
          '</span><button class="btn sm primary" id="mClose">' + ic('lock') + 'ปิดรอบเดือนนี้</button></div>';
      }
      if (d.pending) h += '<div class="msg warn">' + ic('warn') + '<span>มี ' + d.pending.items + ' รายการที่ใช้รหัส DF ใหม่ (' + esc(d.pending.codes.join(', ')) + ') ยังไม่นับจ่าย — ยืนยันที่ ตั้งค่า › รหัส DF ก่อนปิดรอบ</span></div>';

      h += '<div class="kpis">' +
        kpi('ยอดรับรอง (DF 100%)', n2(t.keep), 'แพทย์ ' + n2(t.pay80) + ' · รพ. ' + n2(t.hos20), 'hero', 'money') +
        kpi('วันที่มีคลินิก', n0(d.clinicDays.length) + '<small>วัน</small>', 'ทันตแพทย์ ' + n0(d.byDoctor.length) + ' ท่าน', '', 'cal') +
        kpi('จำนวนเคส', n0(t.cases), n0(t.items) + ' รายการ DF', '', 'cases') +
        kpi('ส่วนแพทย์ ' + pct(c.sharePct), n2(t.pay80), 'รหัส ' + esc(d.hrmi.pay), '', 'tooth') +
        kpi('ส่วนโรงพยาบาล', n2(t.hos20), 'รหัส ' + esc(d.hrmi.hos), '', 'money') +
        kpi('ยอดที่ระงับ', n2(t.drop), n0(t.dropCases) + ' เคสคีย์ DF เกิน 1', t.drop ? 'bad' : 'ok', 'cut') +
        '</div>';

      var tabs = [['sum', 'แบบสรุปรายแพทย์', ''], ['det', 'รายละเอียดรายวัน', ''], ['drop', 'รายการระงับ', nDrop], ['bp', 'ยอดตกเบิก', nBp]];
      h += '<div class="panel"><div class="tabs">' + tabs.map(function (x) {
        return '<button data-tab="' + x[0] + '" class="' + (cur.tab === x[0] ? 'on' : '') + '">' + esc(x[1]) + (x[2] ? '<span class="cnt">' + x[2] + '</span>' : '') + '</button>';
      }).join('') + '</div><div id="mTab"></div></div>';

      $('mBody').innerHTML = h;
      host.querySelectorAll('[data-tab]').forEach(function (b) {
        b.onclick = function () {
          cur.tab = b.getAttribute('data-tab');
          host.querySelectorAll('[data-tab]').forEach(function (x) { x.classList.toggle('on', x === b); });
          tab(d);
        };
      });
      tab(d);
      if ($('mClose')) $('mClose').onclick = function () { askClose(d); };
      if ($('mReopen')) $('mReopen').onclick = function () { askReopen(d); };
    }

    function tab(d) {
      var t = d.totals, c = d.settings, el = $('mTab'), h = '';
      if (cur.tab === 'sum') {
        h = '<div class="wrap-x"><table class="rt"><thead><tr><th>ทันตแพทย์</th><th>รหัส</th><th class="n">วัน</th><th class="n">เคส</th>' +
          '<th class="n">ยอดที่เก็บได้</th><th class="n">ระงับ</th><th class="n">DF 100%</th>' +
          '<th class="n">DF ' + pct(c.sharePct) + '</th><th class="n">DF ' + pct(1 - c.sharePct) + '</th></tr></thead><tbody>' +
          d.byDoctor.map(function (x) {
            return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.dct) + '</td><td class="n">' + n0(x.days) + '</td><td class="n">' + n0(x.cases) + '</td>' +
              '<td class="n">' + n2(x.base) + '</td><td class="n">' + (x.drop ? '<span class="badge bad">' + n2(x.drop) + '</span>' : '-') + '</td>' +
              '<td class="n"><b>' + n2(x.keep) + '</b></td><td class="n">' + n2(x.pay80) + '</td><td class="n">' + n2(x.hos20) + '</td></tr>';
          }).join('') +
          '<tr class="sum"><td>รวม</td><td></td><td class="n">' + n0(d.clinicDays.length) + '</td><td class="n">' + n0(t.cases) + '</td>' +
          '<td class="n">' + n2(t.base) + '</td><td class="n">' + n2(t.drop) + '</td><td class="n">' + n2(t.keep) + '</td>' +
          '<td class="n">' + n2(t.pay80) + '</td><td class="n">' + n2(t.hos20) + '</td></tr></tbody></table></div>';
        if (!d.byDoctor.length) h = A.empty('ยังไม่มีข้อมูลของเดือนนี้', '', 'cal');
      }
      if (cur.tab === 'det') {
        h = '<div class="wrap-x scroll"><table class="rt"><thead><tr><th>วันที่</th><th>ทันตแพทย์</th><th class="n">คนไข้</th>' +
          '<th class="n">DF 100%</th><th class="n">DF 80%</th><th class="n">DF 20%</th><th class="n">ระงับ</th></tr></thead><tbody>' +
          d.detail.map(function (x) {
            return '<tr><td>' + esc(A.dThai(x.date)) + '<span class="sub-t">วัน' + A.TH_DAY[A.dow(x.date)] + '</span></td><td>' + esc(x.name) + '</td><td class="n">' + n0(x.cases) + '</td>' +
              '<td class="n">' + n2(x.keep) + '</td><td class="n">' + n2(x.pay80) + '</td><td class="n">' + n2(x.hos20) + '</td>' +
              '<td class="n">' + (x.drop ? '<span class="badge bad">' + n2(x.drop) + '</span>' : '-') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        if (!d.detail.length) h = A.empty('ยังไม่มีข้อมูลของเดือนนี้', '', 'cal');
      }
      if (cur.tab === 'drop') {
        h = d.dropped.length ? '<div class="panel-b" style="padding-bottom:0"><p class="note" style="margin:0 0 10px">ตรวจทุกเคสก่อนปิดรอบ · ถ้าเคสไหนสมควรได้จริง ผู้ดูแลระบบกด "ปลดล็อกให้จ่าย" พร้อมเหตุผล' +
          (d.status === 'closed' ? ' (รอบปิดแล้ว ต้องเปิดรอบใหม่ก่อนจึงจะแก้ได้)' : '') + '</p></div>' +
          '<div class="wrap-x">' + PAGES.caseTable(d.dropped) + '</div>' : A.empty('ไม่มีรายการระงับในเดือนนี้', 'ทุกเคสคีย์ DF ถูกต้องตามกติกา', 'ok');
      }
      if (cur.tab === 'bp') {
        var bp = d.backpay || [];
        h = bp.length ? '<div class="wrap-x"><table class="rt"><thead><tr><th>ทันตแพทย์</th><th class="n">ยอดตอนปิดรอบ</th><th class="n">ยอดปัจจุบัน</th>' +
          '<th class="n">ผลต่าง</th><th>ตรวจพบเมื่อ</th><th>สถานะ</th>' + (canClose() ? '<th class="no-print"></th>' : '') + '</tr></thead><tbody>' +
          bp.map(function (b) {
            return '<tr><td>' + esc(b.dctName) + '</td><td class="n">' + n2(b.closedBase) + '</td><td class="n">' + n2(b.currentBase) + '</td>' +
              '<td class="n"><b>' + (Number(b.diff) > 0 ? '+' : '') + n2(b.diff) + '</b></td><td>' + esc(b.detected) + '</td>' +
              '<td><span class="badge ' + (b.status === 'เบิกแล้ว' ? 'ok' : 'warn') + '">' + esc(b.status) + '</span></td>' +
              (canClose() ? '<td class="no-print">' + (b.status !== 'เบิกแล้ว' ? '<button class="btn sm" data-bp="' + esc(b.id) + '">' + ic('check') + 'เบิกแล้ว</button>' : '') + '</td>' : '') + '</tr>';
          }).join('') + '</tbody></table></div><div class="panel-b"><p class="note" style="margin:0">ยอดเหล่านี้เกิดจากผู้ป่วยชำระเพิ่มหรือบริษัทประกันอนุมัติเพิ่มหลังปิดรอบ ให้ตั้งเบิกในรอบเดือนถัดไป</p></div>'
          : A.empty('ไม่มียอดตกเบิก', 'ยอดหลังปิดรอบยังตรงกับยอดที่บันทึกไว้', 'ok');
      }
      el.innerHTML = h;
      A.cardify(el);
      PAGES.bindCases(el);
      el.querySelectorAll('[data-bp]').forEach(function (b) {
        b.onclick = function () {
          A.run(b, function () { return A.api('markBackpay', { id: b.getAttribute('data-bp'), status: 'เบิกแล้ว' }); }, { ok: 'บันทึกว่าเบิกแล้ว' })
            .then(function () { month(host); }, function () { });
        };
      });
    }

    function askClose(d) {
      A.askPassword({
        title: 'ปิดรอบเดือน ' + A.ymThai(d.ym), ok: 'ปิดรอบ', tone: '',
        sub: 'ระบบจะบันทึกยอดรับรองของแต่ละท่านไว้เป็นยอดอ้างอิง เมื่อปิดแล้วจะแก้ข้อยกเว้นรายเคสไม่ได้จนกว่าจะเปิดรอบใหม่',
        body: '<table style="margin-bottom:12px"><tbody><tr><th style="position:static">ยอดรับรองรวม (DF 100%)</th><td class="n">' + n2(d.totals.keep) + ' บาท</td></tr>' +
          '<tr><th style="position:static">ส่วนแพทย์</th><td class="n">' + n2(d.totals.pay80) + ' บาท</td></tr>' +
          '<tr><th style="position:static">ส่วนโรงพยาบาล</th><td class="n">' + n2(d.totals.hos20) + ' บาท</td></tr>' +
          '<tr><th style="position:static">ทันตแพทย์</th><td class="n">' + n0(d.byDoctor.length) + ' ท่าน</td></tr></tbody></table>',
        run: function (pw) {
          return A.api('closeMonth', { ym: d.ym, password: pw }).then(function () { A.ok('ปิดรอบ ' + A.ymThai(d.ym) + ' แล้ว — ขั้นต่อไป: ออกรายงานส่งเบิก HR', 'ปิดรอบแล้ว'); month(host); });
        }
      });
    }
    function askReopen(d) {
      A.askPassword({
        title: 'เปิดรอบเดือน ' + A.ymThai(d.ym) + ' ใหม่', ok: 'เปิดรอบใหม่', danger: true, reason: 'เหตุผลที่เปิดรอบใหม่',
        sub: 'ใช้เมื่อต้องแก้ไขยอดก่อนส่งเบิก การเปิดรอบใหม่จะถูกบันทึกประวัติไว้',
        run: function (pw, reason) {
          return A.api('reopenMonth', { ym: d.ym, password: pw, reason: reason }).then(function () { A.ok('เปิดรอบใหม่แล้ว', 'บันทึกแล้ว'); month(host); });
        }
      });
    }
  }

  /* ================= รายงานส่งเบิก HR (แบบรายงานเดิม) ================= */
  function beYY(ym) { return String(Number(ym.slice(0, 4)) + 543).slice(-2); }
  function payYm(ym) { return A.addMonths(ym, 1); }
  function hrCode(ym) { return ym.slice(5, 7) + '.' + beYY(ym); }
  function oldDate(iso) { var p = iso.split('-'); return Number(p[2]) + '/' + Number(p[1]) + '/' + p[0]; }
  function docName(x, c) { return c.hrFullTitle === 'N' ? x.name : (x.fullName || x.name); }
  function hrTitle(d, kind) {
    var c = d.settings, pm = payYm(d.ym);
    return esc(c.hrTitle || 'รายงานสรุปค่าตอบแทนทันตแพทย์') + ' ประจำเดือน ' + esc(A.ymThai(d.ym)) + ' (' + kind + ') รอบจ่ายเดือน' +
      esc(A.TH_MON_FULL[Number(pm.slice(5, 7)) - 1]) + ' ' + beYY(pm);
  }
  function hrTop(d) {
    return '<div class="a4-top"><span>' + esc(d.settings.hrHeadLeft || '') + '</span><span>รายงานเบิกจ่าย ' + hrCode(d.ym) + '</span></div>';
  }
  function sumBy(list, k) { return list.reduce(function (a, x) { return a + Number(x[k] || 0); }, 0); }

  function hrDetailHtml(d, o) {
    var c = d.settings;
    return '<div class="a4">' + hrTop(d) + '<h2 style="font-size:14.5px">' + hrTitle(d, 'รายละเอียด') + '</h2><div class="a4-sub"></div>' +
      '<table class="hr"><thead><tr><th>รหัสเจ้าหน้าที่</th><th>วันที่</th><th>วัน</th><th>ทันตแพทย์</th><th>จำนวนคนไข้</th>' +
      '<th>DF ทันตแพทย์ 100%</th><th>DF ทันตแพทย์ 80%</th><th>DF ทันตแพทย์ 20%</th><th>หมายเหตุ</th></tr></thead><tbody>' +
      d.detail.map(function (x) {
        return '<tr><td class="c">' + esc(x.dct) + '</td><td class="c">' + oldDate(x.date) + '</td><td class="c">วัน' + A.TH_DAY[A.dow(x.date)] + '</td>' +
          '<td>' + esc(docName(x, c)) + '</td><td class="c">' + n0(x.cases) + '</td><td class="n">' + n2(x.keep) + '</td>' +
          '<td class="n">' + n2(x.pay80) + '</td><td class="n">' + n2(x.hos20) + '</td>' +
          '<td>' + (o.note && x.drop ? 'ระงับ ' + n2(x.drop) + ' (' + x.dropCases + ' เคส)' : '') + '</td></tr>';
      }).join('') +
      '<tr class="sum"><td colspan="4" class="c">ผลรวม</td><td class="c">' + n0(d.totals.cases) + '</td><td class="n">' + n2(d.totals.keep) + '</td>' +
      '<td class="n">' + n2(d.totals.pay80) + '</td><td class="n">' + n2(d.totals.hos20) + '</td><td></td></tr></tbody></table>' +
      PAGES.signBlock(c) + '</div>';
  }
  function hrSummaryHtml(d, o) {
    var c = d.settings;
    var list = d.byDoctor.slice().sort(function (a, b) { return a.dct < b.dct ? -1 : 1; });
    return '<div class="a4">' + hrTop(d) + '<h2 style="font-size:14.5px">' + hrTitle(d, 'แบบสรุป') + '</h2><div class="a4-sub"></div>' +
      '<table class="hr"><thead><tr><th>รหัสเจ้าหน้าที่</th><th>ทันตแพทย์</th><th>DF ทันตแพทย์ 100%</th><th>DF ทันตแพทย์ 80%</th><th>DF ทันตแพทย์ 20%</th><th>หมายเหตุ</th></tr></thead><tbody>' +
      list.map(function (x) {
        return '<tr><td class="c">' + esc(x.dct) + '</td><td>' + esc(docName(x, c)) + '</td><td class="n">' + n2(x.keep) + '</td>' +
          '<td class="n">' + n2(x.pay80) + '</td><td class="n">' + n2(x.hos20) + '</td><td>' + (o.note && x.drop ? 'ระงับ ' + n2(x.drop) : '') + '</td></tr>';
      }).join('') +
      '<tr class="sum"><td colspan="2" class="c">ผลรวม</td><td class="n">' + n2(d.totals.keep) + '</td><td class="n">' + n2(d.totals.pay80) + '</td>' +
      '<td class="n">' + n2(d.totals.hos20) + '</td><td></td></tr></tbody></table>' +
      PAGES.signBlock(c) + '</div>';
  }
  function dropHtml(d) {
    var c = d.settings, rows = [];
    d.dropped.forEach(function (ca) { ca.items.forEach(function (it) { if (!it.keep) rows.push({ ca: ca, it: it }); }); });
    var byDoc = {};
    rows.forEach(function (r) {
      var x = byDoc[r.ca.dct] || (byDoc[r.ca.dct] = { dct: r.ca.dct, name: r.ca.dctName, n: 0, amt: 0, cases: {} });
      x.n++; x.amt += r.it.base; x.cases[r.ca.date + r.ca.hn] = 1;
    });
    var docs = Object.keys(byDoc).map(function (k) { return byDoc[k]; }).sort(function (a, b) { return b.amt - a.amt; });
    return '<div class="a4">' + hrTop(d) + '<h2 style="font-size:14.5px">รายงานรายการค่าธรรมเนียมแพทย์ที่ระงับตามกติกา ประจำเดือน ' + esc(A.ymThai(d.ym)) + '</h2>' +
      '<div class="a4-sub">กติกา: ผู้ป่วย 1 HN ต่อวันต่อทันตแพทย์ 1 ท่าน รับรอง DF ที่สูงที่สุดเพียงรายการเดียว (มีผล ' + esc(A.dThai(c.ruleFrom)) + ') · ยอดที่ระงับโรงพยาบาลรับ 100%</div>' +
      (rows.length ? '<div class="sec-t">สรุปรายทันตแพทย์</div><table><thead><tr><th>รหัสเจ้าหน้าที่</th><th>ทันตแพทย์</th><th>จำนวนเคส</th><th>จำนวนรายการ</th><th>ยอดที่ระงับ</th></tr></thead><tbody>' +
        docs.map(function (x) { return '<tr><td class="c">' + esc(x.dct) + '</td><td>' + esc(x.name) + '</td><td class="c">' + Object.keys(x.cases).length + '</td><td class="c">' + x.n + '</td><td class="n">' + n2(x.amt) + '</td></tr>'; }).join('') +
        '<tr class="sum"><td colspan="2" class="c">ผลรวม</td><td class="c">' + d.dropped.length + '</td><td class="c">' + rows.length + '</td><td class="n">' + n2(d.totals.drop) + '</td></tr></tbody></table>' +
        '<div class="sec-t">รายละเอียดรายการ</div><table><thead><tr><th>วันที่</th><th>ทันตแพทย์</th><th>HN</th><th>สิทธิ</th><th>รหัส DF ที่ระงับ</th><th>ยอด</th><th>รายการที่รับรองในเคสเดียวกัน</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var k = r.ca.items.filter(function (i) { return i.keep; })[0];
          return '<tr><td class="c">' + oldDate(r.ca.date) + '</td><td>' + esc(r.ca.dctName) + '</td><td class="c">' + esc(r.ca.hn) + '</td><td>' + esc(r.ca.pttype) + '</td>' +
            '<td class="c">' + esc(r.it.charge) + '</td><td class="n">' + n2(r.it.base) + '</td><td>' + (k ? esc(k.charge) + ' ' + n2(k.base) : '-') + '</td></tr>';
        }).join('') + '</tbody></table>'
        : '<p style="text-align:center;margin:30px 0">ไม่มีรายการที่ระงับในเดือนนี้</p>') +
      PAGES.signBlock(c) + '</div>';
  }

  function hrDialog(d) {
    if (!d.byDoctor.length) return A.toast('เดือนนี้ยังไม่มีข้อมูล', { type: 'warn' });
    var o = { det: true, sum: true, drop: false, note: false };
    A.dialog({
      title: 'รายงานส่งเบิก HR — ' + A.ymThai(d.ym), icon: 'month', tone: '', size: 'wide',
      sub: 'รูปแบบเดียวกับรายงานเบิกจ่ายเดิม · รายงานเบิกจ่าย ' + hrCode(d.ym),
      body: (d.status !== 'closed' ? '<div class="msg warn">' + ic('warn') + '<span>รอบเดือนนี้ <b>ยังไม่ได้ปิดรอบ</b> ยอดอาจเปลี่ยนได้อีก แนะนำให้ปิดรอบก่อนส่งเบิก</span></div>' : '') +
        '<div class="g2" style="gap:6px 16px"><div>' +
        chk('det', 'รายละเอียดรายวัน', 'รหัส · วันที่ · วัน · ทันตแพทย์ · จำนวนคนไข้ · DF 100/80/20', true) +
        chk('sum', 'แบบสรุปรายทันตแพทย์', 'ยอดรวมรายท่าน DF 100/80/20', true) +
        '</div><div>' +
        chk('drop', 'แนบรายงานรายการระงับ', 'เพิ่มเป็นหน้าแยกท้ายรายงาน (ไม่แนบ = ส่งเฉพาะยอดที่รับรอง)', false) +
        chk('note', 'แสดงยอดระงับในช่องหมายเหตุ', 'ใส่ยอดที่ระงับของวันนั้น/ท่านนั้นในช่องหมายเหตุ', false) +
        '</div></div>' +
        '<div class="note" style="margin:4px 0 10px">ยอด DF 100% = ' + n2(d.totals.keep) + ' บาท · 80% = ' + n2(d.totals.pay80) + ' · 20% = ' + n2(d.totals.hos20) +
        ' · ผู้ลงนาม: ' + esc(d.settings.signer1Name || '-') + ' / ' + esc(d.settings.signer2Name || '-') + ' (แก้ที่ ตั้งค่า › เอกสารและผู้ลงนาม)</div>' +
        '<div class="a4-scroll" id="hrPrev" style="max-height:46vh;border-radius:10px"></div>',
      actions: [
        { label: 'ส่งออก Excel', icon: 'excel', onClick: function () { if (!o.det && !o.sum && !o.drop) return Promise.reject(new Error('กรุณาเลือกอย่างน้อย 1 รายการ')); return exportHr(d, o).then(function () { return false; }); } },
        { label: 'พิมพ์ / บันทึก PDF', icon: 'print', cls: 'accent', onClick: function () { var h = build(); if (!h) return Promise.reject(new Error('กรุณาเลือกอย่างน้อย 1 รายการ')); A.closeTop(); A.printA4(h); return false; } }
      ],
      onOpen: function (root) {
        var upd = function () { root.querySelector('#hrPrev').innerHTML = build() || A.empty('ยังไม่ได้เลือกรายงาน'); };
        root.querySelectorAll('[data-o]').forEach(function (c) { c.onchange = function () { o[c.getAttribute('data-o')] = c.checked; upd(); }; });
        upd();
      }
    });
    function build() {
      return (o.det ? hrDetailHtml(d, o) : '') + (o.sum ? hrSummaryHtml(d, o) : '') + (o.drop ? dropHtml(d) : '');
    }
    function chk(k, t, s, on) {
      return '<label class="chk"><input type="checkbox" data-o="' + k + '"' + (on ? ' checked' : '') + '><span><b>' + esc(t) + '</b><small>' + esc(s) + '</small></span></label>';
    }
  }

  function dropDialog(d) {
    A.dialog({
      title: 'รายงานรายการระงับ — ' + A.ymThai(d.ym), icon: 'cut', tone: 'warn', size: 'wide',
      sub: d.dropped.length ? d.dropped.length + ' เคส · ' + n2(d.totals.drop) + ' บาท · ออกแยกจากรายงานส่งเบิก' : 'ไม่มีรายการระงับในเดือนนี้',
      body: '<div class="a4-scroll" style="max-height:56vh;border-radius:10px">' + dropHtml(d) + '</div>',
      actions: [
        { label: 'ส่งออก Excel', icon: 'excel', onClick: function () { return exportHr(d, { drop: true }).then(function () { return false; }); } },
        { label: 'พิมพ์ / บันทึก PDF', icon: 'print', cls: 'accent', onClick: function () { A.closeTop(); A.printA4(dropHtml(d)); return false; } }
      ]
    });
  }

  function exportHr(d, o) {
    var c = d.settings, sheets = [];
    var title = function (kind) { return (c.hrTitle || 'รายงานสรุปค่าตอบแทนทันตแพทย์') + ' ประจำเดือน ' + A.ymThai(d.ym) + ' (' + kind + ') รอบจ่ายเดือน' + A.TH_MON_FULL[Number(payYm(d.ym).slice(5, 7)) - 1] + ' ' + beYY(payYm(d.ym)); };
    var sign = function (rows, w) {
      rows.push([]); rows.push([]);
      var a = new Array(w).fill(''), b = new Array(w).fill(''), e = new Array(w).fill(''), f = new Array(w).fill('');
      a[1] = c.signer1Label || ''; a[w - 3] = c.signer2Label || '';
      b[1] = '(' + (c.signer1Name || '..........................') + ')'; b[w - 3] = '(' + (c.signer2Name || '..........................') + ')';
      e[1] = c.signer1Title || ''; e[w - 3] = c.signer2Title || '';
      rows.push(a); rows.push(f); rows.push(b); rows.push(e);
    };
    if (o.det) {
      var r = [[c.hrHeadLeft || '', '', '', '', '', '', '', '', 'รายงานเบิกจ่าย ' + hrCode(d.ym)], [title('รายละเอียด')], [],
        ['รหัสเจ้าหน้าที่', 'วันที่', 'วัน', 'ทันตแพทย์', 'จำนวนคนไข้', 'DF ทันตแพทย์ 100%', 'DF ทันตแพทย์ 80%', 'DF ทันตแพทย์ 20%', 'หมายเหตุ']];
      d.detail.forEach(function (x) {
        r.push([x.dct, oldDate(x.date), 'วัน' + A.TH_DAY[A.dow(x.date)], docName(x, c), x.cases, x.keep, x.pay80, x.hos20, o.note && x.drop ? 'ระงับ ' + x.drop : '']);
      });
      r.push(['ผลรวม', '', '', '', d.totals.cases, d.totals.keep, d.totals.pay80, d.totals.hos20, '']);
      sign(r, 9);
      sheets.push({ name: 'รายละเอียด', rows: r, cols: [13, 11, 11, 34, 11, 16, 16, 16, 20], merges: [{ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }] });
    }
    if (o.sum) {
      var s2 = [[c.hrHeadLeft || '', '', '', '', '', 'รายงานเบิกจ่าย ' + hrCode(d.ym)], [title('แบบสรุป')], [],
        ['รหัสเจ้าหน้าที่', 'ทันตแพทย์', 'DF ทันตแพทย์ 100%', 'DF ทันตแพทย์ 80%', 'DF ทันตแพทย์ 20%', 'หมายเหตุ']];
      d.byDoctor.slice().sort(function (a, b) { return a.dct < b.dct ? -1 : 1; }).forEach(function (x) {
        s2.push([x.dct, docName(x, c), x.keep, x.pay80, x.hos20, o.note && x.drop ? 'ระงับ ' + x.drop : '']);
      });
      s2.push(['ผลรวม', '', d.totals.keep, d.totals.pay80, d.totals.hos20, '']);
      sign(s2, 6);
      sheets.push({ name: 'แบบสรุป', rows: s2, cols: [14, 36, 18, 18, 18, 20], merges: [{ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }] });
    }
    if (o.drop) {
      var s3 = [['รายงานรายการค่าธรรมเนียมแพทย์ที่ระงับตามกติกา ประจำเดือน ' + A.ymThai(d.ym)], [],
        ['วันที่', 'รหัสเจ้าหน้าที่', 'ทันตแพทย์', 'HN (ปิดบางส่วน)', 'สิทธิ', 'รหัส DF ที่ระงับ', 'ยอดที่ระงับ', 'รายการที่รับรองในเคส', 'ยอดที่รับรอง', 'เหตุผล']];
      d.dropped.forEach(function (ca) {
        var k = ca.items.filter(function (i) { return i.keep; })[0];
        ca.items.forEach(function (it) {
          if (it.keep) return;
          s3.push([oldDate(ca.date), ca.dct, ca.dctName, ca.hn, ca.pttype, it.charge, it.base, k ? k.charge : '', k ? k.base : '', it.why]);
        });
      });
      s3.push(['ผลรวม', '', '', '', '', '', d.totals.drop]);
      sheets.push({ name: 'รายการระงับ', rows: s3, cols: [11, 13, 28, 14, 24, 13, 13, 14, 13, 50] });
    }
    var name = 'DF_ทันตกรรม_' + (o.det || o.sum ? 'รายงานเบิกจ่าย_' : 'รายการระงับ_') + hrCode(d.ym).replace('.', '-') + '.xlsx';
    return A.saveSheet(sheets, name);
  }

  /* ไฟล์นำเข้า HRMi — 1 ไฟล์ = 1 รหัสรายได้ · ช่อง "จำนวน" ใส่ยอดเต็ม 100% */
  function exportHrmi(d) {
    var head = ['รหัสพนักงาน', 'เลขบัตรประชาชน', 'รหัสรายได้ - รายหัก', 'จำนวน', 'รายได้ (บาท)', 'รายหัก (บาท)', 'รหัสงาน'];
    function sheetFor(code) {
      var rows = [head];
      d.byDoctor.forEach(function (x) { if (x.keep) rows.push([Number(x.dct), 0, code, x.keep, 0, 0, 0]); });
      return { name: code, rows: rows, cols: [14, 16, 20, 14, 13, 13, 11] };
    }
    A.dialog({
      title: 'ไฟล์นำเข้า HRMi — ' + A.ymThai(d.ym), icon: 'excel',
      sub: 'ช่อง "จำนวน" ใส่ยอดรับรองเต็ม 100% ต่อคน ให้ HRMi คำนวณสัดส่วนเอง (รูปแบบเดียวกับ R101-1 / R101-2)',
      body: '<table><tbody>' +
        '<tr><th style="position:static">จำนวนทันตแพทย์</th><td>' + n0(d.byDoctor.filter(function (x) { return x.keep > 0; }).length) + ' ท่าน</td></tr>' +
        '<tr><th style="position:static">ยอดรวมในไฟล์</th><td>' + n2(d.totals.keep) + ' บาท</td></tr>' +
        '<tr><th style="position:static">รหัสรายได้</th><td>' + esc(d.hrmi.pay) + ' (ส่วนแพทย์) · ' + esc(d.hrmi.hos) + ' (ส่วนโรงพยาบาล)</td></tr>' +
        '</tbody></table>' +
        (d.status !== 'closed' ? '<div class="msg warn" style="margin-top:12px">' + ic('warn') + '<span>รอบเดือนนี้ยังไม่ได้ปิดรอบ ยอดอาจเปลี่ยนได้อีก แนะนำให้ปิดรอบก่อน</span></div>' : ''),
      actions: [{ label: 'ยกเลิก', value: null }, { label: 'สร้างไฟล์ทั้ง 2 รหัส', icon: 'download', cls: 'accent', onClick: function () {
        return A.saveSheet([sheetFor(d.hrmi.pay)], d.hrmi.pay + '_' + d.ym + '.xlsx')
          .then(function () { return new Promise(function (r) { setTimeout(r, 600); }); })
          .then(function () { return A.saveSheet([sheetFor(d.hrmi.hos)], d.hrmi.hos + '_' + d.ym + '.xlsx'); });
      } }]
    });
  }

  /* ================= แดชบอร์ด ================= */
  var dsel = { q: '12m' };
  function dash(host) {
    var last = A.state.boot.lastDataDate || A.today();
    var fy = A.fyOf(last), r = A.fyRange(fy), rp = A.fyRange(fy - 1);
    var ym = last.slice(0, 7);
    var qStartM = [10, 1, 4, 7][Math.floor(((Number(ym.slice(5)) + 2) % 12) / 3)];
    var qy = Number(ym.slice(0, 4)) - (qStartM === 10 && Number(ym.slice(5)) < 10 ? 1 : 0);
    var qFrom = qy + '-' + ('0' + qStartM).slice(-2) + '-01';
    var Q = {
      '12m': { t: '12 เดือนล่าสุด', f: A.addMonths(ym, -11) + '-01', to: last },
      fy: { t: 'ปีงบ ' + fy, f: r.from, to: r.to < last ? r.to : last },
      fyp: { t: 'ปีงบ ' + (fy - 1), f: rp.from, to: rp.to },
      q: { t: 'ไตรมาสนี้', f: qFrom, to: last },
      m: { t: 'เดือนนี้', f: ym + '-01', to: last }
    };
    var sel = Q[dsel.q] || Q['12m'];
    host.innerHTML = '<div class="panel tool no-print"><div class="panel-b"><div class="seg">' +
      Object.keys(Q).map(function (k) { return '<button data-q="' + k + '" class="' + (k === dsel.q ? 'on' : '') + '">' + esc(Q[k].t) + '</button>'; }).join('') +
      '</div><span class="note">' + esc(A.dThai(sel.f)) + ' – ' + esc(A.dThai(sel.to)) + '</span><span class="spacer"></span>' +
      '<button class="btn sm" onclick="SMCDF.go(\'report\')">' + ic('report') + 'ดูตัวเลขละเอียด</button></div></div><div id="dBody">' + A.skeleton(4) + '</div>';
    host.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { dsel.q = b.getAttribute('data-q'); dash(host); }; });

    return A.cached('getDashboard', { from: sel.f, to: sel.to }, function (d) { render(d); });

    function render(d) {
      var t = d.totals, ms = d.months;
      var lastM = ms.filter(function (m) { return m.cases; }).slice(-1)[0] || {};
      var h = '<div class="kpis">' +
        kpi('ยอดรับรองจ่าย', n2(t.keep), 'แพทย์ ' + n2(t.pay80), 'hero', 'money') +
        kpi('ยอดที่ระงับ', n2(t.drop), t.base ? pct(t.drop / t.base) + ' ของยอดที่เก็บได้' : '', t.drop ? 'bad' : 'ok', 'cut') +
        kpi('จำนวนเคส', n0(t.cases), n0(t.days) + ' วันที่มีคลินิก · ' + n0(t.doctors) + ' ท่าน', '', 'cases') +
        kpi('อัตราการคีย์เกิน', pct(t.rate), 'เดือนล่าสุด ' + pct(lastM.rate || 0), t.rate > .2 ? 'bad' : '', 'warn', 'ร้อยละของเคสที่คีย์ DF มากกว่า 1 รายการ') +
        '</div>';
      if (!t.cases) { $('dBody').innerHTML = h + '<div class="panel">' + A.empty('ไม่มีข้อมูลในช่วงที่เลือก', 'ลองเลือกช่วงเวลาอื่น', 'dash') + '</div>'; return; }

      h += '<div class="g2">' +
        '<div class="panel"><div class="panel-h"><h3>' + ic('dash') + 'ยอดรายเดือน</h3><div class="sub">แท่งซ้อน: ยอดรับรอง + ยอดที่ระงับ = ยอดที่เก็บได้</div></div><div class="panel-b"><div class="chart" id="cMonth"></div></div></div>' +
        '<div class="panel"><div class="panel-h"><h3>' + ic('warn') + 'อัตราการคีย์ DF เกิน 1 รายเดือน</h3><div class="sub">ร้อยละของเคสที่มี DF มากกว่า 1 รายการ · กติกาเริ่มมีผล ' + esc(A.dThai(d.settings.ruleFrom)) + '</div></div><div class="panel-b"><div class="chart" id="cRate"></div></div></div>' +
        '</div>';
      h += '<div class="g2">' +
        '<div class="panel"><div class="panel-h"><h3>' + ic('tooth') + 'รายทันตแพทย์</h3><div class="sub">ยอดรับรองและยอดที่ระงับของแต่ละท่าน</div></div><div class="panel-b"><div class="chart lg" id="cDoc"></div></div></div>' +
        '<div class="panel"><div class="panel-h"><h3>' + ic('users') + 'สัดส่วนสิทธิการรักษา</h3><div class="sub">นับเป็นจำนวนเคส</div></div><div class="panel-b"><div class="chart lg" id="cRight"></div></div></div>' +
        '</div>';
      h += '<div class="g2">' +
        '<div class="panel"><div class="panel-h"><h3>' + ic('cal') + 'เคสตามวันในสัปดาห์</h3></div><div class="panel-b"><div class="chart sm" id="cWd"></div></div></div>' +
        '<div class="panel"><div class="panel-h"><h3>' + ic('code') + 'รหัส DF</h3></div><div class="panel-b flush wrap-x"><table class="rt"><thead><tr><th>รหัส</th><th class="n">รายการ</th><th class="n">รับรอง</th><th class="n">ระงับ</th></tr></thead><tbody>' +
        d.codes.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td class="n">' + n0(x.items) + '</td><td class="n">' + n2(x.keep) + '</td><td class="n">' + (x.drop ? n2(x.drop) : '-') + '</td></tr>'; }).join('') +
        '</tbody></table></div></div></div>';
      h += '<details class="panel"><summary class="panel-h"><h3>' + ic('code') + 'ตารางข้อมูลรายเดือน</h3>' + ic('down', 'chev') + '</summary><div class="panel-b flush wrap-x"><table class="rt"><thead><tr><th>เดือน</th><th class="n">วัน</th><th class="n">ท่าน</th>' +
        '<th class="n">เคส</th><th class="n">คีย์เกิน</th><th class="n">อัตรา</th><th class="n">ยอดที่เก็บได้</th><th class="n">รับรอง</th><th class="n">ระงับ</th></tr></thead><tbody>' +
        ms.slice().reverse().map(function (m) {
          return '<tr><td>' + esc(A.ymThai(m.key)) + '</td><td class="n">' + n0(m.days) + '</td><td class="n">' + n0(m.doctors) + '</td><td class="n">' + n0(m.cases) + '</td>' +
            '<td class="n">' + n0(m.over) + '</td><td class="n">' + pct(m.rate) + '</td><td class="n">' + n2(m.base) + '</td><td class="n">' + n2(m.keep) + '</td>' +
            '<td class="n">' + (m.drop ? '<span class="badge bad">' + n2(m.drop) + '</span>' : '-') + '</td></tr>';
        }).join('') + '</tbody></table></div></details>';

      $('dBody').innerHTML = h;
      A.cardify($('dBody'));
      var labels = ms.map(function (m) { return A.ymShort(m.key); });
      CH.bar($('cMonth'), { aria: 'ยอดรายเดือน', labels: labels, stacked: true, series: [
        { label: 'รับรอง', data: ms.map(function (m) { return m.keep; }), color: getVar('--c-keep') },
        { label: 'ระงับ', data: ms.map(function (m) { return m.drop; }), color: getVar('--c-drop') }],
        onClick: function (i) { A.go('month', ms[i].key); } });
      CH.line($('cRate'), { aria: 'อัตราการคีย์เกิน', labels: labels, fmt: function (v) { return v.toFixed(1) + '%'; }, axisFmt: function (v) { return v + '%'; },
        series: [{ label: 'อัตราการคีย์เกิน', data: ms.map(function (m) { return m.cases ? +(m.rate * 100).toFixed(1) : null; }), color: getVar('--accent') }] });
      var docs = d.doctors.slice(0, 15);
      $('cDoc').style.height = Math.max(240, docs.length * 34 + 60) + 'px';
      CH.bar($('cDoc'), { aria: 'รายทันตแพทย์', horizontal: true, stacked: true, thick: 22, labels: docs.map(function (x) { return x.label; }), series: [
        { label: 'รับรอง', data: docs.map(function (x) { return x.keep; }), color: getVar('--c-keep') },
        { label: 'ระงับ', data: docs.map(function (x) { return x.drop; }), color: getVar('--c-drop') }] });
      var rg = d.rights.slice(0, 6), other = d.rights.slice(6).reduce(function (a, x) { return a + x.cases; }, 0);
      CH.donut($('cRight'), { aria: 'สัดส่วนสิทธิ', labels: rg.map(function (x) { return x.label; }).concat(other ? ['อื่น ๆ'] : []), data: rg.map(function (x) { return x.cases; }).concat(other ? [other] : []), fmt: function (v) { return n0(v) + ' เคส'; } });
      CH.bar($('cWd'), { aria: 'เคสตามวันในสัปดาห์', labels: d.weekdays.map(function (x) { return x.label; }), fmt: function (v) { return n0(v) + ' เคส'; }, axisFmt: n0,
        series: [{ label: 'เคส', data: d.weekdays.map(function (x) { return x.cases; }), color: getVar('--c3') }] });
    }
  }
  function getVar(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  /* ================= ตั้งค่า ================= */
  var stab = 'rule';
  function settings(host, arg) {
    if (arg) stab = arg;
    return A.api('getSettings', {}).then(function (d) {
      var pend = d.dfCodes.filter(function (x) { return x.status === 'pending'; }).length;
      var tabs = [['rule', 'กติกาและการจ่าย'], ['codes', 'รหัส DF', pend], ['data', 'สถานะข้อมูล'], ['conn', 'การเชื่อมต่อ'], ['rights', 'สิทธิการรักษา'],
        ['price', 'เพดานราคา DF'], ['users', 'ผู้ใช้'], ['doc', 'เอกสารและผู้ลงนาม'], ['log', 'ประวัติ']];
      host.innerHTML = '<div class="panel"><div class="tabs">' + tabs.map(function (t) {
        return '<button data-tab="' + t[0] + '" class="' + (t[0] === stab ? 'on' : '') + '">' + esc(t[1]) + (t[2] ? '<span class="cnt">' + t[2] + '</span>' : '') + '</button>';
      }).join('') + '</div><div class="panel-b" id="setBody"></div></div>';
      host.querySelectorAll('[data-tab]').forEach(function (b) {
        b.onclick = function () {
          stab = b.getAttribute('data-tab');
          host.querySelectorAll('[data-tab]').forEach(function (x) { x.classList.toggle('on', x === b); });
          show(stab, d);
        };
      });
      show(stab, d);
    });

    function fld(key, label, val, type, note) {
      return '<label class="fld"><span>' + esc(label) + '</span>' +
        '<input id="st_' + key + '" type="' + (type || 'text') + '" value="' + esc(val) + '">' +
        (note ? '<small class="note">' + note + '</small>' : '') + '</label>';
    }
    function saveBtn(keys) {
      return '<div class="btns end" style="margin-top:8px"><button class="btn primary" data-save="' + keys.join(',') + '">' + ic('check') + 'บันทึก</button></div>';
    }
    function bindSave(h2) {
      h2.querySelectorAll('[data-save]').forEach(function (b) {
        b.onclick = function () {
          var patch = {};
          b.getAttribute('data-save').split(',').forEach(function (k) { var el = $('st_' + k); if (el) patch[k] = el.value; });
          A.run(b, function () { return A.api('saveSettings', { patch: patch }); }, { busy: 'กำลังบันทึก…', ok: 'บันทึกการตั้งค่าแล้ว' })
            .then(function () { for (var k in patch) d.settings[k] = patch[k]; }, function () { });
        };
      });
    }

    /* ---------- สถานะข้อมูล: ดึงครบหรือยัง ---------- */
    function dataStatus() {
      var box = $('dsBox'); if (!box) return;
      A.api('getDataStatus', {}, { silent: true }).then(function (r) {
        if (!$('dsBox')) return;
        var miss = r.months.filter(function (m) { return m.state !== 'ok'; });
        var bf = r.backfill, head;
        if (!miss.length) head = '<div class="msg ok">' + ic('ok') + '<span><b>ข้อมูลครบทุกเดือน</b> ตั้งแต่ ' + esc(A.dThai(r.from)) + ' ถึงวันนี้ — ระบบเคยดึงจาก API โรงพยาบาลครบทุกวันแล้ว</span></div>';
        else head = '<div class="msg warn">' + ic('warn') + '<span><b>ยังดึงไม่ครบ ' + miss.length + ' เดือน</b>: ' + miss.map(function (m) { return esc(A.ymThai(m.ym)); }).join(', ') +
          (bf.running ? '<br>ระบบกำลังทยอยดึงเบื้องหลังอยู่ (ถึงวันที่ ' + esc(A.dThai(bf.at)) + ') — หรือกด "ดึงเดือนที่ขาดทั้งหมด" เพื่อดึงเดี๋ยวนี้' : '<br>กด "ดึงเดือนที่ขาดทั้งหมด" เพื่อดึงเดี๋ยวนี้ (ต้องเปิดหน้านี้ค้างไว้จนเสร็จ ประมาณเดือนละ 1–3 นาที)') + '</span></div>';
        var bfLine = '<p class="note">การดึงย้อนหลังเบื้องหลัง: ' +
          (bf.done ? 'เสร็จแล้วเมื่อ ' + esc(A.dtThai(bf.done)) : bf.running ? 'กำลังทำงาน · ถึงวันที่ ' + esc(A.dThai(bf.at)) : bf.at ? 'หยุดอยู่ที่วันที่ ' + esc(A.dThai(bf.at)) + ' (ยังไม่จบ)' : 'ยังไม่เคยเริ่ม') +
          ' · "ดึงแล้ว" นับจากบันทึกการดึงที่สำเร็จ · เดือนที่ดึงครบแต่ไม่มีวันคลินิก = API ไม่มีรายการ DF ทันตกรรมในเดือนนั้น</p>';
        var tb = '<div class="wrap-x"><table class="rt"><thead><tr><th>เดือน</th><th>ดึงจาก API แล้ว</th><th class="n">วันที่มีคลินิก</th><th class="n">เคส</th><th class="n">ยอดรับรอง</th><th>รอบเบิก</th><th class="no-print"></th></tr></thead><tbody>' +
          r.months.slice().reverse().map(function (m) {
            var pc = m.allDays ? Math.round(m.coverDays * 100 / m.allDays) : 0;
            var badge = m.state === 'ok' ? '<span class="badge ok">ครบ</span>' : m.state === 'part' ? '<span class="badge warn">' + m.coverDays + '/' + m.allDays + ' วัน</span>' : '<span class="badge bad">ยังไม่ได้ดึง</span>';
            return '<tr><td><b>' + esc(A.ymThai(m.ym)) + '</b></td>' +
              '<td>' + badge + '<div class="bar" style="margin-top:4px"><i style="width:' + pc + '%"></i></div></td>' +
              '<td class="n">' + n0(m.clinicDays) + '</td><td class="n">' + n0(m.cases) + '</td><td class="n">' + n2(m.keep) + '</td>' +
              '<td>' + (m.status === 'closed' ? '<span class="badge">ปิดแล้ว</span>' : m.clinicDays ? '<span class="badge info">เปิดอยู่</span>' : '-') + '</td>' +
              '<td class="no-print"><button class="btn sm" data-sm="' + m.ym + '">' + ic('sync') + 'ดึงใหม่</button></td></tr>';
          }).join('') + '</tbody></table></div>';
        var fails = r.fails.length ? '<details style="margin-top:12px"><summary class="note">ดึงไม่สำเร็จล่าสุด ' + r.fails.length + ' ครั้ง</summary><ul class="note">' +
          r.fails.map(function (f) { return '<li>' + esc(A.dtThai(f.at)) + ' · ' + esc(f.range) + ' · ' + esc(String(f.detail || '').slice(0, 200)) + '</li>'; }).join('') + '</ul></details>' : '';
        $('dsBox').innerHTML = head + bfLine +
          '<div class="btns" style="margin-bottom:12px">' +
          (miss.length ? '<button class="btn primary" id="dsAll">' + ic('download') + 'ดึงเดือนที่ขาดทั้งหมด (' + miss.length + ')</button>' : '') +
          '<button class="btn" id="dsRe">' + ic('refresh') + 'ตรวจสถานะอีกครั้ง</button>' +
          '<button class="btn ghost" id="dsRb" title="ใช้เมื่อหน้าเบิกรายเดือนแสดงเดือนไม่ครบ ทั้งที่ดูรายวันได้">' + ic('sync') + 'สร้างสรุปรายเดือนใหม่</button></div>' +
          tb + fails;
        A.cardify($('dsBox'));
        $('dsRe').onclick = function () { $('dsBox').innerHTML = A.loading('กำลังตรวจ…'); dataStatus(); };
        $('dsRb').onclick = function () {
          A.run(this, function () { return A.api('rebuildSummaries', {}); }, { busy: 'กำลังสร้างสรุปใหม่…', ok: function (x) { return 'สร้างสรุปใหม่แล้ว ' + n0(x.days) + ' วัน'; } })
            .then(function () { return A.reloadBoot(); }).then(dataStatus, function () { });
        };
        $('dsBox').querySelectorAll('[data-sm]').forEach(function (bt) {
          bt.onclick = function () {
            var ym = bt.getAttribute('data-sm');
            A.syncMonth(ym, bt).then(function (x) { A.ok('ดึง ' + A.ymThai(ym) + ' แล้ว ' + n0(x.rows) + ' รายการ', 'ดึงข้อมูลเสร็จแล้ว'); dataStatus(); }, function () { });
          };
        });
        if ($('dsAll')) $('dsAll').onclick = function () {
          var btn = this, list = miss.map(function (m) { return m.ym; }), i = 0, total = 0;
          (function next() {
            if (i >= list.length) { A.ok('ดึงครบ ' + list.length + ' เดือนแล้ว รวม ' + n0(total) + ' รายการ', 'ดึงข้อมูลเสร็จแล้ว'); dataStatus(); return; }
            var ym = list[i++];
            A.syncMonth(ym, btn).then(function (x) { total += x.rows; next(); }, function () { dataStatus(); });
          })();
        };
      }).catch(function (e) { if ($('dsBox')) $('dsBox').innerHTML = A.errBox(e); });
    }

    function show(tab, d) {
      var s = d.settings, b = $('setBody'), h = '';
      if (tab === 'rule') {
        h = '<div class="g3">' +
          '<label class="fld"><span>กติกาการตัด DF</span><select id="st_ruleMode">' +
          '<option value="A"' + (s.ruleMode === 'A' ? ' selected' : '') + '>A — รับรอง DF สูงสุดเพียงรายการเดียวต่อเคส</option>' +
          '<option value="B"' + (s.ruleMode === 'B' ? ' selected' : '') + '>B — รับรอง DF สูงสุดประเภทละ 1 รายการ</option>' +
          '</select><small class="note">กติกา A คือมติที่ใช้ตั้งแต่ปีงบประมาณ 2570</small></label>' +
          fld('ruleFrom', 'กติกาเริ่มมีผลวันที่', s.ruleFrom, 'date', 'ก่อนวันนี้ระบบรับรองทุกรายการตามที่ระบบโรงพยาบาลจ่ายจริง') +
          fld('sharePct', 'ส่วนแบ่งของแพทย์', s.sharePct, 'text', 'ใส่เป็นทศนิยม เช่น 0.8 = 80% · ส่วนโรงพยาบาลคือส่วนที่เหลือ') +
          fld('incomeCodePay', 'รหัสรายได้ HRMi — ส่วนแพทย์', s.incomeCodePay) +
          fld('incomeCodeHos', 'รหัสรายได้ HRMi — ส่วนโรงพยาบาล', s.incomeCodeHos) +
          '<label class="fld"><span>ประกันรายได้ทันตแพทย์ (R124)</span><select id="st_guaranteeOn">' +
          '<option value="off"' + (s.guaranteeOn === 'off' ? ' selected' : '') + '>ปิดใช้งาน</option>' +
          '<option value="on"' + (s.guaranteeOn === 'on' ? ' selected' : '') + '>เปิดใช้งาน</option>' +
          '</select><small class="note">ปัจจุบันปิดอยู่ ต้องขออนุมัติเป็นรอบ</small></label>' +
          fld('guaranteeAmt', 'เกณฑ์ประกันรายได้ต่อเวร (บาท)', s.guaranteeAmt, 'number', 'ถ้ารายได้ของเวรวันนั้นต่ำกว่าเกณฑ์ จ่ายเท่าเกณฑ์แทนยอดเดิม') +
          '</div>' + saveBtn(['ruleMode', 'ruleFrom', 'sharePct', 'incomeCodePay', 'incomeCodeHos', 'guaranteeOn', 'guaranteeAmt']);
      }
      if (tab === 'codes') h = codesHtml(d);
      if (tab === 'data') h = '<div id="dsBox">' + A.loading('กำลังตรวจว่าข้อมูลแต่ละเดือนดึงครบหรือยัง…') + '</div>';
      if (tab === 'conn') {
        h = '<h4 style="margin:0 0 10px">' + ic('sync') + ' API ระบบสารสนเทศโรงพยาบาล</h4><div class="g3">' +
          fld('apiBase', 'ที่อยู่ API ของโรงพยาบาล', s.apiBase) +
          fld('apiReport', 'ชื่อรายงาน (report)', s.apiReport) +
          fld('apiToken', 'token (ถ้าไอทีล็อก)', s.apiToken, 'text', 'เก็บในฐานข้อมูลหลังบ้าน ไม่อยู่บน GitHub') +
          fld('recheckDays', 'ตรวจยอดย้อนหลัง (วัน)', s.recheckDays, 'number', 'ค่าแนะนำ 45 วัน ครอบคลุมถึงวันปิดรอบเบิก') +
          fld('backfillFrom', 'ดึงข้อมูลย้อนหลังตั้งแต่', s.backfillFrom, 'date') +
          '</div><div class="btns"><button class="btn" id="tApi">' + ic('sync') + 'ทดสอบ API โรงพยาบาล</button>' +
          '<button class="btn" id="tBack">' + ic('download') + 'เริ่มดึงข้อมูลย้อนหลัง</button></div>' +
          '<hr style="border:0;border-top:1px solid var(--line);margin:20px 0">' +
          '<h4 style="margin:0 0 4px">' + ic('staff') + ' ตารางเวรจาก SMC Duty</h4><p class="note" style="margin:0 0 12px">ต้องติดตั้งแพ็ก DailyFeed <b>รุ่น 2</b> ใน SMC Duty (รุ่นเก่าส่งเฉพาะตำแหน่งของคลินิกพิเศษฯ จึงไม่พบเจ้าหน้าที่ทันตกรรม)</p><div class="g3">' +
          fld('dutyUrl', 'ลิงก์ /exec ของ SMC Duty', s.dutyUrl) +
          fld('dutyKey', 'รหัสลับร่วมกับ SMC Duty', s.dutyKey, 'text', 'ค่าเดียวกับ DAILY_FEED_KEY ใน SMC Duty') +
          fld('dutyClinic', 'ชื่อคลินิกใน SMC Duty', s.dutyClinic, 'text', 'ตำแหน่งทันตกรรมอยู่ใน "คลินิกทันตกรรมนอกเวลาราชการ"') +
          fld('dutyPositions', 'ตำแหน่งที่ดึงมาแสดง', s.dutyPositions, 'text', 'คั่นด้วย | · ใส่ชื่อกลุ่ม "ทันตกรรม" อย่างเดียวก็ได้') +
          '</div><div class="btns"><button class="btn" id="tDuty">' + ic('staff') + 'ทดสอบ SMC Duty</button><span class="spacer"></span>' +
          '<button class="btn primary" data-save="apiBase,apiReport,apiToken,recheckDays,backfillFrom,dutyUrl,dutyKey,dutyClinic,dutyPositions">' + ic('check') + 'บันทึก</button></div>' +
          '<div id="connMsg" style="margin-top:14px"></div>';
      }
      if (tab === 'rights') {
        h = '<p class="note" style="margin-top:0">จับคู่สิทธิการรักษาที่พบในข้อมูลจริงเข้ากับกลุ่มสิทธิ เพื่อใช้ในรายงานและแดชบอร์ด</p>' +
          '<div class="wrap-x"><table class="rt"><thead><tr><th>สิทธิการรักษา (ตามระบบโรงพยาบาล)</th><th>กลุ่มสิทธิ</th></tr></thead><tbody>' +
          d.rights.map(function (r, i) {
            return '<tr><td>' + esc(r.name) + '</td><td><select class="inp sm" data-rg="' + i + '" data-name="' + esc(r.name) + '">' +
              d.rightGroups.map(function (g) { return '<option value="' + esc(g) + '"' + (g === r.grp ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="btns end" style="margin-top:10px"><button class="btn primary" id="rgSave">' + ic('check') + 'บันทึก</button></div>';
      }
      if (tab === 'price') {
        var byCharge = {};
        d.priceRules.forEach(function (r) { byCharge[r.charge] = r; });
        h = '<p class="note" style="margin-top:0">ตั้งช่วงราคาที่ถือว่าปกติของแต่ละรหัส DF ระบบจะขึ้นธงเตือนรายการที่อยู่นอกช่วง · เว้นว่าง = ไม่ตรวจ</p>' +
          '<div class="wrap-x"><table class="rt"><thead><tr><th>รหัส</th><th>ความหมาย</th><th>ต่ำสุด (บาท)</th><th>สูงสุด (บาท)</th><th>หมายเหตุ</th></tr></thead><tbody>' +
          d.dfCodes.filter(function (c) { return c.status !== 'ignore'; }).map(function (c) {
            var r = byCharge[c.code] || {};
            return '<tr data-pr="' + esc(c.code) + '"><td>' + esc(c.code) + '</td><td>' + esc(c.label) + '</td>' +
              '<td><input class="inp sm" data-k="minAmt" type="number" value="' + esc(r.minAmt || '') + '" style="width:110px"></td>' +
              '<td><input class="inp sm" data-k="maxAmt" type="number" value="' + esc(r.maxAmt || '') + '" style="width:110px"></td>' +
              '<td><input class="inp sm" data-k="note" value="' + esc(r.note || '') + '" style="width:100%"></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="btns" style="margin-top:10px"><button class="btn" id="prCheck">' + ic('filter') + 'ตรวจรายการที่ผิดเกณฑ์</button>' +
          '<span class="spacer"></span><button class="btn primary" id="prSave">' + ic('check') + 'บันทึก</button></div><div id="prOut" style="margin-top:12px"></div>';
      }
      if (tab === 'users') {
        h = '<div class="btns" style="margin-bottom:12px"><button class="btn primary" id="uAdd">' + ic('plus') + 'เพิ่มผู้ใช้</button>' +
          '<span class="note" style="align-self:center">ผู้ใช้เปลี่ยนรหัสผ่านเองได้ที่เมนูบัญชีของฉัน · ปุ่ม "ตั้งรหัสใหม่" ใช้เมื่อผู้ใช้ลืมรหัสผ่าน</span></div>' +
          '<div class="wrap-x"><table class="rt"><thead><tr><th>ชื่อ</th><th>รหัส</th><th>ตำแหน่ง</th><th>บทบาท</th>' +
          '<th>รหัสทันตแพทย์</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th></th></tr></thead><tbody>' +
          d.users.map(function (u) {
            return '<tr><td>' + esc(u.name) + '</td><td>' + esc(u.empCode) + '</td><td>' + esc(u.title) + '</td>' +
              '<td>' + esc(String(u.roles || '').split(',').map(function (r) { return ({ admin: 'ผู้ดูแลระบบ', hr: 'HR', head: 'ผู้บริหาร', doctor: 'ทันตแพทย์' })[r] || r; }).join(' · ')) + '</td>' +
              '<td>' + esc(u.dct || '-') + '</td>' +
              '<td>' + (u.active === 'Y' ? '<span class="badge ok">ใช้งาน</span>' : '<span class="badge">ปิด</span>') + '</td>' +
              '<td>' + esc(u.lastLogin || '-') + '</td>' +
              '<td><div class="btns"><button class="btn sm" data-ue="' + esc(u.empCode) + '">' + ic('edit') + 'แก้ไข</button>' +
              '<button class="btn sm" data-ur="' + esc(u.empCode) + '">' + ic('key') + 'ตั้งรหัสใหม่</button></div></td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      if (tab === 'doc') {
        h = '<p class="note" style="margin-top:0">ข้อความเหล่านี้พิมพ์บนใบรายงานประจำวัน และรายงานส่งเบิก HR (รูปแบบเดียวกับรายงานเบิกจ่ายเดิม)</p><div class="g3">' +
          fld('reportTitle', 'ชื่อรายงานประจำวัน', s.reportTitle) +
          fld('hrHeadLeft', 'หัวกระดาษซ้ายของรายงานเบิก', s.hrHeadLeft) +
          fld('hrTitle', 'ชื่อรายงานเบิก', s.hrTitle, 'text', 'ระบบต่อท้ายด้วย "ประจำเดือน … รอบจ่ายเดือน …" ให้เอง') +
          '<label class="fld"><span>ชื่อทันตแพทย์ในรายงานเบิก</span><select id="st_hrFullTitle"><option value="Y"' + (s.hrFullTitle !== 'N' ? ' selected' : '') + '>เต็ม (ทันตแพทย์ / ทันตแพทย์หญิง)</option><option value="N"' + (s.hrFullTitle === 'N' ? ' selected' : '') + '>ย่อ (ทพ. / ทพญ.)</option></select></label>' +
          fld('contactLine', 'ข้อความติดต่อท้ายรายงาน', s.contactLine) +
          '</div><h4 style="margin:10px 0">ช่องลงนาม</h4><div class="g3">' +
          fld('signer1Label', 'ช่องที่ 1 — ข้อความเหนือเส้น', s.signer1Label) +
          fld('signer1Name', 'ช่องที่ 1 — ชื่อ', s.signer1Name) +
          fld('signer1Title', 'ช่องที่ 1 — ตำแหน่ง', s.signer1Title) +
          fld('signer2Label', 'ช่องที่ 2 — ข้อความเหนือเส้น', s.signer2Label) +
          fld('signer2Name', 'ช่องที่ 2 — ชื่อ', s.signer2Name) +
          fld('signer2Title', 'ช่องที่ 2 — ตำแหน่ง', s.signer2Title) +
          '</div>' + saveBtn(['reportTitle', 'hrHeadLeft', 'hrTitle', 'hrFullTitle', 'contactLine', 'signer1Label', 'signer1Name', 'signer1Title', 'signer2Label', 'signer2Name', 'signer2Title']);
      }
      if (tab === 'log') h = '<div id="logBox">' + A.loading() + '</div>';

      b.innerHTML = h;
      A.cardify(b);
      bindSave(b);

      if (tab === 'codes') bindCodes(b, d);
      if (tab === 'data') dataStatus();
      if (tab === 'conn') {
        $('tApi').onclick = function () {
          var btn = this;
          A.run(btn, function () { return A.api('testApi', { date: A.today() }); }, { busy: 'กำลังทดสอบ…' }).then(function (r) {
            $('connMsg').innerHTML = '<div class="msg ok">' + ic('ok') + '<span>เชื่อมต่อ API สำเร็จใน ' + n0(r.ms) + ' มิลลิวินาที · วันนี้มี ' + r.rows + ' รายการ</span></div>' +
              (r.sample.length ? '<pre style="font-size:11px;overflow:auto;background:var(--card-2);padding:10px;border-radius:8px;max-height:200px">' + esc(JSON.stringify(r.sample, null, 1)) + '</pre>' : '');
          }, function (e) { $('connMsg').innerHTML = A.errBox(e); });
        };
        $('tDuty').onclick = function () {
          var btn = this;
          A.run(btn, function () { return A.api('testDuty', { date: A.today() }); }, { busy: 'กำลังทดสอบ…' }).then(function (r) {
            var h2;
            if (!r.ok) h2 = '<div class="msg err">' + ic('err') + '<span>' + esc(r.reason) + '</span></div>';
            else if (r.warn) h2 = '<div class="msg warn">' + ic('warn') + '<span><b>เชื่อมต่อได้ แต่ยังดึงเจ้าหน้าที่ทันตกรรมไม่ได้</b><br>' + esc(r.warn) + '</span></div>';
            else {
              h2 = '<div class="msg ok">' + ic('ok') + '<span><b>เชื่อมต่อ SMC Duty สำเร็จ</b> · DailyFeed รุ่น ' + r.feedVersion + ' · พบตำแหน่งทันตกรรม ' + r.positionsFound + ' ตำแหน่ง · วันนี้มีเจ้าหน้าที่ ' + r.list.length + ' คน</span></div>';
              var lst = r.list.length ? r.list : (r.sample ? r.sample.list : []);
              if (r.sample && !r.list.length) h2 += '<p class="note">วันนี้ไม่มีเวรทันตกรรม — ตัวอย่างจากวันที่ ' + esc(A.dThai(r.sample.date)) + ':</p>';
              if (lst.length) h2 += '<ul class="note">' + lst.map(function (x) { return '<li>' + esc(x.fullName) + ' — ' + esc(x.positionName) + (x.slot ? ' (' + esc(x.slot) + ')' : '') + '</li>'; }).join('') + '</ul>';
              else h2 += '<p class="note">ไม่พบเวรทันตกรรมในวันนี้และ 14 วันย้อนหลัง — ตรวจว่ามีการจัดเวรตำแหน่งทันตกรรมใน SMC Duty แล้ว</p>';
            }
            $('connMsg').innerHTML = h2;
          }, function (e) { $('connMsg').innerHTML = A.errBox(e); });
        };
        $('tBack').onclick = function () {
          var btn = this;
          A.confirm({ title: 'เริ่มดึงข้อมูลย้อนหลัง?', sub: 'ตั้งแต่ ' + A.dThai($('st_backfillFrom').value) + ' — ระบบจะทยอยดึงเบื้องหลังครั้งละ 14 วัน ใช้เวลาประมาณ 1–2 ชั่วโมง ไม่ต้องเปิดหน้าค้างไว้', ok: 'เริ่มดึง' })
            .then(function (y) {
              if (!y) return;
              A.run(btn, function () { return A.api('startBackfill', { from: $('st_backfillFrom').value }); }, { ok: function (r) { return 'เริ่มดึงข้อมูลย้อนหลังตั้งแต่ ' + A.dThai(r.from) + ' แล้ว'; } }).catch(function () { });
            });
        };
      }
      if (tab === 'rights') {
        $('rgSave').onclick = function () {
          var list = [];
          b.querySelectorAll('[data-rg]').forEach(function (sel) { list.push({ name: sel.getAttribute('data-name'), grp: sel.value }); });
          A.run(this, function () { return A.api('saveRightGroups', { list: list }); }, { ok: 'บันทึกกลุ่มสิทธิแล้ว' }).catch(function () { });
        };
      }
      if (tab === 'price') {
        var collect = function () {
          var list = [];
          b.querySelectorAll('[data-pr]').forEach(function (tr) {
            var o = { charge: tr.getAttribute('data-pr') };
            tr.querySelectorAll('[data-k]').forEach(function (i) { o[i.getAttribute('data-k')] = i.value; });
            if (o.minAmt || o.maxAmt) list.push(o);
          });
          return list;
        };
        $('prSave').onclick = function () { A.run(this, function () { return A.api('savePriceRules', { list: collect() }); }, { ok: 'บันทึกเพดานราคาแล้ว' }).catch(function () { }); };
        $('prCheck').onclick = function () {
          A.run(this, function () { return A.api('getPriceAlerts', {}); }, { busy: 'กำลังตรวจ…' }).then(function (r) {
            if (!r.rules) { $('prOut').innerHTML = '<div class="msg info">' + ic('info') + '<span>ยังไม่ได้ตั้งเพดานราคา — ใส่ช่วงราคาแล้วกดบันทึกก่อน</span></div>'; return; }
            if (!r.list.length) { $('prOut').innerHTML = '<div class="msg ok">' + ic('ok') + '<span>ไม่พบรายการที่อยู่นอกเกณฑ์</span></div>'; return; }
            $('prOut').innerHTML = '<div class="msg warn">' + ic('warn') + '<span>พบ ' + r.list.length + ' รายการที่อยู่นอกเกณฑ์' + (r.truncated ? ' (แสดง 500 รายการแรก)' : '') + '</span></div>' +
              '<div class="wrap-x scroll"><table class="rt"><thead><tr><th>วันที่</th><th>ทันตแพทย์</th><th>HN</th><th>รหัส</th><th class="n">ยอด</th><th>ปัญหา</th></tr></thead><tbody>' +
              r.list.map(function (x) {
                return '<tr><td>' + esc(A.dThai(x.date)) + '</td><td>' + esc(x.dctName) + '</td><td>' + esc(x.hn) + '</td><td>' + esc(x.charge) + '</td><td class="n">' + n2(x.total) + '</td>' +
                  '<td><span class="badge warn">' + esc(x.issue) + '</span></td></tr>';
              }).join('') + '</tbody></table></div>';
            A.cardify($('prOut'));
          }, function () { });
        };
      }
      if (tab === 'users') {
        $('uAdd').onclick = function () { userForm({}, d); };
        b.querySelectorAll('[data-ue]').forEach(function (x) {
          x.onclick = function () { userForm(d.users.filter(function (y) { return y.empCode === x.getAttribute('data-ue'); })[0], d); };
        });
        b.querySelectorAll('[data-ur]').forEach(function (x) {
          x.onclick = function () {
            var code = x.getAttribute('data-ur');
            A.askPassword({ title: 'ตั้งรหัสผ่านใหม่ให้ ' + code, ok: 'ตั้งรหัสใหม่', sub: 'รหัสผ่านใหม่จะเป็นรหัสเจ้าหน้าที่ และผู้ใช้ต้องเปลี่ยนเมื่อเข้าใช้ครั้งถัดไป',
              run: function (pw) { return A.api('resetUserPass', { empCode: code, password: pw }).then(function (r) { A.ok(r.note, 'ตั้งรหัสใหม่แล้ว'); }); } });
          };
        });
      }
      if (tab === 'log') {
        A.api('getLogs', { limit: 200 }).then(function (r) {
          $('logBox').innerHTML =
            '<h4 style="margin:0 0 8px">ประวัติการใช้งาน</h4><div class="wrap-x scroll"><table class="rt"><thead><tr>' +
            '<th>การกระทำ</th><th>เวลา</th><th>ผู้ใช้</th><th>เป้าหมาย</th><th>รายละเอียด</th></tr></thead><tbody>' +
            r.audit.map(function (a) {
              return '<tr><td>' + esc(a.action) + '</td><td>' + esc(a.at) + '</td><td>' + esc(a.by) + '</td><td>' + esc(String(a.target).slice(0, 80)) + '</td><td>' + esc(a.detail) + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<h4 style="margin:18px 0 8px">ประวัติการดึงข้อมูล</h4><div class="wrap-x scroll"><table class="rt"><thead><tr>' +
            '<th>ช่วง</th><th>เวลา</th><th class="n">รายการ</th><th>สถานะ</th><th>รายละเอียด</th></tr></thead><tbody>' +
            r.fetch.map(function (f) {
              return '<tr><td>' + esc(f.range) + '</td><td>' + esc(f.at) + '</td><td class="n">' + esc(f.rows) + '</td>' +
                '<td>' + (f.status === 'สำเร็จ' ? '<span class="badge ok">สำเร็จ</span>' : '<span class="badge bad">' + esc(f.status) + '</span>') + '</td>' +
                '<td>' + esc(f.detail) + '</td></tr>';
            }).join('') + '</tbody></table></div>';
          A.cardify($('logBox'));
        }).catch(function (e) { $('logBox').innerHTML = A.errBox(e); });
      }
    }

    /* ---------- ทะเบียนรหัส DF ---------- */
    function codesHtml(d) {
      var pend = d.dfCodes.filter(function (x) { return x.status === 'pending'; });
      return '<div class="msg info">' + ic('info') + '<span><b>รหัส DF ใหม่ทำงานอย่างไร</b> — เมื่อฝ่ายไอทีเพิ่มรหัส DF ใน API ระบบจะเห็นเองและตั้งเป็น <b>รอยืนยัน</b> (ยังไม่นับจ่าย) ' +
        'ผู้ดูแลระบบเลือกประเภท (ตรวจ / หัตถการ — ใช้กับกติกา) ตั้งชื่อ แล้วเปลี่ยนเป็น <b>นับจ่าย</b> ระบบจะคำนวณยอดของวันที่เกี่ยวข้องใหม่ทั้งหมด · ' +
        'ถ้าเดือนนั้นปิดรอบแล้ว ยอดที่เพิ่มจะเป็นยอดตกเบิกให้อัตโนมัติ · เพิ่มรหัสล่วงหน้าได้ด้วยปุ่ม "เพิ่มรหัส"</span></div>' +
        (pend.length ? '<div class="msg warn">' + ic('warn') + '<span>มีรหัสรอยืนยัน ' + pend.length + ' รหัส: <b>' + esc(pend.map(function (x) { return x.code; }).join(', ')) + '</b></span></div>' : '') +
        '<div class="wrap-x"><table class="rt" id="codeTbl"><thead><tr><th>รหัส</th><th>ชื่อที่แสดง</th><th>ประเภท</th><th>สถานะ</th><th class="n">พบในข้อมูล</th><th>ช่วงที่พบ</th><th>หมายเหตุ</th></tr></thead><tbody>' +
        d.dfCodes.map(codeRow).join('') + '</tbody></table></div>' +
        '<div class="btns" style="margin-top:12px"><button class="btn" id="cdAdd">' + ic('plus') + 'เพิ่มรหัส</button><span class="spacer"></span>' +
        '<button class="btn primary" id="cdSave">' + ic('check') + 'บันทึกและคำนวณใหม่</button></div>';
      function codeRow(x) {
        return '<tr data-code="' + esc(x.code) + '"' + (x.status === 'pending' ? ' style="background:var(--warn-bg)"' : '') + '><td><b>' + esc(x.code) + '</b></td>' +
          '<td><input class="inp sm" data-k="label" value="' + esc(x.label) + '" style="min-width:200px"></td>' +
          '<td><select class="inp sm" data-k="type">' + d.dfTypes.map(function (t) { return '<option' + (t === x.type ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></td>' +
          '<td><select class="inp sm" data-k="status">' + [['active', 'นับจ่าย'], ['pending', 'รอยืนยัน'], ['ignore', 'ไม่นับ']].map(function (t) {
            return '<option value="' + t[0] + '"' + (t[0] === x.status ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></td>' +
          '<td class="n">' + n0(x.items) + ' รายการ<span class="sub-t">' + n2(x.base) + ' บาท</span></td>' +
          '<td>' + (x.firstSeen ? esc(A.dThai(x.firstSeen)) + ' – ' + esc(A.dThai(x.lastSeen)) : '-') + '</td>' +
          '<td><input class="inp sm" data-k="note" value="' + esc(x.note) + '" style="min-width:160px"></td></tr>';
      }
    }
    function bindCodes(b, d) {
      $('cdAdd').onclick = function () {
        A.dialog({ title: 'เพิ่มรหัส DF', icon: 'plus', size: 'narrow', sub: 'ใช้เมื่อรู้ล่วงหน้าว่าฝ่ายไอทีจะเพิ่มรหัสใหม่ (เช่น DF ทันตกรรมรายการใหม่ที่อยู่ระหว่างเสนอขอ)',
          body: '<label class="fld"><span>รหัส (ตามระบบโรงพยาบาล)</span><input id="ncCode" placeholder="เช่น DF0062" style="text-transform:uppercase"></label>' +
            '<label class="fld"><span>ชื่อที่แสดง</span><input id="ncLabel" placeholder="เช่น DF หัตถการ – รายการใหม่"></label>' +
            '<label class="fld"><span>ประเภท</span><select id="ncType">' + d.dfTypes.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>' +
            '<label class="fld"><span>สถานะ</span><select id="ncStatus"><option value="active">นับจ่าย</option><option value="pending">รอยืนยัน</option><option value="ignore">ไม่นับ</option></select></label>',
          actions: [{ label: 'ยกเลิก' }, { label: 'เพิ่มรหัส', cls: 'primary', onClick: function (root) {
            var code = root.querySelector('#ncCode').value.trim().toUpperCase();
            if (!/^[A-Z0-9]{2,20}$/.test(code)) return Promise.reject(new Error('รหัสต้องเป็นตัวอักษรอังกฤษหรือตัวเลข 2–20 ตัว'));
            if (d.dfCodes.some(function (x) { return x.code === code; })) return Promise.reject(new Error('มีรหัสนี้อยู่แล้ว'));
            return A.api('saveDfCodes', { list: [{ code: code, label: root.querySelector('#ncLabel').value || code, type: root.querySelector('#ncType').value, status: root.querySelector('#ncStatus').value }] })
              .then(function (r) { d.dfCodes = r.codes; A.ok('เพิ่มรหัส ' + code + ' แล้ว'); show('codes', d); });
          } }] });
      };
      $('cdSave').onclick = function () {
        var list = [];
        b.querySelectorAll('[data-code]').forEach(function (tr) {
          var o = { code: tr.getAttribute('data-code') };
          tr.querySelectorAll('[data-k]').forEach(function (i) { o[i.getAttribute('data-k')] = i.value; });
          list.push(o);
        });
        A.run(this, function () { return A.api('saveDfCodes', { list: list }); }, { busy: 'กำลังบันทึกและคำนวณใหม่…',
          ok: function (r) { return r.touched.length ? 'บันทึกแล้ว · คำนวณยอดใหม่สำหรับรหัส ' + r.touched.join(', ') : 'บันทึกแล้ว'; } })
          .then(function (r) { d.dfCodes = r.codes; A.refreshAlerts(); show('codes', d); }, function () { });
      };
    }

    function userForm(u, d) {
      u = u || {};
      var roles = String(u.roles || '').split(',');
      A.dialog({
        title: u.empCode ? 'แก้ไขผู้ใช้ ' + u.empCode : 'เพิ่มผู้ใช้ใหม่', icon: 'user',
        body: '<div class="g2" style="gap:0 14px"><label class="fld"><span>รหัสเจ้าหน้าที่</span><input id="uCode" value="' + esc(u.empCode || '') + '"' + (u.empCode ? ' readonly' : '') + ' inputmode="numeric"></label>' +
          '<label class="fld"><span>ชื่อ-นามสกุล (แสดงบนรายงาน)</span><input id="uName" value="' + esc(u.name || '') + '"></label>' +
          '<label class="fld"><span>ตำแหน่ง</span><input id="uTitle" value="' + esc(u.title || '') + '"></label>' +
          '<label class="fld"><span>สถานะ</span><select id="uActive"><option value="Y"' + (u.active !== 'N' ? ' selected' : '') + '>ใช้งาน</option>' +
          '<option value="N"' + (u.active === 'N' ? ' selected' : '') + '>ปิดการใช้งาน</option></select></label></div>' +
          '<div class="fld"><span>บทบาท</span>' +
          [['admin', 'ผู้ดูแลระบบ', 'ตั้งค่าทุกอย่าง ปลดล็อกเคส เปิดรอบ'], ['hr', 'เจ้าหน้าที่ทรัพยากรบุคคล', 'ปิดรอบ ออกรายงานเบิก ไฟล์ HRMi'], ['head', 'หัวหน้าฝ่าย/ผู้บริหาร', 'ดูข้อมูลทั้งฝ่าย'], ['doctor', 'ทันตแพทย์', 'เห็นเฉพาะของตัวเอง']]
            .map(function (r) {
              return '<label class="chk"><input type="checkbox" data-role="' + r[0] + '"' + (roles.indexOf(r[0]) >= 0 ? ' checked' : '') + '><span><b>' + esc(r[1]) + '</b><small>' + esc(r[2]) + '</small></span></label>';
            }).join('') + '</div>' +
          '<label class="fld"><span>รหัสทันตแพทย์ (เฉพาะบทบาททันตแพทย์)</span><select id="uDct"><option value="">— ไม่ระบุ —</option>' +
          d.doctors.map(function (x) { return '<option value="' + esc(x.code) + '"' + (String(u.dct) === String(x.code) ? ' selected' : '') + '>' + esc(x.code + ' · ' + x.name) + '</option>'; }).join('') + '</select></label>' +
          (u.empCode ? '' : '<div class="msg info">' + ic('info') + '<span>รหัสผ่านเริ่มต้นคือรหัสเจ้าหน้าที่ และต้องเปลี่ยนเมื่อเข้าใช้ครั้งแรก</span></div>'),
        actions: [{ label: 'ยกเลิก' }, { label: 'บันทึก', cls: 'primary', onClick: function (root) {
          var rs = [];
          root.querySelectorAll('[data-role]').forEach(function (c) { if (c.checked) rs.push(c.getAttribute('data-role')); });
          if (!rs.length) return Promise.reject(new Error('กรุณาเลือกบทบาทอย่างน้อย 1 บทบาท'));
          return A.api('saveUser', { user: { empCode: root.querySelector('#uCode').value.trim(), name: root.querySelector('#uName').value.trim(), title: root.querySelector('#uTitle').value.trim(),
            roles: rs, dct: root.querySelector('#uDct').value, active: root.querySelector('#uActive').value === 'Y' } })
            .then(function () { A.ok('บันทึกผู้ใช้แล้ว'); A.go('settings', 'users'); });
        } }]
      });
    }
  }

  return { month: month, dash: dash, settings: settings };
})();
