/* explore.js — รายงานเลือกมุมมอง: เลือกช่วงเวลา × ดูตาม (แพทย์/DF/สิทธิ/เวลา) × ตัวกรอง */
var EXPLORE = (function () {
  var A = SMCDF, $ = A.$, esc = A.esc, n0 = A.n0, n2 = A.n2, pct = A.pct, ic = A.ic;
  var st = null, opts = null, last = null;

  var DIMS = [
    ['doctor', 'ทันตแพทย์'], ['code', 'รหัส DF'], ['type', 'ประเภท DF (ตรวจ/หัตถการ)'], ['right', 'กลุ่มสิทธิการรักษา'], ['pttype', 'สิทธิการรักษา (ตามระบบ รพ.)'],
    ['day', 'รายวัน'], ['month', 'รายเดือน'], ['quarter', 'รายไตรมาส (ปีงบ)'], ['fy', 'รายปีงบประมาณ'], ['weekday', 'วันในสัปดาห์']
  ];
  var TIME = ['day', 'month', 'quarter', 'fy', 'weekday'];
  var PER = [['day', 'รายวัน'], ['range', 'ช่วงวันที่'], ['month', 'รายเดือน'], ['quarter', 'รายไตรมาส'], ['fy', 'ปีงบประมาณ'], ['year', 'ปีปฏิทิน']];

  function init() {
    var lastD = A.state.boot.lastDataDate || A.today();
    st = { per: 'month', day: lastD, from: A.monthStart(lastD.slice(0, 7)), to: lastD, ym: lastD.slice(0, 7), fy: A.fyOf(lastD), q: 0, year: Number(lastD.slice(0, 4)) + 543,
           dim: 'doctor', by: '', dct: '', code: '', right: '' };
    var m = Number(lastD.slice(5, 7)); st.q = m >= 10 ? 1 : m <= 3 ? 2 : m <= 6 ? 3 : 4;
  }
  function range() {
    if (st.per === 'day') return { from: st.day, to: st.day, t: A.dThai(st.day, true) };
    if (st.per === 'range') return { from: st.from, to: st.to, t: A.dThai(st.from) + ' – ' + A.dThai(st.to) };
    if (st.per === 'month') return { from: A.monthStart(st.ym), to: A.monthEnd(st.ym), t: A.ymThai(st.ym) };
    var r = A.fyRange(Number(st.fy));
    if (st.per === 'fy') return { from: r.from, to: r.to, t: 'ปีงบประมาณ ' + st.fy };
    if (st.per === 'quarter') {
      var y0 = Number(st.fy) - 544;             // ปี ค.ศ. ที่ปีงบเริ่ม (ต.ค.)
      var q = Number(st.q), sm = [10, 1, 4, 7][q - 1], yy = q === 1 ? y0 : y0 + 1;
      var f = yy + '-' + ('0' + sm).slice(-2) + '-01', em = A.addMonths(f.slice(0, 7), 2);
      return { from: f, to: A.monthEnd(em), t: 'ไตรมาส ' + q + ' ปีงบ ' + st.fy };
    }
    var cy = Number(st.year) - 543;
    return { from: cy + '-01-01', to: cy + '-12-31', t: 'ปี ' + st.year };
  }

  function page(host) {
    if (!st) init();
    var lastD = A.state.boot.lastDataDate || A.today(), fyNow = A.fyOf(lastD);
    var fys = []; for (var y = fyNow; y >= 2569; y--) fys.push(y);
    host.innerHTML =
      '<div class="panel no-print"><div class="panel-h"><h3>' + ic('filter') + 'เลือกรายงาน</h3></div><div class="panel-b">' +
      '<div class="fld" style="margin-bottom:12px"><span>ช่วงเวลา</span><div class="seg" id="xPer">' +
      PER.map(function (p) { return '<button data-per="' + p[0] + '" class="' + (st.per === p[0] ? 'on' : '') + '">' + p[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="row" id="xPerVal" style="margin-bottom:14px"></div>' +
      '<div class="g3" style="gap:0 14px">' +
      sel('xDim', 'ดูตาม', DIMS, st.dim) +
      sel('xBy', 'แยกย่อยตาม (ไม่บังคับ)', [['', '— ไม่แยก —']].concat(DIMS), st.by) +
      '<label class="fld"><span>ทันตแพทย์</span><select id="xDct"><option value="">ทุกท่าน</option></select></label>' +
      '<label class="fld"><span>รหัส DF</span><select id="xCode"><option value="">ทุกรหัส</option></select></label>' +
      '<label class="fld"><span>กลุ่มสิทธิ</span><select id="xRight"><option value="">ทุกกลุ่ม</option></select></label>' +
      '<div class="fld"><span>&nbsp;</span><button class="btn primary wide" id="xGo">' + ic('report') + 'แสดงรายงาน</button></div>' +
      '</div></div></div><div id="xOut">' + A.skeleton(4) + '</div>';

    drawPerVal();
    host.querySelectorAll('[data-per]').forEach(function (b) {
      b.onclick = function () { st.per = b.getAttribute('data-per'); host.querySelectorAll('[data-per]').forEach(function (x) { x.classList.toggle('on', x === b); }); drawPerVal(); };
    });
    $('xGo').onclick = function () { read(); run(this); };
    fillOpts();
    return run();

    function sel(id, label, list, v) {
      return '<label class="fld"><span>' + esc(label) + '</span><select id="' + id + '">' + list.map(function (x) {
        return '<option value="' + x[0] + '"' + (x[0] === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select></label>';
    }
    function drawPerVal() {
      var el = $('xPerVal'), h = '';
      if (st.per === 'day') h = '<input type="date" class="inp sm" id="xDay" value="' + st.day + '">';
      if (st.per === 'range') h = '<input type="date" class="inp sm" id="xFrom" value="' + st.from + '"><span class="note">ถึง</span><input type="date" class="inp sm" id="xTo" value="' + st.to + '">';
      if (st.per === 'month') h = '<input type="month" class="inp sm" id="xYm" value="' + st.ym + '">';
      if (st.per === 'quarter' || st.per === 'fy') h = '<select class="inp sm" id="xFy">' + fys.map(function (y) { return '<option value="' + y + '"' + (Number(st.fy) === y ? ' selected' : '') + '>ปีงบประมาณ ' + y + '</option>'; }).join('') + '</select>';
      if (st.per === 'quarter') h += '<div class="seg" id="xQ">' + [1, 2, 3, 4].map(function (q) {
        return '<button data-q="' + q + '" class="' + (Number(st.q) === q ? 'on' : '') + '">ไตรมาส ' + q + '<small class="note"> ' + ['ต.ค.–ธ.ค.', 'ม.ค.–มี.ค.', 'เม.ย.–มิ.ย.', 'ก.ค.–ก.ย.'][q - 1] + '</small></button>'; }).join('') + '</div>';
      if (st.per === 'year') { var ys = []; for (var y2 = Number(lastD.slice(0, 4)) + 543; y2 >= 2568; y2--) ys.push(y2);
        h = '<select class="inp sm" id="xYear">' + ys.map(function (y) { return '<option value="' + y + '"' + (Number(st.year) === y ? ' selected' : '') + '>ปี ' + y + '</option>'; }).join('') + '</select>'; }
      el.innerHTML = h;
      el.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { st.q = Number(b.getAttribute('data-q')); el.querySelectorAll('[data-q]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    }
    function read() {
      var v = function (id) { var e = $(id); return e ? e.value : null; };
      if (v('xDay')) st.day = v('xDay');
      if (v('xFrom')) st.from = v('xFrom');
      if (v('xTo')) st.to = v('xTo');
      if (v('xYm')) st.ym = v('xYm');
      if (v('xFy')) st.fy = Number(v('xFy'));
      if (v('xYear')) st.year = Number(v('xYear'));
      st.dim = v('xDim'); st.by = v('xBy'); st.dct = v('xDct'); st.code = v('xCode'); st.right = v('xRight');
    }
    function fillOpts() {
      if (!opts) return;
      var put = function (id, list, cur, all) {
        $(id).innerHTML = '<option value="">' + all + '</option>' + list.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === cur ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('');
      };
      put('xDct', opts.doctors.map(function (d) { return [d.code, d.name]; }), st.dct, opts.doctors.length === 1 ? opts.doctors[0].name : 'ทุกท่าน');
      put('xCode', opts.codes.map(function (c) { return [c.code, c.code + ' · ' + c.label]; }), st.code, 'ทุกรหัส');
      put('xRight', opts.rights.map(function (r) { return [r, r]; }), st.right, 'ทุกกลุ่ม');
    }

    function run(btn) {
      var r = range();
      if (r.from > r.to) { A.toast('วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด', { type: 'warn' }); return Promise.resolve(); }
      var p = { from: r.from, to: r.to, dim: st.dim, by: st.by || '', dct: st.dct || '', code: st.code || '', right: st.right || '' };
      if (btn) A.busyBtn(btn, true, 'กำลังคำนวณ…');
      if (!last) $('xOut').innerHTML = A.skeleton(4);
      return A.cached('getReport', p, function (d) {
        last = d; d._t = r.t;
        if (!opts) { opts = d.options; fillOpts(); }
        render(d);
      }).then(function () { if (btn) A.busyBtn(btn, false); }, function (e) { if (btn) A.busyBtn(btn, false); $('xOut').innerHTML = A.errBox(e); });
    }
  }

  function dimName(k) { var x = DIMS.filter(function (d) { return d[0] === k; })[0]; return x ? x[1] : k; }
  function keyLabel(dim, row) {
    if (dim === 'day') return A.dThai(row.key);
    if (dim === 'month') return A.ymThai(row.key);
    if (dim === 'quarter') { var p = row.key.split('-Q'); return 'ไตรมาส ' + p[1] + ' ปีงบ ' + p[0]; }
    return row.label;
  }
  function filtersText(d) {
    var f = [];
    if (st.dct && opts) { var x = opts.doctors.filter(function (z) { return z.code === st.dct; })[0]; f.push('ทันตแพทย์: ' + (x ? x.name : st.dct)); }
    if (st.code) f.push('รหัส DF: ' + st.code);
    if (st.right) f.push('สิทธิ: ' + st.right);
    return f.join(' · ');
  }

  function render(d) {
    var t = d.totals, c = d.settings, isTime = TIME.indexOf(d.dim) >= 0;
    var ft = filtersText(d);
    var h = '<div class="panel no-print"><div class="panel-b" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<div><b>' + esc(dimName(d.dim)) + (d.by ? ' × ' + esc(dimName(d.by)) : '') + '</b><span class="sub-t">' + esc(d._t) + (ft ? ' · ' + esc(ft) : '') + '</span></div><span class="spacer"></span>' +
      '<button class="btn sm" id="xXls">' + ic('excel') + 'Excel</button><button class="btn sm" id="xImg">' + ic('image') + 'ภาพรายงาน</button>' +
      '<button class="btn sm" id="xPrint">' + ic('print') + 'พิมพ์</button></div></div>';
    h += '<div class="kpis">' +
      PAGES.kpi('ยอดรับรอง (DF 100%)', n2(t.keep), 'แพทย์ ' + n2(t.pay80) + ' · รพ. ' + n2(t.hos20), 'hero', 'money') +
      PAGES.kpi('จำนวนเคส', n0(t.cases), n0(t.items) + ' รายการ · ' + n0(t.days) + ' วัน', '', 'cases') +
      PAGES.kpi('ทันตแพทย์', n0(t.doctors) + '<small>ท่าน</small>', '', '', 'tooth') +
      PAGES.kpi('ยอดที่เก็บได้', n2(t.base), '', '', 'money') +
      PAGES.kpi('ยอดที่ระงับ', n2(t.drop), n0(t.dropCases) + ' เคส · ' + pct(t.rate) + ' คีย์เกิน', t.drop ? 'bad' : 'ok', 'cut') +
      '</div>';
    if (!d.rows.length) { $('xOut').innerHTML = h + '<div class="panel">' + A.empty('ไม่มีข้อมูลตามเงื่อนไขที่เลือก', 'ลองเปลี่ยนช่วงเวลาหรือตัวกรอง', 'filter') + '</div>'; bind(d); return; }

    h += '<div class="panel"><div class="panel-h"><h3>' + ic('dash') + 'ยอดรับรองและยอดที่ระงับ ' + esc(dimName(d.dim)) + '</h3></div><div class="panel-b"><div class="chart" id="xChart"></div></div></div>';
    h += '<div class="panel"><div class="panel-h"><h3>' + ic('code') + 'ตารางรายงาน</h3><span class="spacer"></span><span class="tag">' + d.rows.length + ' แถว</span>' +
      (d.dim !== 'doctor' ? '<div class="sub">ส่วนแพทย์/รพ. เป็นยอดประมาณการ — ยอดจ่ายจริงปัดเศษรายคนในหน้ารอบเบิก</div>' : '') + '</div>' +
      '<div class="panel-b flush wrap-x"><table class="rt"><thead><tr><th>' + esc(dimName(d.dim)) + '</th><th class="n">เคส</th><th class="n">รายการ</th>' +
      (d.dim !== 'doctor' ? '<th class="n">ทันตแพทย์</th>' : '<th class="n">วัน</th>') +
      '<th class="n">ยอดที่เก็บได้</th><th class="n">ระงับ</th><th class="n">รับรอง</th><th class="n">แพทย์ ' + pct(c.sharePct) + '</th><th class="n">รพ.</th><th class="n">คีย์เกิน</th></tr></thead><tbody>' +
      d.rows.map(function (r) {
        var main = row(r, keyLabel(d.dim, r), d.dim, '');
        if (!d.by || !d.cross || !d.cross[r.key]) return main;
        return main + d.cross[r.key].map(function (s) { return row(s, '↳ ' + keyLabel(d.by, s), d.dim, 'sub'); }).join('');
      }).join('') +
      '<tr class="sum"><td>รวม</td><td class="n">' + n0(t.cases) + '</td><td class="n">' + n0(t.items) + '</td><td class="n">' + n0(d.dim !== 'doctor' ? t.doctors : t.days) + '</td>' +
      '<td class="n">' + n2(t.base) + '</td><td class="n">' + n2(t.drop) + '</td><td class="n">' + n2(t.keep) + '</td><td class="n">' + n2(t.pay80) + '</td><td class="n">' + n2(t.hos20) + '</td><td class="n">' + pct(t.rate) + '</td></tr>' +
      '</tbody></table></div></div>';
    $('xOut').innerHTML = h;
    A.cardify($('xOut'));
    bind(d);

    var rows = d.rows.slice(0, 40);
    var labs = rows.map(function (r) { return d.dim === 'day' ? A.dThai(r.key) : d.dim === 'month' ? A.ymShort(r.key) : keyLabel(d.dim, r); });
    var horiz = !isTime && rows.length > 0;
    if (horiz) $('xChart').style.height = Math.max(220, rows.length * 32 + 60) + 'px';
    CH.bar($('xChart'), { aria: 'กราฟรายงาน', labels: labs, stacked: true, horizontal: horiz, thick: horiz ? 22 : 34, series: [
      { label: 'รับรอง', data: rows.map(function (r) { return r.keep; }), color: css('--c-keep') },
      { label: 'ระงับ', data: rows.map(function (r) { return r.drop; }), color: css('--c-drop') }] });

    function row(r, label, dim, cls) {
      return '<tr class="' + cls + '"' + (cls ? ' style="font-size:13px;color:var(--ink-2)"' : '') + '><td>' + esc(label) + '</td><td class="n">' + n0(r.cases) + '</td><td class="n">' + n0(r.items) + '</td>' +
        '<td class="n">' + n0(dim !== 'doctor' ? r.doctors : r.days) + '</td><td class="n">' + n2(r.base) + '</td>' +
        '<td class="n">' + (r.drop ? '<span class="badge bad">' + n2(r.drop) + '</span>' : '-') + '</td><td class="n"><b>' + n2(r.keep) + '</b></td>' +
        '<td class="n">' + n2(r.pay80) + '</td><td class="n">' + n2(r.hos20) + '</td><td class="n">' + pct(r.rate) + '</td></tr>';
    }
  }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  function bind(d) {
    $('xXls').onclick = function () {
      var t = d.totals, rows = [['รายงานค่าธรรมเนียมแพทย์ ทันตกรรมนอกเวลา — ' + dimName(d.dim) + (d.by ? ' × ' + dimName(d.by) : '')], [d._t + (filtersText(d) ? ' · ' + filtersText(d) : '')], [],
        [dimName(d.dim), d.by ? dimName(d.by) : '', 'เคส', 'รายการ', 'ทันตแพทย์', 'วัน', 'ยอดที่เก็บได้', 'ระงับ', 'รับรอง (DF 100%)', 'ส่วนแพทย์', 'ส่วน รพ.', 'อัตราคีย์เกิน']];
      d.rows.forEach(function (r) {
        rows.push([keyLabel(d.dim, r), '', r.cases, r.items, r.doctors, r.days, r.base, r.drop, r.keep, r.pay80, r.hos20, Number(r.rate.toFixed(4))]);
        if (d.by && d.cross && d.cross[r.key]) d.cross[r.key].forEach(function (s) {
          rows.push(['', keyLabel(d.by, s), s.cases, s.items, s.doctors, s.days, s.base, s.drop, s.keep, s.pay80, s.hos20, Number(s.rate.toFixed(4))]);
        });
      });
      rows.push(['รวม', '', t.cases, t.items, t.doctors, t.days, t.base, t.drop, t.keep, t.pay80, t.hos20, Number((t.rate || 0).toFixed(4))]);
      A.saveSheet([{ name: 'รายงาน', rows: rows, cols: [30, 26, 8, 8, 10, 8, 14, 12, 16, 14, 12, 12] }], 'DF_รายงาน_' + d.dim + '_' + d.from + '_' + d.to + '.xlsx');
    };
    $('xImg').onclick = function () {
      A.imageTool({ title: 'ภาพรายงาน', filename: 'DF_รายงาน_' + d.dim + '_' + d.from + '.png',
        options: [{ key: 'money', label: 'แสดงยอดเงิน', sub: 'ถ้าไม่เลือก แสดงเฉพาะจำนวนเคส', on: true }],
        render: function (o) { return shareCard(d, o); } });
    };
    $('xPrint').onclick = function () { A.printA4(a4(d)); };
  }

  function shareCard(d, o) {
    var el = document.createElement('div'); el.className = 'share';
    var t = d.totals;
    el.innerHTML = '<div class="sh-h">' + A.LOGO_SVG + '<div><b>รายงานค่าธรรมเนียมแพทย์ ทันตกรรม</b><small>' + esc(dimName(d.dim)) + (d.by ? ' × ' + esc(dimName(d.by)) : '') + '</small></div></div>' +
      '<div class="sh-d">' + esc(d._t) + (filtersText(d) ? ' · ' + esc(filtersText(d)) : '') + '</div><div class="sh-b"><div class="sh-k">' +
      '<div><small>เคส</small><b>' + n0(t.cases) + '</b></div><div><small>' + (o.money ? 'ยอดรับรอง' : 'ทันตแพทย์') + '</small><b>' + (o.money ? n0(t.keep) : n0(t.doctors)) + '</b></div>' +
      '<div><small>' + (o.money ? 'ระงับ' : 'คีย์เกิน') + '</small><b class="bad">' + (o.money ? n0(t.drop) : pct(t.rate)) + '</b></div></div>' +
      '<table><tbody>' + d.rows.slice(0, 18).map(function (r) {
        return '<tr><td>' + esc(keyLabel(d.dim, r)) + '</td><td class="n">' + n0(r.cases) + ' เคส</td>' + (o.money ? '<td class="n">' + n2(r.keep) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table>' + (d.rows.length > 18 ? '<p style="color:#6F7F85;font-size:14px">และอีก ' + (d.rows.length - 18) + ' แถว</p>' : '') +
      '</div><div class="sh-f">ผู้รายงาน ' + esc(A.state.me.name) + ' · SMC DF</div>';
    return el;
  }

  function a4(d) {
    var t = d.totals, c = d.settings;
    return '<div class="a4"><div class="a4-top"><span>' + esc(c.org) + '</span><span>พิมพ์ ' + esc(A.dThai(A.today())) + '</span></div>' +
      '<h2>รายงานค่าธรรมเนียมแพทย์ ทันตกรรมนอกเวลา — ' + esc(dimName(d.dim)) + (d.by ? ' × ' + esc(dimName(d.by)) : '') + '</h2>' +
      '<div class="a4-sub">' + esc(d._t) + (filtersText(d) ? ' · ' + esc(filtersText(d)) : '') + '</div>' +
      '<table><thead><tr><th>' + esc(dimName(d.dim)) + '</th><th>เคส</th><th>ยอดที่เก็บได้</th><th>ระงับ</th><th>รับรอง (DF 100%)</th><th>แพทย์ ' + pct(c.sharePct) + '</th><th>รพ.</th></tr></thead><tbody>' +
      d.rows.map(function (r) {
        var m = '<tr><td>' + esc(keyLabel(d.dim, r)) + '</td><td class="c">' + n0(r.cases) + '</td><td class="n">' + n2(r.base) + '</td><td class="n">' + (r.drop ? n2(r.drop) : '-') + '</td><td class="n">' + n2(r.keep) + '</td><td class="n">' + n2(r.pay80) + '</td><td class="n">' + n2(r.hos20) + '</td></tr>';
        if (d.by && d.cross && d.cross[r.key]) m += d.cross[r.key].map(function (s) {
          return '<tr style="color:#444"><td style="padding-left:18px">' + esc(keyLabel(d.by, s)) + '</td><td class="c">' + n0(s.cases) + '</td><td class="n">' + n2(s.base) + '</td><td class="n">' + (s.drop ? n2(s.drop) : '-') + '</td><td class="n">' + n2(s.keep) + '</td><td class="n">' + n2(s.pay80) + '</td><td class="n">' + n2(s.hos20) + '</td></tr>';
        }).join('');
        return m;
      }).join('') +
      '<tr class="sum"><td class="c">รวม</td><td class="c">' + n0(t.cases) + '</td><td class="n">' + n2(t.base) + '</td><td class="n">' + n2(t.drop) + '</td><td class="n">' + n2(t.keep) + '</td><td class="n">' + n2(t.pay80) + '</td><td class="n">' + n2(t.hos20) + '</td></tr>' +
      '</tbody></table><div class="a4-foot">ผู้จัดทำรายงาน ' + esc(A.state.me.name) + ' · ' + esc(c.contactLine) + '</div></div>';
  }

  return { page: page };
})();
