/* pages.js — หน้ารายงานประจำวัน และหน้าทวนสอบ DF เกิน 1 รายการ */
var PAGES = (function () {
  var A = SMCDF, $ = A.$, esc = A.esc, n0 = A.n0, n2 = A.n2, pct = A.pct;
  var cur = { date: null, data: null };

  function stat(k, v, s, cls) {
    return '<div class="stat ' + (cls || '') + '"><div class="k">' + esc(k) + '</div>' +
      '<div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  }
  function isAdmin() { return A.state.me.roles.indexOf('admin') >= 0; }
  function canEdit() { return isAdmin() || A.state.me.roles.indexOf('hr') >= 0; }

  /* ================= รายงานประจำวัน ================= */
  function daily(host) {
    var d = cur.date || A.state.boot.lastDataDate || A.today();
    cur.date = d;
    host.innerHTML =
      '<div class="panel no-print"><div class="panel-h">' +
      '<button class="btn sm" id="dPrev">‹ วันก่อน</button>' +
      '<input type="date" id="dDate" value="' + esc(d) + '" style="padding:7px 10px;border:1px solid var(--line-2);border-radius:7px;background:var(--card-2)">' +
      '<button class="btn sm" id="dNext">วันถัดไป ›</button>' +
      '<button class="btn sm" id="dToday">วันนี้</button>' +
      '<div style="flex:1"></div>' +
      (canEdit() ? '<button class="btn sm" id="dSync">ดึงยอดใหม่</button>' : '') +
      '<button class="btn sm" id="dLine">คัดลอกข้อความไลน์</button>' +
      '<button class="btn sm" id="dImg">สร้างภาพ</button>' +
      '<button class="btn sm accent" id="dPrint">พิมพ์ A4</button>' +
      '</div></div><div id="dBody">' + A.loading() + '</div>';

    $('dDate').onchange = function () { cur.date = this.value; daily(host); };
    $('dPrev').onclick = function () { cur.date = A.addDays(cur.date, -1); daily(host); };
    $('dNext').onclick = function () { cur.date = A.addDays(cur.date, 1); daily(host); };
    $('dToday').onclick = function () { cur.date = A.today(); daily(host); };
    $('dPrint').onclick = function () { window.print(); };
    $('dLine').onclick = function () { A.copyText(lineText(cur.data)); };
    $('dImg').onclick = function () { A.shotToImage($('a4'), 'DF_' + cur.date + '.png'); };
    if ($('dSync')) $('dSync').onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'กำลังดึง…';
      A.api('syncNow', { from: cur.date, to: cur.date })
        .then(function (r) { A.toast('ดึงยอดใหม่แล้ว ' + r.rows + ' รายการ'); daily(host); })
        .catch(function (e) { A.toast(e.message, 5000); b.disabled = false; b.textContent = 'ดึงยอดใหม่'; });
    };

    return A.api('getDaily', { date: d }).then(function (data) {
      cur.data = data;
      renderDaily($('dBody'), data, host);
    }).catch(function (e) { $('dBody').innerHTML = A.errBox(e); });
  }

  function renderDaily(host, d, pageHost) {
    if (!d.exists) {
      host.innerHTML = '<div class="panel"><div class="empty">' +
        'ไม่มีข้อมูลค่าธรรมเนียมแพทย์ของ ' + A.dThai(d.date, true) + '<br>' +
        '<span class="note">อาจเป็นวันที่คลินิกไม่เปิด หรือยอดยังไม่เข้าระบบสารสนเทศ</span></div></div>';
      return;
    }
    var s = d.summary, c = d.settings;
    var html = '<div class="cards no-print">' +
      stat('ทันตแพทย์ออกตรวจ', n0(s.doctors) + ' <small style="font-size:14px">ท่าน</small>', '', '') +
      stat('จำนวนเคส', n0(s.cases) + ' <small style="font-size:14px">เคส</small>', n0(s.items) + ' รายการ DF') +
      stat('ยอดที่เก็บได้', n2(s.base), 'ชำระเงินสด + เบิกประกันได้', 'accent') +
      stat('ยอดรับรองจ่าย', n2(s.keep), 'แพทย์ ' + n2(s.pay80) + ' · รพ. ' + n2(s.hos20), 'ok') +
      stat('ยอดที่ระงับ', n2(s.drop), s.dropCases ? s.dropCases + ' เคสคีย์ DF เกิน 1' : 'ไม่มีรายการระงับ', s.drop > 0 ? 'bad' : '') +
      '</div>';

    if (s.drop > 0) {
      html += '<div class="msg warn no-print">วันนี้มี ' + s.dropCases + ' เคสที่คีย์ DF มากกว่า 1 รายการ ' +
        'ระบบรับรองเฉพาะรายการที่สูงที่สุดตามกติกา และระงับยอดรวม ' + n2(s.drop) + ' บาท — ดูรายละเอียดในตารางด้านล่าง</div>';
    }
    if (!d.cases.length || !d.cases[0].ruleActive) {
      html += '<div class="msg no-print">วันนี้อยู่ก่อนวันที่กติกาเริ่มมีผล (' + A.dThai(c.ruleFrom) +
        ') ระบบจึงรับรองทุกรายการตามที่ระบบโรงพยาบาลจ่ายจริง</div>';
    }

    /* ตารางรายแพทย์ */
    html += '<div class="panel no-print"><div class="panel-h"><h3>สรุปรายทันตแพทย์</h3>' +
      '<span class="tag">ฐานคำนวณ = ชำระเงินสด + เบิกประกันได้</span></div>' +
      '<div class="panel-b flush wrap-x"><table><thead><tr>' +
      '<th>ทันตแพทย์</th><th class="n">เคส</th><th class="n">รายการ</th>' +
      '<th class="n">ยอดที่เก็บได้</th><th class="n">รับรอง</th><th class="n">ระงับ</th>' +
      '<th class="n">แพทย์ ' + pct(c.sharePct) + '</th><th class="n">รพ. ' + pct(1 - c.sharePct) + '</th>' +
      '</tr></thead><tbody>' +
      d.byDoctor.map(function (x) {
        return '<tr><td>' + esc(x.name) + '<br><small class="note">' + esc(x.dct) + '</small></td>' +
          '<td class="n">' + n0(x.cases) + '</td><td class="n">' + n0(x.items) + '</td>' +
          '<td class="n">' + n2(x.base) + '</td><td class="n">' + n2(x.keep) + '</td>' +
          '<td class="n">' + (x.drop > 0 ? '<span class="badge bad">' + n2(x.drop) + '</span>' : '-') + '</td>' +
          '<td class="n">' + n2(x.pay80) + '</td><td class="n">' + n2(x.hos20) + '</td></tr>';
      }).join('') +
      '<tr class="sum"><td>รวม</td><td class="n">' + n0(s.cases) + '</td><td class="n">' + n0(s.items) + '</td>' +
      '<td class="n">' + n2(s.base) + '</td><td class="n">' + n2(s.keep) + '</td><td class="n">' + n2(s.drop) + '</td>' +
      '<td class="n">' + n2(s.pay80) + '</td><td class="n">' + n2(s.hos20) + '</td></tr>' +
      '</tbody></table></div></div>';

    /* เคสที่ถูกระงับ */
    if (d.dropped.length) {
      html += '<div class="panel no-print"><div class="panel-h"><h3>เคสที่คีย์ DF เกิน 1 รายการ</h3>' +
        '<span class="tag">' + d.dropped.length + ' เคส</span></div>' +
        '<div class="panel-b flush wrap-x">' + caseTable(d.dropped) + '</div></div>';
    }

    /* สิทธิการรักษา */
    html += '<div class="panel no-print"><div class="panel-h"><h3>สิทธิการรักษา</h3></div>' +
      '<div class="panel-b flush wrap-x"><table><thead><tr><th>กลุ่มสิทธิ</th>' +
      '<th class="n">รายการ</th><th class="n">ยอดที่เก็บได้</th><th style="width:34%">สัดส่วน</th></tr></thead><tbody>' +
      d.rights.map(function (r) {
        var p = s.base ? r.base / s.base : 0;
        return '<tr><td>' + esc(r.grp) + '</td><td class="n">' + n0(r.items) + '</td>' +
          '<td class="n">' + n2(r.base) + '</td>' +
          '<td><div class="bar"><i style="width:' + (p * 100).toFixed(1) + '%"></i></div>' +
          '<small class="note">' + pct(p) + '</small></td></tr>';
      }).join('') + '</tbody></table></div></div>';

    /* เจ้าหน้าที่ */
    html += staffPanel(d);

    /* ใบ A4 */
    html += a4(d);

    host.innerHTML = html;
    bindCases(host, pageHost);
    bindStaff(host, d, pageHost);
  }

  function caseTable(cases) {
    return '<table><thead><tr><th>HN</th><th>ทันตแพทย์</th><th>สิทธิ</th>' +
      '<th>รายการ DF</th><th class="n">ยอดที่เก็บได้</th><th>สถานะ</th>' +
      (isAdmin() ? '<th class="no-print"></th>' : '') + '</tr></thead><tbody>' +
      cases.map(function (c) {
        return c.items.map(function (it, i) {
          return '<tr class="' + (it.keep ? '' : 'cut') + '">' +
            (i === 0 ? '<td rowspan="' + c.items.length + '">' + esc(c.hn) + '</td>' +
              '<td rowspan="' + c.items.length + '">' + esc(c.dctName) + '</td>' +
              '<td rowspan="' + c.items.length + '">' + esc(c.pttype) + '</td>' : '') +
            '<td>' + esc(it.label) + ' <small class="note">(' + esc(it.charge) + ')</small></td>' +
            '<td class="n">' + n2(it.base) + (Number(it.total) !== Number(it.base) ?
              '<br><small class="note">เรียกเก็บ ' + n2(it.total) + '</small>' : '') + '</td>' +
            '<td>' + (it.keep
              ? '<span class="badge ok">รับรอง</span>'
              : '<span class="badge bad">ระงับ</span>') +
            (it.why ? '<br><small class="note">' + esc(it.why) + '</small>' : '') + '</td>' +
            (isAdmin() ? '<td class="no-print">' +
              (it.override
                ? '<button class="btn sm" data-ov-clear="' + esc(it.id) + '">ยกเลิกข้อยกเว้น</button>'
                : (it.keep
                  ? '<button class="btn sm" data-ov-deny="' + esc(it.id) + '">ระงับรายการนี้</button>'
                  : '<button class="btn sm" data-ov-allow="' + esc(it.id) + '">ปลดล็อกให้จ่าย</button>')) +
              '</td>' : '') +
            '</tr>';
        }).join('');
      }).join('') + '</tbody></table>';
  }

  function bindCases(host, pageHost) {
    ['allow', 'deny', 'clear'].forEach(function (act) {
      host.querySelectorAll('[data-ov-' + act + ']').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-ov-' + act);
          if (act === 'clear') return doOverride(id, 'clear', '', pageHost);
          A.modal('<h3>' + (act === 'allow' ? 'ปลดล็อกให้จ่ายรายการนี้' : 'ระงับรายการนี้') + '</h3>' +
            '<p class="note">ระบบยึดกติกาเป็นหลัก การปลดล็อกเป็นข้อยกเว้นรายกรณี ต้องระบุเหตุผลและจะถูกบันทึกประวัติไว้</p>' +
            '<label class="fld"><span>เหตุผล</span><textarea id="ovR" rows="3" placeholder="เช่น ตรวจสอบเวชระเบียนแล้วพบว่าทำหัตถการจริง 2 อย่าง"></textarea></label>' +
            '<div id="ovM" class="msg err hidden"></div>' +
            '<div class="btns" style="justify-content:flex-end">' +
            '<button class="btn" data-x="close">ยกเลิก</button>' +
            '<button class="btn primary" id="ovGo">บันทึก</button></div>');
          A.bindClose();
          $('ovGo').onclick = function () {
            var r = $('ovR').value.trim();
            if (r.length < 5) { $('ovM').textContent = 'กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร'; $('ovM').classList.remove('hidden'); return; }
            doOverride(id, act, r, pageHost);
          };
        };
      });
    });
  }

  function doOverride(id, action, reason, pageHost) {
    A.api('setOverride', { chargeId: id, action: action, reason: reason })
      .then(function () { A.closeModal(); A.toast('บันทึกแล้ว'); A.go(A.state.page); })
      .catch(function (e) {
        if ($('ovM')) { $('ovM').textContent = e.message; $('ovM').classList.remove('hidden'); }
        else A.toast(e.message, 5000);
      });
  }

  function staffPanel(d) {
    var st = d.staff || { ok: false, list: [], manual: [] };
    var list = (st.list || []).concat(st.manual || []);
    var body;
    if (!list.length) {
      body = '<div class="empty">' + esc(st.ok ? 'ไม่มีเจ้าหน้าที่ทันตกรรมในตารางเวรวันนี้' :
        (st.reason || 'ยังไม่ได้เชื่อมต่อระบบตารางเวร')) + '</div>';
    } else {
      body = '<table><thead><tr><th>ตำแหน่ง</th><th>ชื่อ-นามสกุล</th><th>รหัส</th><th>หมายเหตุ</th></tr></thead><tbody>' +
        list.map(function (x) {
          return '<tr><td>' + esc(x.positionName || x.position || '-') + '</td><td>' + esc(x.fullName || x.name || '-') + '</td>' +
            '<td>' + esc(x.empCode || '-') + '</td><td>' + esc(x.note || '') + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    return '<div class="panel no-print"><div class="panel-h"><h3>เจ้าหน้าที่ปฏิบัติงาน</h3>' +
      '<span class="tag">' + (st.ok ? 'จากระบบ SMC Duty' : 'คีย์เอง') + '</span>' +
      (canEdit() ? '<button class="btn sm" id="stEdit">แก้ไขรายชื่อที่คีย์เอง</button>' : '') +
      '</div><div class="panel-b flush wrap-x">' + body + '</div></div>';
  }

  function bindStaff(host, d, pageHost) {
    var b = $('stEdit');
    if (!b) return;
    b.onclick = function () {
      var man = (d.staff && d.staff.manual) || [];
      A.modal('<h3>รายชื่อเจ้าหน้าที่ที่คีย์เอง</h3>' +
        '<p class="note">ใช้กรณีตารางเวรยังไม่ครบ หรือมีการสลับเวร — พิมพ์บรรทัดละ 1 คน รูปแบบ <b>ตำแหน่ง | ชื่อ-นามสกุล | รหัส</b></p>' +
        '<label class="fld"><textarea id="stTx" rows="7" placeholder="ผู้ช่วยทันตแพทย์ | นางสาวสมหญิง ใจดี | 5601234">' +
        esc(man.map(function (x) { return [x.positionName || '', x.fullName || '', x.empCode || ''].join(' | '); }).join('\n')) +
        '</textarea></label>' +
        '<div class="btns" style="justify-content:flex-end">' +
        '<button class="btn" data-x="close">ยกเลิก</button>' +
        '<button class="btn primary" id="stGo">บันทึก</button></div>');
      A.bindClose();
      $('stGo').onclick = function () {
        var list = $('stTx').value.split('\n').map(function (l) {
          var p = l.split('|').map(function (x) { return x.trim(); });
          if (!p[0] && !p[1]) return null;
          return { positionName: p[0] || '', fullName: p[1] || '', empCode: p[2] || '', note: '' };
        }).filter(Boolean);
        A.api('saveStaff', { date: d.date, list: list })
          .then(function () { A.closeModal(); A.toast('บันทึกรายชื่อแล้ว'); A.go('daily'); })
          .catch(function (e) { A.toast(e.message, 5000); });
      };
    };
  }

  /* ---------- ใบรายงาน A4 ---------- */
  function a4(d) {
    var s = d.summary, c = d.settings;
    var staff = ((d.staff && d.staff.list) || []).concat((d.staff && d.staff.manual) || []);
    return '<div class="a4-scroll"><div class="a4" id="a4">' +
      '<h2>' + esc(c.reportTitle) + '</h2>' +
      '<div class="a4-sub">' + esc(c.org) + '<br>ประจำ' + esc(A.dThai(d.date, true)) + '</div>' +
      '<table><tbody><tr>' +
      '<th style="width:25%">ทันตแพทย์ออกตรวจ</th><td style="width:25%">' + n0(s.doctors) + ' ท่าน</td>' +
      '<th style="width:25%">จำนวนเคส</th><td>' + n0(s.cases) + ' เคส (' + n0(s.items) + ' รายการ)</td></tr>' +
      '<tr><th>ยอดที่เก็บได้</th><td>' + n2(s.base) + ' บาท</td>' +
      '<th>ยอดรับรองจ่าย</th><td>' + n2(s.keep) + ' บาท</td></tr>' +
      '<tr><th>ส่วนแพทย์ ' + pct(c.sharePct) + '</th><td>' + n2(s.pay80) + ' บาท</td>' +
      '<th>ส่วนโรงพยาบาล ' + pct(1 - c.sharePct) + '</th><td>' + n2(s.hos20) + ' บาท</td></tr>' +
      (s.drop > 0 ? '<tr><th>ยอดที่ระงับตามกติกา</th><td colspan="3">' + n2(s.drop) + ' บาท จาก ' + s.dropCases + ' เคสที่คีย์ DF เกิน 1 รายการ</td></tr>' : '') +
      '</tbody></table>' +

      '<p style="margin:14px 0 5px;font-weight:600">รายละเอียดรายทันตแพทย์</p>' +
      '<table><thead><tr><th>ลำดับ</th><th>ทันตแพทย์</th><th style="text-align:right">เคส</th>' +
      '<th style="text-align:right">ยอดที่เก็บได้</th><th style="text-align:right">รับรอง</th>' +
      '<th style="text-align:right">แพทย์ ' + pct(c.sharePct) + '</th><th style="text-align:right">รพ.</th></tr></thead><tbody>' +
      d.byDoctor.map(function (x, i) {
        return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.name) + '</td>' +
          '<td style="text-align:right">' + n0(x.cases) + '</td>' +
          '<td style="text-align:right">' + n2(x.base) + '</td>' +
          '<td style="text-align:right">' + n2(x.keep) + '</td>' +
          '<td style="text-align:right">' + n2(x.pay80) + '</td>' +
          '<td style="text-align:right">' + n2(x.hos20) + '</td></tr>';
      }).join('') +
      '<tr><td colspan="2" style="font-weight:700">รวม</td>' +
      '<td style="text-align:right;font-weight:700">' + n0(s.cases) + '</td>' +
      '<td style="text-align:right;font-weight:700">' + n2(s.base) + '</td>' +
      '<td style="text-align:right;font-weight:700">' + n2(s.keep) + '</td>' +
      '<td style="text-align:right;font-weight:700">' + n2(s.pay80) + '</td>' +
      '<td style="text-align:right;font-weight:700">' + n2(s.hos20) + '</td></tr>' +
      '</tbody></table>' +

      '<p style="margin:14px 0 5px;font-weight:600">สิทธิการรักษา</p>' +
      '<table><thead><tr><th>กลุ่มสิทธิ</th><th style="text-align:right">รายการ</th>' +
      '<th style="text-align:right">ยอดที่เก็บได้</th></tr></thead><tbody>' +
      d.rights.map(function (r) {
        return '<tr><td>' + esc(r.grp) + '</td><td style="text-align:right">' + n0(r.items) + '</td>' +
          '<td style="text-align:right">' + n2(r.base) + '</td></tr>';
      }).join('') + '</tbody></table>' +

      (staff.length ? '<p style="margin:14px 0 5px;font-weight:600">เจ้าหน้าที่ปฏิบัติงาน</p><div style="font-size:12px">' +
        staff.map(function (x) { return esc((x.positionName || '') + ' ' + (x.fullName || '')); }).join(' · ') + '</div>' : '') +

      '<div class="sign"><div><div class="ln"></div>(' + esc(c.signer1Name || '.................................') + ')<br>' + esc(c.signer1Title) + '</div>' +
      '<div><div class="ln"></div>(' + esc(c.signer2Name || '.................................') + ')<br>' + esc(c.signer2Title) + '</div></div>' +
      '<div style="margin-top:14px;font-size:11px;color:#555;text-align:center">' +
      'ผู้จัดทำรายงาน ' + esc(A.state.me.name) + ' ' + esc(A.state.me.title ? '(' + A.state.me.title + ')' : '') +
      ' · ข้อมูล ณ ' + esc(s.apiAt || '-') + ' · ' + esc(c.contactLine) + '</div>' +
      '</div></div>';
  }

  function lineText(d) {
    if (!d || !d.exists) return 'ยังไม่มีข้อมูลของวันที่เลือก';
    var s = d.summary, c = d.settings;
    var L = [];
    L.push('รายงานค่าธรรมเนียมแพทย์ คลินิกทันตกรรมนอกเวลา');
    L.push(A.dThai(d.date, true));
    L.push('ทันตแพทย์ ' + n0(s.doctors) + ' ท่าน · ' + n0(s.cases) + ' เคส (' + n0(s.items) + ' รายการ)');
    L.push('ยอดที่เก็บได้ ' + n2(s.base) + ' บาท');
    L.push('ยอดรับรองจ่าย ' + n2(s.keep) + ' บาท (แพทย์ ' + n2(s.pay80) + ' · รพ. ' + n2(s.hos20) + ')');
    if (s.drop > 0) L.push('ระงับตามกติกา ' + n2(s.drop) + ' บาท · ' + s.dropCases + ' เคสคีย์ DF เกิน 1');
    L.push('');
    d.byDoctor.forEach(function (x) {
      L.push('• ' + x.name + ' ' + n0(x.cases) + ' เคส ' + n2(x.keep) + ' บาท' + (x.drop > 0 ? ' (ระงับ ' + n2(x.drop) + ')' : ''));
    });
    L.push('');
    L.push('สิทธิ: ' + d.rights.map(function (r) { return r.grp + ' ' + n0(r.items); }).join(' · '));
    L.push('ผู้รายงาน ' + A.state.me.name);
    return L.join('\n');
  }

  /* ================= ทวนสอบ DF เกิน 1 ================= */
  var aud = { from: null, to: null };

  function audit(host) {
    var ym = (A.state.boot.lastDataDate || A.today()).slice(0, 7);
    aud.from = aud.from || A.monthStart(ym);
    aud.to = aud.to || A.monthEnd(ym);
    host.innerHTML =
      '<div class="panel no-print"><div class="panel-h">' +
      '<span>ช่วงวันที่</span>' +
      '<input type="date" id="aFrom" value="' + esc(aud.from) + '" style="padding:7px 10px;border:1px solid var(--line-2);border-radius:7px;background:var(--card-2)">' +
      '<span>ถึง</span>' +
      '<input type="date" id="aTo" value="' + esc(aud.to) + '" style="padding:7px 10px;border:1px solid var(--line-2);border-radius:7px;background:var(--card-2)">' +
      '<button class="btn sm primary" id="aGo">แสดงผล</button>' +
      '<div style="flex:1"></div>' +
      '<button class="btn sm" id="aXls">ส่งออก Excel</button>' +
      '</div></div><div id="aBody">' + A.loading() + '</div>';

    $('aGo').onclick = function () { aud.from = $('aFrom').value; aud.to = $('aTo').value; audit(host); };
    return load();

    function load() {
      return A.api('getAudit', { from: aud.from, to: aud.to }).then(function (d) {
        render(d);
        $('aXls').onclick = function () { exportAudit(d); };
      }).catch(function (e) { $('aBody').innerHTML = A.errBox(e); });
    }

    function render(d) {
      var t = d.totals;
      var h = '<div class="cards">' +
        stat('เคสทั้งหมด', n0(t.cases)) +
        stat('เคสที่คีย์ DF เกิน 1', n0(t.over), t.cases ? pct(t.over / t.cases) + ' ของเคสทั้งหมด' : '', t.over ? 'bad' : 'ok') +
        stat('ยอดที่เก็บได้', n2(t.base)) +
        stat('ยอดที่ถูกระงับ', n2(t.drop), t.base ? pct(t.drop / t.base) + ' ของยอดที่เก็บได้' : '', t.drop ? 'bad' : 'ok') +
        '</div>';

      h += '<div class="panel"><div class="panel-h"><h3>รูปแบบการคีย์ DF ต่อ 1 เคส</h3></div>' +
        '<div class="panel-b flush wrap-x"><table><thead><tr><th>รูปแบบ</th><th class="n">เคส</th>' +
        '<th class="n">สัดส่วน</th><th class="n">ยอดที่ถูกระงับ</th></tr></thead><tbody>' +
        d.patterns.map(function (p) {
          return '<tr><td>' + esc(p.pattern) + '</td><td class="n">' + n0(p.cases) + '</td>' +
            '<td class="n">' + pct(t.cases ? p.cases / t.cases : 0) + '</td>' +
            '<td class="n">' + (p.drop ? n2(p.drop) : '-') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      h += '<div class="panel"><div class="panel-h"><h3>สัดส่วนการคีย์เกิน รายทันตแพทย์</h3>' +
        '<span class="tag">เรียงตามยอดที่ถูกระงับ</span></div>' +
        '<div class="panel-b flush wrap-x"><table><thead><tr><th>ทันตแพทย์</th><th class="n">เคส</th>' +
        '<th class="n">คีย์เกิน</th><th style="width:26%">สัดส่วน</th><th class="n">ยอดที่ถูกระงับ</th></tr></thead><tbody>' +
        d.byDoctor.map(function (x) {
          return '<tr><td>' + esc(x.name) + '</td><td class="n">' + n0(x.cases) + '</td>' +
            '<td class="n">' + n0(x.over) + '</td>' +
            '<td><div class="bar"><i class="' + (x.rate > .3 ? 'bad' : '') + '" style="width:' + (x.rate * 100).toFixed(1) + '%"></i></div>' +
            '<small class="note">' + pct(x.rate) + '</small></td>' +
            '<td class="n">' + (x.drop ? '<span class="badge bad">' + n2(x.drop) + '</span>' : '-') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      h += '<div class="panel"><div class="panel-h"><h3>รายการเคสที่คีย์ DF เกิน 1 รายการ</h3>' +
        '<span class="tag">' + d.cases.length + ' เคส' + (d.truncated ? ' (แสดง 500 เคสล่าสุด)' : '') + '</span></div>' +
        '<div class="panel-b flush scroll">' + (d.cases.length ? caseTable(d.cases) : '<div class="empty">ไม่มีเคสที่คีย์เกินในช่วงนี้</div>') + '</div></div>';

      $('aBody').innerHTML = h;
      bindCases($('aBody'), host);
    }

    function exportAudit(d) {
      var rows = [['ทวนสอบการคีย์ DF เกิน 1 รายการ'], ['ช่วงวันที่', A.dThai(d.from), 'ถึง', A.dThai(d.to)], []];
      rows.push(['ทันตแพทย์', 'เคส', 'เคสที่คีย์เกิน', 'สัดส่วน', 'ยอดที่เก็บได้', 'ยอดที่ถูกระงับ']);
      d.byDoctor.forEach(function (x) { rows.push([x.name, x.cases, x.over, Number((x.rate * 100).toFixed(1)) / 100, x.base, x.drop]); });
      rows.push(['รวม', d.totals.cases, d.totals.over, '', d.totals.base, d.totals.drop]);
      var det = [['วันที่', 'ทันตแพทย์', 'HN (ปิดบางส่วน)', 'สิทธิ', 'รหัส DF', 'ประเภท', 'ยอดเรียกเก็บ', 'ชำระเงินสด', 'เบิกประกัน', 'ยอดที่เก็บได้', 'สถานะ', 'เหตุผล']];
      d.cases.forEach(function (c) {
        c.items.forEach(function (i) {
          det.push([A.dThai(c.date), c.dctName, c.hn, c.pttype, i.charge, i.type,
            i.total, i.paid, i.claim, i.base, i.keep ? 'รับรอง' : 'ระงับ', i.why]);
        });
      });
      A.saveSheet([
        { name: 'สรุป', rows: rows, cols: [30, 10, 14, 10, 16, 16] },
        { name: 'รายการที่คีย์เกิน', rows: det, cols: [16, 28, 14, 24, 12, 10, 13, 13, 13, 14, 10, 50] }
      ], 'ทวนสอบ_DF_' + d.from + '_ถึง_' + d.to + '.xlsx');
    }
  }

  return { daily: daily, audit: audit, caseTable: caseTable, bindCases: bindCases, stat: stat };
})();
