/* reports.js — รอบเบิกรายเดือน · แดชบอร์ด · ตั้งค่า */
var REPORTS = (function () {
  var A = SMCDF, $ = A.$, esc = A.esc, n0 = A.n0, n2 = A.n2, pct = A.pct;
  var stat = PAGES.stat;
  var cur = { ym: null, data: null };

  function isAdmin() { return A.state.me.roles.indexOf('admin') >= 0; }
  function canClose() { return isAdmin() || A.state.me.roles.indexOf('hr') >= 0; }

  function ymOptions(sel) {
    var list = (A.state.boot.months || []).map(function (m) { return m.ym; });
    var last = (A.state.boot.lastDataDate || A.today()).slice(0, 7);
    if (list.indexOf(last) < 0) list.unshift(last);
    return list.map(function (y) {
      return '<option value="' + y + '"' + (y === sel ? ' selected' : '') + '>' + A.ymThai(y) + '</option>';
    }).join('');
  }

  /* ================= รอบเบิกรายเดือน ================= */
  function month(host) {
    var ym = cur.ym || (A.state.boot.lastDataDate || A.today()).slice(0, 7);
    cur.ym = ym;
    host.innerHTML =
      '<div class="panel no-print"><div class="panel-h">' +
      '<span>รอบเดือน</span><select id="mYm" style="padding:7px 10px;border:1px solid var(--line-2);border-radius:7px;background:var(--card-2)">' +
      ymOptions(ym) + '</select>' +
      '<div style="flex:1"></div>' +
      '<button class="btn sm" id="mXls">ส่งออกรายงานแนบเบิก (Excel)</button>' +
      '<button class="btn sm accent" id="mHrmi">สร้างไฟล์ Import HRMi</button>' +
      '<button class="btn sm" id="mPrint">พิมพ์</button>' +
      '</div></div><div id="mBody">' + A.loading() + '</div>';
    $('mYm').onchange = function () { cur.ym = this.value; month(host); };
    $('mPrint').onclick = function () { window.print(); };

    return A.api('getMonth', { ym: ym }).then(function (d) {
      cur.data = d;
      render(d);
      $('mXls').onclick = function () { exportPivot(d); };
      $('mHrmi').onclick = function () { exportHrmi(d); };
    }).catch(function (e) { $('mBody').innerHTML = A.errBox(e); });

    function render(d) {
      var t = d.totals, c = d.settings;
      var closed = d.status === 'closed';
      var h = '';
      if (closed) {
        h += '<div class="msg ok no-print">รอบเดือนนี้ <b>ปิดแล้ว</b> เมื่อ ' + esc(d.closedAt) + ' โดย ' + esc(d.closedBy) +
          ' — ยอดถูกบันทึกไว้เพื่อเทียบกับยอดที่เปลี่ยนภายหลัง' +
          (isAdmin() ? ' <button class="btn sm" id="mReopen" style="margin-left:8px">เปิดรอบใหม่</button>' : '') + '</div>';
      }
      h += '<div class="cards no-print">' +
        stat('วันที่มีคลินิก', n0(d.clinicDays.length) + ' <small style="font-size:14px">วัน</small>', 'ทันตแพทย์ ' + n0(d.byDoctor.length) + ' ท่าน') +
        stat('จำนวนเคส', n0(t.cases), n0(t.items) + ' รายการ DF') +
        stat('ยอดที่เก็บได้', n2(t.base), 'ชำระเงินสด + เบิกประกันได้', 'accent') +
        stat('ยอดรับรองจ่าย', n2(t.keep), '', 'ok') +
        stat('ส่วนแพทย์ ' + pct(c.sharePct), n2(t.pay80), 'รหัส ' + esc(d.hrmi.pay)) +
        stat('ส่วนโรงพยาบาล', n2(t.hos20), 'รหัส ' + esc(d.hrmi.hos)) +
        stat('ยอดที่ระงับ', n2(t.drop), n0(t.dropCases) + ' เคสคีย์ DF เกิน 1', t.drop ? 'bad' : '') +
        '</div>';

      h += '<div class="panel"><div class="panel-h"><h3>สรุปรายทันตแพทย์ (รายงานแนบเบิก)</h3>' +
        '<span class="tag">' + A.ymThai(d.ym) + '</span>' +
        (canClose() && !closed ? '<div style="flex:1"></div><button class="btn sm primary no-print" id="mClose">ปิดรอบเดือนนี้</button>' : '') +
        '</div><div class="panel-b flush wrap-x"><table><thead><tr>' +
        '<th>ลำดับ</th><th>รหัส</th><th>ทันตแพทย์</th><th class="n">วัน</th><th class="n">เคส</th>' +
        '<th class="n">ยอดที่เก็บได้</th><th class="n">ระงับ</th><th class="n">ยอดรับรอง</th>' +
        '<th class="n">แพทย์ ' + pct(c.sharePct) + '</th><th class="n">รพ. ' + pct(1 - c.sharePct) + '</th></tr></thead><tbody>' +
        d.byDoctor.map(function (x, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.dct) + '</td><td>' + esc(x.name) + '</td>' +
            '<td class="n">' + n0(x.days) + '</td><td class="n">' + n0(x.cases) + '</td>' +
            '<td class="n">' + n2(x.base) + '</td>' +
            '<td class="n">' + (x.drop ? '<span class="badge bad">' + n2(x.drop) + '</span>' : '-') + '</td>' +
            '<td class="n">' + n2(x.keep) + '</td><td class="n">' + n2(x.pay80) + '</td><td class="n">' + n2(x.hos20) + '</td></tr>';
        }).join('') +
        '<tr class="sum"><td colspan="3">รวม</td><td class="n"></td><td class="n">' + n0(t.cases) + '</td>' +
        '<td class="n">' + n2(t.base) + '</td><td class="n">' + n2(t.drop) + '</td><td class="n">' + n2(t.keep) + '</td>' +
        '<td class="n">' + n2(t.pay80) + '</td><td class="n">' + n2(t.hos20) + '</td></tr>' +
        '</tbody></table></div></div>';

      if (d.backpay && d.backpay.length) {
        h += '<div class="panel"><div class="panel-h"><h3>ยอดตกเบิก — ยอดเปลี่ยนหลังปิดรอบ</h3>' +
          '<span class="tag">' + d.backpay.length + ' รายการ</span></div><div class="panel-b flush wrap-x">' +
          '<table><thead><tr><th>ทันตแพทย์</th><th class="n">ยอดตอนปิดรอบ</th><th class="n">ยอดปัจจุบัน</th>' +
          '<th class="n">ผลต่าง</th><th>ตรวจพบเมื่อ</th><th>สถานะ</th>' + (canClose() ? '<th class="no-print"></th>' : '') + '</tr></thead><tbody>' +
          d.backpay.map(function (b) {
            return '<tr><td>' + esc(b.dctName) + '</td><td class="n">' + n2(b.closedBase) + '</td>' +
              '<td class="n">' + n2(b.currentBase) + '</td>' +
              '<td class="n"><b>' + (Number(b.diff) > 0 ? '+' : '') + n2(b.diff) + '</b></td>' +
              '<td>' + esc(b.detected) + '</td><td><span class="badge warn">' + esc(b.status) + '</span></td>' +
              (canClose() ? '<td class="no-print"><button class="btn sm" data-bp="' + esc(b.id) + '">ทำเครื่องหมายว่าเบิกแล้ว</button></td>' : '') +
              '</tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="panel-b"><p class="note">ยอดเหล่านี้เกิดจากผู้ป่วยมาชำระเพิ่มหรือบริษัทประกันอนุมัติเพิ่มหลังปิดรอบ ' +
          'ให้ตั้งเบิกในรอบเดือนถัดไป</p></div></div>';
      }

      if (d.dropped.length) {
        h += '<div class="panel"><div class="panel-h"><h3>รายการที่ระงับตามกติกาในเดือนนี้</h3>' +
          '<span class="tag">' + d.dropped.length + ' เคส</span></div>' +
          '<div class="panel-b flush scroll">' + PAGES.caseTable(d.dropped) + '</div></div>';
      }

      $('mBody').innerHTML = h;
      PAGES.bindCases($('mBody'), host);
      if ($('mClose')) $('mClose').onclick = function () { askClose(d); };
      if ($('mReopen')) $('mReopen').onclick = function () { askReopen(d); };
      $('mBody').querySelectorAll('[data-bp]').forEach(function (b) {
        b.onclick = function () {
          A.api('markBackpay', { id: b.getAttribute('data-bp'), status: 'เบิกแล้ว' })
            .then(function () { A.toast('บันทึกแล้ว'); month(host); })
            .catch(function (e) { A.toast(e.message, 5000); });
        };
      });
    }

    function askClose(d) {
      A.modal('<h3>ปิดรอบเดือน ' + esc(A.ymThai(d.ym)) + '</h3>' +
        '<p class="note">ระบบจะบันทึกยอดรับรองของแต่ละท่านไว้เป็นยอดอ้างอิง ถ้ายอดในระบบโรงพยาบาลเปลี่ยนภายหลัง ' +
        'ระบบจะตั้งเป็นรายการตกเบิกให้อัตโนมัติ · เมื่อปิดรอบแล้วจะแก้ข้อยกเว้นรายเคสไม่ได้จนกว่าจะเปิดรอบใหม่</p>' +
        '<table><tbody><tr><th>ยอดรับรองรวม</th><td>' + n2(d.totals.keep) + ' บาท</td></tr>' +
        '<tr><th>ส่วนแพทย์</th><td>' + n2(d.totals.pay80) + ' บาท</td></tr>' +
        '<tr><th>ส่วนโรงพยาบาล</th><td>' + n2(d.totals.hos20) + ' บาท</td></tr>' +
        '<tr><th>ทันตแพทย์</th><td>' + n0(d.byDoctor.length) + ' ท่าน</td></tr></tbody></table>' +
        '<label class="fld" style="margin-top:12px"><span>ยืนยันด้วยรหัสผ่านของคุณ</span><input id="clPw" type="password"></label>' +
        '<div id="clM" class="msg err hidden"></div>' +
        '<div class="btns" style="justify-content:flex-end">' +
        '<button class="btn" data-x="close">ยกเลิก</button>' +
        '<button class="btn primary" id="clGo">ปิดรอบ</button></div>');
      A.bindClose();
      $('clGo').onclick = function () {
        A.api('closeMonth', { ym: d.ym, password: $('clPw').value })
          .then(function () { A.closeModal(); A.toast('ปิดรอบเรียบร้อย'); month(host); })
          .catch(function (e) { $('clM').textContent = e.message; $('clM').classList.remove('hidden'); });
      };
    }

    function askReopen(d) {
      A.modal('<h3>เปิดรอบเดือน ' + esc(A.ymThai(d.ym)) + ' ใหม่</h3>' +
        '<p class="note">ใช้เมื่อต้องแก้ไขยอดก่อนส่งเบิก การเปิดรอบใหม่จะถูกบันทึกประวัติไว้</p>' +
        '<label class="fld"><span>เหตุผล</span><input id="roR"></label>' +
        '<label class="fld"><span>ยืนยันด้วยรหัสผ่านของคุณ</span><input id="roPw" type="password"></label>' +
        '<div id="roM" class="msg err hidden"></div>' +
        '<div class="btns" style="justify-content:flex-end">' +
        '<button class="btn" data-x="close">ยกเลิก</button>' +
        '<button class="btn primary" id="roGo">เปิดรอบใหม่</button></div>');
      A.bindClose();
      $('roGo').onclick = function () {
        A.api('reopenMonth', { ym: d.ym, password: $('roPw').value, reason: $('roR').value })
          .then(function () { A.closeModal(); A.toast('เปิดรอบใหม่แล้ว'); month(host); })
          .catch(function (e) { $('roM').textContent = e.message; $('roM').classList.remove('hidden'); });
      };
    }

    /* รายงานแนบเบิก: ชีทสรุปรวม + ชีทรายคน */
    function exportPivot(d) {
      var c = d.settings;
      var head = [[c.reportTitle], [c.org],
        ['ประจำเดือน ' + A.ymThai(d.ym), '', 'ยอดที่เก็บได้ = ชำระเงินสด (PAID) + เบิกประกันได้ (CLAIM)'],
        ['กติกา', c.ruleMode === 'A' ? 'รับรอง DF ที่สูงที่สุดเพียงรายการเดียวต่อเคส' : 'รับรอง DF ที่สูงที่สุดประเภทละ 1 รายการ',
         'มีผลตั้งแต่', A.dThai(c.ruleFrom)], []];
      var rows = head.concat([['ลำดับ', 'รหัสเจ้าหน้าที่', 'ทันตแพทย์', 'วันที่ปฏิบัติงาน', 'จำนวนเคส',
        'ยอดที่เก็บได้', 'ยอดที่ระงับ', 'ยอดรับรอง', 'ส่วนแพทย์ ' + pct(c.sharePct), 'ส่วนโรงพยาบาล']]);
      d.byDoctor.forEach(function (x, i) {
        rows.push([i + 1, x.dct, x.name, x.days, x.cases, x.base, x.drop, x.keep, x.pay80, x.hos20]);
      });
      var t = d.totals;
      rows.push(['', '', 'รวม', '', t.cases, t.base, t.drop, t.keep, t.pay80, t.hos20]);
      rows.push([]);
      rows.push(['', '', '(' + (c.signer1Name || '.....................') + ')', '', '', '',
                 '', '(' + (c.signer2Name || '.....................') + ')']);
      rows.push(['', '', c.signer1Title, '', '', '', '', c.signer2Title]);

      var sheets = [{ name: 'PIVOT', rows: rows, cols: [7, 14, 30, 12, 10, 15, 13, 15, 16, 16] }];
      var det = [['วันที่', 'รหัส', 'ทันตแพทย์', 'HN', 'สิทธิ', 'รหัส DF', 'ประเภท',
                  'เรียกเก็บ', 'ชำระเงินสด', 'เบิกประกัน', 'ยอดที่เก็บได้', 'สถานะ', 'หมายเหตุ']];
      d.dropped.forEach(function (ca) {
        ca.items.forEach(function (i) {
          det.push([A.dThai(ca.date), ca.dct, ca.dctName, ca.hn, ca.pttype, i.charge, i.type,
            i.total, i.paid, i.claim, i.base, i.keep ? 'รับรอง' : 'ระงับ', i.why]);
        });
      });
      if (det.length > 1) sheets.push({ name: 'รายการที่ระงับ', rows: det, cols: [14, 12, 26, 13, 22, 11, 10, 12, 12, 12, 14, 9, 46] });
      A.saveSheet(sheets, 'DF_ทันตกรรม_' + d.ym + '_รายงานแนบเบิก.xlsx');
    }

    /* ไฟล์นำเข้า HRMi — 1 ไฟล์ = 1 รหัสรายได้ · ช่อง "จำนวน" ใส่ยอดเต็ม 100% */
    function exportHrmi(d) {
      var head = ['รหัสพนักงาน', 'เลขบัตรประชาชน', 'รหัสรายได้ - รายหัก', 'จำนวน', 'รายได้ (บาท)', 'รายหัก (บาท)', 'รหัสงาน'];
      function sheetFor(code) {
        var rows = [head];
        d.byDoctor.forEach(function (x) {
          if (!x.keep) return;
          rows.push([Number(x.dct), 0, code, x.keep, 0, 0, 0]);
        });
        return { name: code, rows: rows, cols: [14, 16, 20, 14, 13, 13, 11] };
      }
      A.modal('<h3>สร้างไฟล์นำเข้า HRMi</h3>' +
        '<p class="note">ช่อง <b>จำนวน</b> ใส่ยอดรับรองเต็ม 100% ต่อคน ให้ HRMi คำนวณสัดส่วนเอง ' +
        'ตามรูปแบบเดียวกับไฟล์ R101-1 / R101-2 ที่ใช้อยู่</p>' +
        '<table><tbody>' +
        '<tr><th>รอบเดือน</th><td>' + esc(A.ymThai(d.ym)) + '</td></tr>' +
        '<tr><th>จำนวนทันตแพทย์</th><td>' + n0(d.byDoctor.filter(function (x) { return x.keep > 0; }).length) + ' ท่าน</td></tr>' +
        '<tr><th>ยอดรวมในไฟล์</th><td>' + n2(d.totals.keep) + ' บาท</td></tr>' +
        '<tr><th>รหัสรายได้</th><td>' + esc(d.hrmi.pay) + ' (ส่วนแพทย์) · ' + esc(d.hrmi.hos) + ' (ส่วนโรงพยาบาล)</td></tr>' +
        '</tbody></table>' +
        (d.status !== 'closed' ? '<div class="msg warn" style="margin-top:12px">รอบเดือนนี้ยังไม่ได้ปิดรอบ ยอดอาจเปลี่ยนได้อีก แนะนำให้ปิดรอบก่อนส่งเบิก</div>' : '') +
        '<div class="btns" style="justify-content:flex-end;margin-top:12px">' +
        '<button class="btn" data-x="close">ยกเลิก</button>' +
        '<button class="btn accent" id="hrGo">สร้างไฟล์ทั้ง 2 รหัส</button></div>');
      A.bindClose();
      $('hrGo').onclick = function () {
        A.saveSheet([sheetFor(d.hrmi.pay)], d.hrmi.pay + '.xlsx');
        setTimeout(function () { A.saveSheet([sheetFor(d.hrmi.hos)], d.hrmi.hos + '.xlsx'); }, 600);
        A.closeModal();
      };
    }
  }

  /* ================= แดชบอร์ด ================= */
  function dash(host) {
    host.innerHTML = A.loading();
    return A.api('getDashboard', { months: 14 }).then(function (d) {
      var ms = d.months, last = ms[ms.length - 1] || {};
      var prev = ms[ms.length - 2] || {};
      var totKeep = ms.reduce(function (a, m) { return a + m.keep; }, 0);
      var totDrop = ms.reduce(function (a, m) { return a + m.drop; }, 0);
      var totCases = ms.reduce(function (a, m) { return a + m.cases; }, 0);
      var totOver = ms.reduce(function (a, m) { return a + m.over; }, 0);
      var max = Math.max.apply(null, ms.map(function (m) { return m.keep; }).concat([1]));

      var h = '<div class="cards">' +
        stat('ยอดรับรองสะสม', n2(totKeep), ms.length + ' เดือนล่าสุด', 'ok') +
        stat('ยอดที่ระงับสะสม', n2(totDrop), totKeep + totDrop ? pct(totDrop / (totKeep + totDrop)) + ' ของยอดที่เก็บได้' : '', totDrop ? 'bad' : '') +
        stat('เคสสะสม', n0(totCases), n0(totOver) + ' เคสคีย์ DF เกิน 1') +
        stat('อัตราการคีย์เกิน', pct(totCases ? totOver / totCases : 0), 'เดือนล่าสุด ' + pct(last.rate || 0), (last.rate > (prev.rate || 0)) ? 'bad' : 'ok') +
        '</div>';

      h += '<div class="panel"><div class="panel-h"><h3>แนวโน้มรายเดือน</h3>' +
        '<span class="tag">แท่งสูง = ยอดรับรอง · สีทองแดง = เดือนล่าสุด</span></div><div class="panel-b">' +
        '<div class="spark">' + ms.map(function (m, i) {
          return '<i class="' + (i === ms.length - 1 ? 'b' : '') + '" style="height:' +
            Math.max(3, (m.keep / max) * 100).toFixed(1) + '%" title="' + esc(A.ymShort(m.ym) + ' · ' + n2(m.keep)) + '"></i>';
        }).join('') + '</div>' +
        '<div style="display:flex;gap:3px;margin-top:6px">' + ms.map(function (m) {
          return '<small class="note" style="flex:1;text-align:center;font-size:10.5px">' + esc(A.ymShort(m.ym)) + '</small>';
        }).join('') + '</div></div>' +
        '<div class="panel-b flush wrap-x"><table><thead><tr><th>เดือน</th><th class="n">วัน</th><th class="n">ท่าน</th>' +
        '<th class="n">เคส</th><th class="n">คีย์เกิน</th><th class="n">อัตรา</th>' +
        '<th class="n">ยอดที่เก็บได้</th><th class="n">รับรอง</th><th class="n">ระงับ</th></tr></thead><tbody>' +
        ms.slice().reverse().map(function (m) {
          return '<tr><td>' + esc(A.ymThai(m.ym)) + '</td><td class="n">' + n0(m.days) + '</td>' +
            '<td class="n">' + n0(m.doctors) + '</td><td class="n">' + n0(m.cases) + '</td>' +
            '<td class="n">' + n0(m.over) + '</td><td class="n">' + pct(m.rate) + '</td>' +
            '<td class="n">' + n2(m.base) + '</td><td class="n">' + n2(m.keep) + '</td>' +
            '<td class="n">' + (m.drop ? '<span class="badge bad">' + n2(m.drop) + '</span>' : '-') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      h += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(330px,1fr))">';
      h += '<div class="panel"><div class="panel-h"><h3>รายทันตแพทย์</h3></div><div class="panel-b flush wrap-x">' +
        '<table><thead><tr><th>ทันตแพทย์</th><th class="n">เคส</th><th class="n">รับรอง</th><th class="n">อัตราคีย์เกิน</th></tr></thead><tbody>' +
        d.doctors.map(function (x) {
          return '<tr><td>' + esc(x.name) + '</td><td class="n">' + n0(x.cases) + '</td>' +
            '<td class="n">' + n2(x.keep) + '</td>' +
            '<td class="n">' + (x.rate > .3 ? '<span class="badge bad">' + pct(x.rate) + '</span>' : pct(x.rate)) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      h += '<div class="panel"><div class="panel-h"><h3>สิทธิการรักษา</h3></div><div class="panel-b flush wrap-x">' +
        '<table><thead><tr><th>กลุ่มสิทธิ</th><th class="n">รายการ</th><th class="n">ยอดที่เก็บได้</th></tr></thead><tbody>' +
        d.rights.map(function (r) {
          return '<tr><td>' + esc(r.grp) + '</td><td class="n">' + n0(r.items) + '</td><td class="n">' + n2(r.base) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      h += '<div class="panel"><div class="panel-h"><h3>รหัสค่าใช้จ่าย DF</h3></div><div class="panel-b flush wrap-x">' +
        '<table><thead><tr><th>รหัส</th><th class="n">รายการ</th><th class="n">ยอดที่เก็บได้</th></tr></thead><tbody>' +
        d.codes.map(function (r) {
          return '<tr><td>' + esc(r.charge) + '</td><td class="n">' + n0(r.items) + '</td><td class="n">' + n2(r.base) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
      h += '</div>';

      host.innerHTML = h;
    });
  }

  /* ================= ตั้งค่า ================= */
  function settings(host) {
    host.innerHTML = A.loading();
    return A.api('getSettings', {}).then(function (d) {
      var s = d.settings;
      var tabs = [
        ['rule', 'กติกาและการจ่าย'], ['conn', 'การเชื่อมต่อ'], ['rights', 'สิทธิการรักษา'],
        ['price', 'เพดานราคา DF'], ['users', 'ผู้ใช้'], ['doc', 'เอกสารและผู้ลงนาม'], ['log', 'ประวัติ']
      ];
      var h = '<div class="panel"><div class="panel-h">' +
        tabs.map(function (t, i) {
          return '<button class="btn sm ' + (i === 0 ? 'primary' : '') + '" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>';
        }).join('') + '</div><div class="panel-b" id="setBody"></div></div>';
      host.innerHTML = h;
      host.querySelectorAll('[data-tab]').forEach(function (b) {
        b.onclick = function () {
          host.querySelectorAll('[data-tab]').forEach(function (x) { x.classList.remove('primary'); });
          b.classList.add('primary');
          show(b.getAttribute('data-tab'), d);
        };
      });
      show('rule', d);
    });

    function fld(key, label, val, type, note) {
      return '<label class="fld"><span>' + esc(label) + '</span>' +
        '<input id="st_' + key + '" type="' + (type || 'text') + '" value="' + esc(val) + '">' +
        (note ? '<small class="note">' + note + '</small>' : '') + '</label>';
    }
    function saveBtn(keys) {
      return '<div class="btns" style="justify-content:flex-end;margin-top:8px">' +
        '<button class="btn primary" data-save="' + keys.join(',') + '">บันทึก</button></div>';
    }
    function bindSave(host2) {
      host2.querySelectorAll('[data-save]').forEach(function (b) {
        b.onclick = function () {
          var patch = {};
          b.getAttribute('data-save').split(',').forEach(function (k) {
            var el = $('st_' + k); if (el) patch[k] = el.value;
          });
          A.api('saveSettings', { patch: patch })
            .then(function () { A.toast('บันทึกการตั้งค่าแล้ว'); })
            .catch(function (e) { A.toast(e.message, 5000); });
        };
      });
    }

    function show(tab, d) {
      var s = d.settings, b = $('setBody'), h = '';
      if (tab === 'rule') {
        h = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' +
          '<label class="fld"><span>กติกาการตัด DF</span><select id="st_ruleMode">' +
          '<option value="A"' + (s.ruleMode === 'A' ? ' selected' : '') + '>A — รับรอง DF ที่สูงที่สุดเพียงรายการเดียวต่อเคส</option>' +
          '<option value="B"' + (s.ruleMode === 'B' ? ' selected' : '') + '>B — รับรอง DF ที่สูงที่สุดประเภทละ 1 รายการ</option>' +
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
      if (tab === 'conn') {
        h = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' +
          fld('apiBase', 'ที่อยู่ API ของโรงพยาบาล', s.apiBase) +
          fld('apiReport', 'ชื่อรายงาน (report)', s.apiReport) +
          fld('apiToken', 'token (ถ้าไอทีล็อก)', s.apiToken, 'text', 'เก็บใน Script Properties ไม่อยู่บน GitHub') +
          fld('recheckDays', 'ตรวจยอดย้อนหลัง (วัน)', s.recheckDays, 'number', 'ค่าแนะนำ 45 วัน ครอบคลุมถึงวันปิดรอบเบิก') +
          fld('backfillFrom', 'ดึงข้อมูลย้อนหลังตั้งแต่', s.backfillFrom, 'date') +
          fld('dutyUrl', 'ลิงก์ /exec ของ SMC Duty', s.dutyUrl) +
          fld('dutyKey', 'รหัสลับร่วมกับ SMC Duty', s.dutyKey) +
          fld('dutyPositions', 'ตำแหน่งที่ดึงมาแสดง', s.dutyPositions, 'text', 'คั่นด้วยเครื่องหมาย |') +
          '</div>' +
          '<div class="btns" style="margin-top:8px">' +
          '<button class="btn" id="tApi">ทดสอบ API โรงพยาบาล</button>' +
          '<button class="btn" id="tDuty">ทดสอบ SMC Duty</button>' +
          '<button class="btn" id="tBack">เริ่มดึงข้อมูลย้อนหลัง</button>' +
          '<div style="flex:1"></div>' +
          '<button class="btn primary" data-save="apiBase,apiReport,apiToken,recheckDays,backfillFrom,dutyUrl,dutyKey,dutyPositions">บันทึก</button></div>' +
          '<div id="connMsg"></div>';
      }
      if (tab === 'rights') {
        h = '<p class="note">จับคู่สิทธิการรักษาที่พบในข้อมูลจริงเข้ากับกลุ่มสิทธิ เพื่อใช้ในรายงานและแดชบอร์ด</p>' +
          '<div class="wrap-x"><table><thead><tr><th>สิทธิการรักษา (ตามระบบโรงพยาบาล)</th><th>กลุ่มสิทธิ</th></tr></thead><tbody>' +
          d.rights.map(function (r, i) {
            return '<tr><td>' + esc(r.name) + '</td><td><select data-rg="' + i + '" data-name="' + esc(r.name) + '">' +
              d.rightGroups.map(function (g) {
                return '<option value="' + esc(g) + '"' + (g === r.grp ? ' selected' : '') + '>' + esc(g) + '</option>';
              }).join('') + '</select></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="btns" style="justify-content:flex-end;margin-top:10px"><button class="btn primary" id="rgSave">บันทึก</button></div>';
      }
      if (tab === 'price') {
        var byCharge = {};
        d.priceRules.forEach(function (r) { byCharge[r.charge] = r; });
        h = '<p class="note">ตั้งช่วงราคาที่ถือว่าปกติของแต่ละรหัส DF ระบบจะขึ้นธงเตือนรายการที่อยู่นอกช่วง ' +
          'เว้นว่างไว้ = ไม่ตรวจรหัสนั้น</p>' +
          '<div class="wrap-x"><table><thead><tr><th>รหัส</th><th>ความหมาย</th><th>ต่ำสุด (บาท)</th><th>สูงสุด (บาท)</th><th>หมายเหตุ</th></tr></thead><tbody>' +
          d.dfCodes.map(function (c) {
            var r = byCharge[c.charge] || {};
            return '<tr data-pr="' + esc(c.charge) + '"><td>' + esc(c.charge) + '</td><td>' + esc(c.label) + '</td>' +
              '<td><input data-k="minAmt" type="number" value="' + esc(r.minAmt || '') + '" style="width:110px"></td>' +
              '<td><input data-k="maxAmt" type="number" value="' + esc(r.maxAmt || '') + '" style="width:110px"></td>' +
              '<td><input data-k="note" value="' + esc(r.note || '') + '" style="width:100%"></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="btns" style="margin-top:10px"><button class="btn" id="prCheck">ตรวจรายการที่ผิดเกณฑ์</button>' +
          '<div style="flex:1"></div><button class="btn primary" id="prSave">บันทึก</button></div><div id="prOut"></div>';
      }
      if (tab === 'users') {
        h = '<div class="btns" style="margin-bottom:10px"><button class="btn primary" id="uAdd">เพิ่มผู้ใช้</button></div>' +
          '<div class="wrap-x"><table><thead><tr><th>รหัส</th><th>ชื่อ</th><th>ตำแหน่ง</th><th>บทบาท</th>' +
          '<th>รหัสทันตแพทย์</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th></th></tr></thead><tbody>' +
          d.users.map(function (u) {
            return '<tr><td>' + esc(u.empCode) + '</td><td>' + esc(u.name) + '</td><td>' + esc(u.title) + '</td>' +
              '<td>' + esc(String(u.roles || '').split(',').map(function (r) {
                return ({ admin: 'ผู้ดูแลระบบ', hr: 'HR', head: 'ผู้บริหาร', doctor: 'ทันตแพทย์' })[r] || r;
              }).join(' · ')) + '</td>' +
              '<td>' + esc(u.dct || '-') + '</td>' +
              '<td>' + (u.active === 'Y' ? '<span class="badge ok">ใช้งาน</span>' : '<span class="badge">ปิด</span>') + '</td>' +
              '<td>' + esc(u.lastLogin || '-') + '</td>' +
              '<td><button class="btn sm" data-ue="' + esc(u.empCode) + '">แก้ไข</button> ' +
              '<button class="btn sm" data-ur="' + esc(u.empCode) + '">ตั้งรหัสใหม่</button></td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      if (tab === 'doc') {
        h = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' +
          fld('reportTitle', 'ชื่อรายงานบนหัวกระดาษ', s.reportTitle) +
          fld('contactLine', 'ข้อความติดต่อท้ายรายงาน', s.contactLine) +
          fld('signer1Name', 'ผู้ลงนามช่องที่ 1 — ชื่อ', s.signer1Name) +
          fld('signer1Title', 'ผู้ลงนามช่องที่ 1 — ตำแหน่ง', s.signer1Title) +
          fld('signer2Name', 'ผู้ลงนามช่องที่ 2 — ชื่อ', s.signer2Name) +
          fld('signer2Title', 'ผู้ลงนามช่องที่ 2 — ตำแหน่ง', s.signer2Title) +
          '</div>' + saveBtn(['reportTitle', 'contactLine', 'signer1Name', 'signer1Title', 'signer2Name', 'signer2Title']);
      }
      if (tab === 'log') { h = '<div id="logBox">' + A.loading() + '</div>'; }

      b.innerHTML = h;
      bindSave(b);

      if (tab === 'conn') {
        $('tApi').onclick = function () {
          $('connMsg').innerHTML = A.loading('กำลังทดสอบ…');
          A.api('testApi', { date: A.today() })
            .then(function (r) {
              $('connMsg').innerHTML = '<div class="msg ok">เชื่อมต่อสำเร็จใน ' + r.ms + ' มิลลิวินาที ได้ ' + r.rows + ' รายการ</div>' +
                '<pre style="font-size:11px;overflow:auto;background:var(--card-2);padding:10px;border-radius:7px">' +
                esc(JSON.stringify(r.sample, null, 1)) + '</pre>';
            })
            .catch(function (e) { $('connMsg').innerHTML = A.errBox(e); });
        };
        $('tDuty').onclick = function () {
          $('connMsg').innerHTML = A.loading('กำลังทดสอบ…');
          A.api('testDuty', { date: A.today() })
            .then(function (r) {
              $('connMsg').innerHTML = r.ok
                ? '<div class="msg ok">เชื่อมต่อ SMC Duty สำเร็จ พบเจ้าหน้าที่ ' + r.list.length + ' คนในวันนี้</div>'
                : '<div class="msg warn">' + esc(r.reason) + '</div>';
            })
            .catch(function (e) { $('connMsg').innerHTML = A.errBox(e); });
        };
        $('tBack').onclick = function () {
          A.api('startBackfill', { from: $('st_backfillFrom').value })
            .then(function (r) { A.toast('เริ่มดึงข้อมูลย้อนหลังตั้งแต่ ' + r.from + ' แล้ว ระบบจะทยอยทำเบื้องหลัง'); })
            .catch(function (e) { A.toast(e.message, 5000); });
        };
      }
      if (tab === 'rights') {
        $('rgSave').onclick = function () {
          var list = [];
          b.querySelectorAll('[data-rg]').forEach(function (sel) {
            list.push({ name: sel.getAttribute('data-name'), grp: sel.value });
          });
          A.api('saveRightGroups', { list: list })
            .then(function () { A.toast('บันทึกกลุ่มสิทธิแล้ว'); })
            .catch(function (e) { A.toast(e.message, 5000); });
        };
      }
      if (tab === 'price') {
        function collect() {
          var list = [];
          b.querySelectorAll('[data-pr]').forEach(function (tr) {
            var o = { charge: tr.getAttribute('data-pr') };
            tr.querySelectorAll('[data-k]').forEach(function (i) { o[i.getAttribute('data-k')] = i.value; });
            if (o.minAmt || o.maxAmt) list.push(o);
          });
          return list;
        }
        $('prSave').onclick = function () {
          A.api('savePriceRules', { list: collect() })
            .then(function () { A.toast('บันทึกเพดานราคาแล้ว'); })
            .catch(function (e) { A.toast(e.message, 5000); });
        };
        $('prCheck').onclick = function () {
          $('prOut').innerHTML = A.loading();
          A.api('getPriceAlerts', {}).then(function (r) {
            if (!r.list.length) { $('prOut').innerHTML = '<div class="msg ok">ไม่พบรายการที่อยู่นอกเกณฑ์</div>'; return; }
            $('prOut').innerHTML = '<div class="msg warn">พบ ' + r.list.length + ' รายการที่อยู่นอกเกณฑ์' + (r.truncated ? ' (แสดง 500 รายการแรก)' : '') + '</div>' +
              '<div class="wrap-x scroll"><table><thead><tr><th>วันที่</th><th>ทันตแพทย์</th><th>HN</th><th>รหัส</th>' +
              '<th class="n">ยอด</th><th>ปัญหา</th></tr></thead><tbody>' +
              r.list.map(function (x) {
                return '<tr><td>' + esc(A.dThai(x.date)) + '</td><td>' + esc(x.dctName) + '</td><td>' + esc(x.hn) + '</td>' +
                  '<td>' + esc(x.charge) + '</td><td class="n">' + n2(x.total) + '</td>' +
                  '<td><span class="badge warn">' + esc(x.issue) + '</span></td></tr>';
              }).join('') + '</tbody></table></div>';
          }).catch(function (e) { $('prOut').innerHTML = A.errBox(e); });
        };
      }
      if (tab === 'users') {
        $('uAdd').onclick = function () { userForm({}, d); };
        b.querySelectorAll('[data-ue]').forEach(function (x) {
          x.onclick = function () {
            var u = d.users.filter(function (y) { return y.empCode === x.getAttribute('data-ue'); })[0];
            userForm(u, d);
          };
        });
        b.querySelectorAll('[data-ur]').forEach(function (x) {
          x.onclick = function () {
            var code = x.getAttribute('data-ur');
            A.modal('<h3>ตั้งรหัสผ่านใหม่ให้ ' + esc(code) + '</h3>' +
              '<p class="note">รหัสผ่านใหม่จะเป็นรหัสเจ้าหน้าที่ และผู้ใช้ต้องเปลี่ยนเมื่อเข้าใช้ครั้งถัดไป</p>' +
              '<label class="fld"><span>ยืนยันด้วยรหัสผ่านของคุณ</span><input id="rpPw" type="password"></label>' +
              '<div id="rpM" class="msg err hidden"></div>' +
              '<div class="btns" style="justify-content:flex-end"><button class="btn" data-x="close">ยกเลิก</button>' +
              '<button class="btn primary" id="rpGo">ยืนยัน</button></div>');
            A.bindClose();
            $('rpGo').onclick = function () {
              A.api('resetUserPass', { empCode: code, password: $('rpPw').value })
                .then(function (r) { A.closeModal(); A.toast(r.note); })
                .catch(function (e) { $('rpM').textContent = e.message; $('rpM').classList.remove('hidden'); });
            };
          };
        });
      }
      if (tab === 'log') {
        A.api('getLogs', { limit: 200 }).then(function (r) {
          $('logBox').innerHTML =
            '<h4 style="margin:0 0 8px">ประวัติการใช้งาน</h4><div class="wrap-x scroll"><table><thead><tr>' +
            '<th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th><th>เป้าหมาย</th><th>รายละเอียด</th></tr></thead><tbody>' +
            r.audit.map(function (a) {
              return '<tr><td>' + esc(a.at) + '</td><td>' + esc(a.by) + '</td><td>' + esc(a.action) + '</td>' +
                '<td>' + esc(a.target) + '</td><td>' + esc(a.detail) + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<h4 style="margin:16px 0 8px">ประวัติการดึงข้อมูล</h4><div class="wrap-x scroll"><table><thead><tr>' +
            '<th>เวลา</th><th>ช่วง</th><th class="n">รายการ</th><th>สถานะ</th><th>รายละเอียด</th></tr></thead><tbody>' +
            r.fetch.map(function (f) {
              return '<tr><td>' + esc(f.at) + '</td><td>' + esc(f.range) + '</td><td class="n">' + esc(f.rows) + '</td>' +
                '<td>' + (f.status === 'สำเร็จ' ? '<span class="badge ok">สำเร็จ</span>' : '<span class="badge bad">' + esc(f.status) + '</span>') + '</td>' +
                '<td>' + esc(f.detail) + '</td></tr>';
            }).join('') + '</tbody></table></div>';
        }).catch(function (e) { $('logBox').innerHTML = A.errBox(e); });
      }
    }

    function userForm(u, d) {
      u = u || {};
      var roles = String(u.roles || '').split(',');
      A.modal('<h3>' + (u.empCode ? 'แก้ไขผู้ใช้ ' + esc(u.empCode) : 'เพิ่มผู้ใช้ใหม่') + '</h3>' +
        '<label class="fld"><span>รหัสเจ้าหน้าที่</span><input id="uCode" value="' + esc(u.empCode || '') + '"' + (u.empCode ? ' readonly' : '') + '></label>' +
        '<label class="fld"><span>ชื่อ-นามสกุล (แสดงบนรายงาน)</span><input id="uName" value="' + esc(u.name || '') + '"></label>' +
        '<label class="fld"><span>ตำแหน่ง</span><input id="uTitle" value="' + esc(u.title || '') + '"></label>' +
        '<div class="fld"><span>บทบาท</span>' +
        [['admin', 'ผู้ดูแลระบบ'], ['hr', 'เจ้าหน้าที่ทรัพยากรบุคคล'], ['head', 'หัวหน้าฝ่าย/ผู้บริหาร'], ['doctor', 'ทันตแพทย์ (เห็นเฉพาะของตัวเอง)']]
          .map(function (r) {
            return '<label style="display:block;font-weight:400"><input type="checkbox" data-role="' + r[0] + '"' +
              (roles.indexOf(r[0]) >= 0 ? ' checked' : '') + '> ' + esc(r[1]) + '</label>';
          }).join('') + '</div>' +
        '<label class="fld"><span>รหัสทันตแพทย์ (เฉพาะบทบาททันตแพทย์)</span><select id="uDct">' +
        '<option value="">— ไม่ระบุ —</option>' +
        d.doctors.map(function (x) {
          return '<option value="' + esc(x.code) + '"' + (String(u.dct) === String(x.code) ? ' selected' : '') + '>' +
            esc(x.code + ' · ' + x.name) + '</option>';
        }).join('') + '</select></label>' +
        '<label class="fld"><span>สถานะ</span><select id="uActive">' +
        '<option value="Y"' + (u.active !== 'N' ? ' selected' : '') + '>ใช้งาน</option>' +
        '<option value="N"' + (u.active === 'N' ? ' selected' : '') + '>ปิดการใช้งาน</option></select></label>' +
        (u.empCode ? '' : '<div class="msg">รหัสผ่านเริ่มต้นคือรหัสเจ้าหน้าที่ และต้องเปลี่ยนเมื่อเข้าใช้ครั้งแรก</div>') +
        '<div id="uM" class="msg err hidden"></div>' +
        '<div class="btns" style="justify-content:flex-end">' +
        '<button class="btn" data-x="close">ยกเลิก</button><button class="btn primary" id="uGo">บันทึก</button></div>');
      A.bindClose();
      $('uGo').onclick = function () {
        var rs = [];
        $('modalBox').querySelectorAll('[data-role]').forEach(function (c) { if (c.checked) rs.push(c.getAttribute('data-role')); });
        A.api('saveUser', {
          user: {
            empCode: $('uCode').value.trim(), name: $('uName').value.trim(), title: $('uTitle').value.trim(),
            roles: rs, dct: $('uDct').value, active: $('uActive').value === 'Y'
          }
        }).then(function () { A.closeModal(); A.toast('บันทึกผู้ใช้แล้ว'); A.go('settings'); })
          .catch(function (e) { $('uM').textContent = e.message; $('uM').classList.remove('hidden'); });
      };
    }
  }

  return { month: month, dash: dash, settings: settings };
})();
