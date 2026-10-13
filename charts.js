/* charts.js — กราฟ (Chart.js 4.4.1 โหลดเมื่อใช้) ใช้สีตามธีม · แกนเดียวเสมอ · ชี้/แตะดูตัวเลข */
var CH = (function () {
  var A = SMCDF;
  var live = {};

  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888'; }
  function palette() { return ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7'].map(css); }
  function base() {
    return {
      ink: css('--ink-2'), mute: css('--ink-3'), grid: css('--line'), card: css('--card'),
      keep: css('--c-keep'), drop: css('--c-drop'), accent: css('--accent'), brand: css('--brand')
    };
  }
  function fmtTip(fmt) {
    return function (ctx) {
      var v = ctx.parsed.y != null && ctx.chart.config.type !== 'doughnut' ? (ctx.chart.options.indexAxis === 'y' ? ctx.parsed.x : ctx.parsed.y) : ctx.parsed;
      return ' ' + (ctx.dataset.label ? ctx.dataset.label + ': ' : (ctx.label ? ctx.label + ': ' : '')) + fmt(v);
    };
  }

  /* สร้างกราฟในกล่อง (div.chart) — id ใช้ทำลายกราฟเดิมก่อนวาดใหม่ */
  function make(host, cfg) {
    return A.needChart().then(function () {
      if (!host || !document.body.contains(host)) return null;
      var id = host.id || (host.id = 'ch' + Math.random().toString(36).slice(2, 8));
      if (live[id]) { try { live[id].destroy(); } catch (e) { } }
      host.innerHTML = '<canvas role="img" aria-label="' + A.esc(cfg.aria || 'กราฟ') + '"></canvas>';
      var b = base();
      Chart.defaults.font.family = "'IBM Plex Sans Thai','IBM Plex Sans',sans-serif";
      Chart.defaults.font.size = 12.5;
      Chart.defaults.color = b.mute;
      var c = new Chart(host.querySelector('canvas'), cfg.chart(b));
      live[id] = c;
      return c;
    }).catch(function (e) {
      host.innerHTML = '<div class="note" style="padding:20px;text-align:center">แสดงกราฟไม่ได้ — ' + A.esc(e.message) + '</div>';
    });
  }

  function axisMoney(b, fmt, stacked) {
    return { stacked: !!stacked, beginAtZero: true, grid: { color: b.grid, drawTicks: false }, border: { display: false },
             ticks: { padding: 8, callback: function (v) { return (fmt || A.nk)(v); } } };
  }
  function axisCat(b, stacked) { return { stacked: !!stacked, grid: { display: false }, border: { color: b.grid }, ticks: { padding: 6, autoSkip: true, maxRotation: 0 } }; }

  /* แท่ง: labels, series:[{label,data,color}], stacked, horizontal, fmt */
  function bar(host, o) {
    return make(host, { aria: o.aria, chart: function (b) {
      var pal = palette();
      return {
        type: 'bar',
        data: { labels: o.labels, datasets: o.series.map(function (s, i) {
          return { label: s.label, data: s.data, backgroundColor: s.color || pal[i % pal.length], borderRadius: 4, borderSkipped: 'start',
                   maxBarThickness: o.thick || 34, borderColor: b.card, borderWidth: o.stacked ? { top: 2 } : 0 };
        }) },
        options: {
          responsive: true, maintainAspectRatio: false, indexAxis: o.horizontal ? 'y' : 'x', animation: { duration: 500 },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: o.series.length > 1, position: 'top', align: 'start', labels: { boxWidth: 11, boxHeight: 11, useBorderRadius: true, borderRadius: 3, padding: 14 } },
            tooltip: { callbacks: { label: fmtTip(o.fmt || A.n2), footer: o.footer || undefined }, padding: 10, boxPadding: 4 }
          },
          scales: o.horizontal
            ? { x: axisMoney(b, o.axisFmt, o.stacked), y: axisCat(b, o.stacked) }
            : { x: axisCat(b, o.stacked), y: axisMoney(b, o.axisFmt, o.stacked) },
          onClick: o.onClick ? function (e, els) { if (els.length) o.onClick(els[0].index); } : undefined
        }
      };
    } });
  }

  /* เส้น: labels, series:[{label,data,color}], fmt, min/max */
  function line(host, o) {
    return make(host, { aria: o.aria, chart: function (b) {
      var pal = palette();
      return {
        type: 'line',
        data: { labels: o.labels, datasets: o.series.map(function (s, i) {
          var col = s.color || pal[i % pal.length];
          return { label: s.label, data: s.data, borderColor: col, backgroundColor: col, borderWidth: 2, tension: .3,
                   pointRadius: 3.5, pointHoverRadius: 6, pointBackgroundColor: col, pointBorderColor: b.card, pointBorderWidth: 2, spanGaps: true,
                   fill: false };
        }) },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: o.series.length > 1, position: 'top', align: 'start', labels: { boxWidth: 11, boxHeight: 11, padding: 14 } },
            tooltip: { callbacks: { label: fmtTip(o.fmt || A.n2) }, padding: 10 }
          },
          scales: { x: axisCat(b), y: Object.assign(axisMoney(b, o.axisFmt), { suggestedMax: o.max }) }
        }
      };
    } });
  }

  /* โดนัท (สัดส่วนของทั้งหมด ไม่เกิน 7 กลุ่ม) */
  function donut(host, o) {
    return make(host, { aria: o.aria, chart: function (b) {
      var pal = palette();
      return {
        type: 'doughnut',
        data: { labels: o.labels, datasets: [{ data: o.data, backgroundColor: o.labels.map(function (x, i) { return pal[i % pal.length]; }), borderColor: b.card, borderWidth: 2, hoverOffset: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%', animation: { duration: 500 },
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 11, boxHeight: 11, padding: 10, generateLabels: function (ch) {
              var ds = ch.data.datasets[0], tot = ds.data.reduce(function (a, v) { return a + v; }, 0) || 1;
              return ch.data.labels.map(function (l, i) { return { text: l + '  ' + (ds.data[i] / tot * 100).toFixed(0) + '%', fillStyle: ds.backgroundColor[i], strokeStyle: ds.backgroundColor[i], index: i, fontColor: b.ink }; });
            } } },
            tooltip: { callbacks: { label: function (ctx) {
              var tot = ctx.dataset.data.reduce(function (a, v) { return a + v; }, 0) || 1;
              return ' ' + ctx.label + ': ' + (o.fmt || A.n0)(ctx.parsed) + ' (' + (ctx.parsed / tot * 100).toFixed(1) + '%)';
            } } }
          }
        }
      };
    } });
  }

  /* แท่งแนวนอนแบบ HTML (ไม่ต้องโหลดไลบรารี ใช้ในรายการสั้น ๆ และในภาพรายงาน) */
  function hbars(rows, o) {
    o = o || {};
    var max = Math.max.apply(null, rows.map(function (r) { return (r.a || 0) + (r.b || 0); }).concat([1]));
    return '<div class="hbars">' + rows.map(function (r) {
      return '<div class="hbar" title="' + A.esc(r.tip || '') + '"><span class="nm">' + A.esc(r.label) + '</span><span class="tr">' +
        '<i style="width:' + ((r.a || 0) / max * 100).toFixed(2) + '%;background:' + (r.ca || 'var(--c-keep)') + '"></i>' +
        (r.b ? '<i style="width:' + (r.b / max * 100).toFixed(2) + '%;background:' + (r.cb || 'var(--c-drop)') + '"></i>' : '') +
        '</span><span class="vl">' + r.value + '</span></div>';
    }).join('') + '</div>';
  }

  return { bar: bar, line: line, donut: donut, hbars: hbars, palette: palette };
})();
