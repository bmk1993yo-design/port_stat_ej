// 라이브러리 없이 canvas로 그리는 차트 모음 (인터넷 없는 교실에서도 동작)
const Charts = {
  PAD: 48,
  FONT: "14px 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",

  // 축과 격자를 그리고 좌표 변환 함수를 돌려준다
  axes(cv, { xMin, xMax, yMin, yMax, xLabel = "", yLabel = "", xStep, yStep }) {
    const ctx = cv.getContext("2d"), P = Charts.PAD, W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const sx = (x) => P + ((x - xMin) / (xMax - xMin)) * (W - P * 1.4);
    const sy = (y) => H - P - ((y - yMin) / (yMax - yMin)) * (H - P * 1.4);
    ctx.font = Charts.FONT; ctx.lineWidth = 1;
    ctx.strokeStyle = "#e9ecef"; ctx.fillStyle = "#868e96";
    if (yStep) for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      ctx.beginPath(); ctx.moveTo(P, sy(y)); ctx.lineTo(W - P * 0.4, sy(y)); ctx.stroke();
      ctx.textAlign = "right"; ctx.fillText(y, P - 6, sy(y) + 5);
    }
    if (xStep) for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      ctx.beginPath(); ctx.moveTo(sx(x), P * 0.4); ctx.lineTo(sx(x), H - P); ctx.stroke();
      ctx.textAlign = "center"; ctx.fillText(x, sx(x), H - P + 18);
    }
    ctx.strokeStyle = "#495057";
    ctx.beginPath(); ctx.moveTo(P, P * 0.4); ctx.lineTo(P, H - P); ctx.lineTo(W - P * 0.4, H - P); ctx.stroke();
    // 0 기준선
    if (xMin < 0 && xMax > 0) { ctx.beginPath(); ctx.moveTo(sx(0), P * 0.4); ctx.lineTo(sx(0), H - P); ctx.stroke(); }
    if (yMin < 0 && yMax > 0) { ctx.beginPath(); ctx.moveTo(P, sy(0)); ctx.lineTo(W - P * 0.4, sy(0)); ctx.stroke(); }
    ctx.fillStyle = "#212529"; ctx.textAlign = "center";
    ctx.fillText(xLabel, (P + W) / 2, H - 8);
    ctx.save(); ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();
    return { ctx, sx, sy };
  },

  dot(ctx, x, y, color, r = 7, label) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
    if (label) { ctx.fillStyle = "#212529"; ctx.textAlign = "left"; ctx.fillText(label, x + 10, y - 8); }
  },

  // 1단계: 가게별 표준편차 가로 막대
  sdBars(cv, keys) {
    const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, L = 170, max = 18;
    ctx.clearRect(0, 0, W, H); ctx.font = Charts.FONT;
    const rowH = (H - 30) / keys.length;
    keys.forEach((k, i) => {
      const s = SHOPS[k], sd = Stats.sd(s.returns), y = 10 + i * rowH, w = (sd / max) * (W - L - 70);
      ctx.fillStyle = "#212529"; ctx.textAlign = "right";
      ctx.fillText(`${s.emoji} ${s.name}`, L - 10, y + rowH / 2 + 5);
      ctx.fillStyle = s.color; ctx.fillRect(L, y + rowH * 0.2, w, rowH * 0.6);
      ctx.fillStyle = "#212529"; ctx.textAlign = "left";
      ctx.fillText(`${Stats.round(sd)}%`, L + w + 8, y + rowH / 2 + 5);
    });
    ctx.fillStyle = "#868e96"; ctx.textAlign = "left"; ctx.fillText("표준편차(위험) →", L, H - 6);
  },

  // 2단계: 수직선 위 세 날씨의 수익률, 평균선, 표준편차 범위
  numberLine(cv, returns, color) {
    const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, P = 40;
    ctx.clearRect(0, 0, W, H); ctx.font = Charts.FONT;
    const lo = -40, hi = 50, sx = (x) => P + ((Math.max(lo, Math.min(hi, x)) - lo) / (hi - lo)) * (W - 2 * P);
    const y = H * 0.62, m = Stats.mean(returns), sd = Stats.sd(returns);
    ctx.fillStyle = "rgba(43,138,62,0.12)"; ctx.fillRect(sx(m - sd), y - 50, sx(m + sd) - sx(m - sd), 64);
    ctx.strokeStyle = "#adb5bd"; ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(W - P, y); ctx.stroke();
    for (let t = lo; t <= hi; t += 10) { ctx.fillStyle = "#868e96"; ctx.textAlign = "center"; ctx.fillText(t, sx(t), y + 22); }
    ctx.strokeStyle = MIX_COLOR; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(sx(m), y - 56); ctx.lineTo(sx(m), y + 6); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = MIX_COLOR; ctx.textAlign = "center";
    ctx.fillText(`평균 ${Stats.round(m)}%  ·  표준편차 ${Stats.round(sd)}%`, W / 2, 20);
    returns.forEach((r, i) => Charts.dot(ctx, sx(r), y - 12 - i * 12, color, 7, WEATHER_SHORT[i]));
  },

  scatter(cv, pts, opt) {
    const g = Charts.axes(cv, opt);
    pts.forEach((p) => Charts.dot(g.ctx, g.sx(p[0]), g.sy(p[1]), p[2], 8, p[3]));
    return g;
  },

  // 4단계: 날씨별 섞은 바구니 수익률 막대
  bars(cv, values) {
    const g = Charts.axes(cv, { xMin: 0, xMax: 3, yMin: -25, yMax: 25, yStep: 10, yLabel: "수익률(%)" });
    const { ctx, sx, sy } = g;
    values.forEach((v, i) => {
      const x0 = sx(i + 0.2), x1 = sx(i + 0.8);
      ctx.fillStyle = v >= 0 ? MIX_COLOR : "#c92a2a";
      ctx.fillRect(x0, Math.min(sy(0), sy(v)), x1 - x0, Math.abs(sy(v) - sy(0)));
      ctx.fillStyle = "#212529"; ctx.textAlign = "center";
      ctx.fillText(`${v > 0 ? "+" : ""}${Stats.round(v)}%`, (x0 + x1) / 2, v >= 0 ? sy(v) - 6 : sy(v) + 18);
      ctx.fillText(WEATHER_SHORT[i], (x0 + x1) / 2, cv.height - Charts.PAD + 18);
    });
  },

  // 4단계: 위험(표준편차)–수익(평균) 평면 위의 비율별 곡선
  riskReturn(cv, a, b, wNow, color, records) {
    const g = Charts.axes(cv, { xMin: 0, xMax: 18, yMin: 0, yMax: 6, xStep: 3, yStep: 1,
      xLabel: "표준편차(%) = 위험 →", yLabel: "평균 수익률(%) →" });
    const { ctx, sx, sy } = g;
    // 조건선: 평균 3% 이상
    ctx.fillStyle = "rgba(43,138,62,0.08)";
    ctx.fillRect(sx(0), sy(6), sx(18) - sx(0), sy(CHALLENGE.minMean) - sy(6));
    ctx.fillStyle = MIX_COLOR; ctx.textAlign = "right"; ctx.fillText(`조건: 평균 ${CHALLENGE.minMean}% 이상`, sx(18) - 4, sy(CHALLENGE.minMean) - 6);
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let p = 0; p <= 100; p++) {
      const m = Stats.mix(a, b, p / 100), x = sx(Stats.sd(m)), y = sy(Stats.mean(m));
      p ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.lineWidth = 1;
    records.forEach((r) => Charts.dot(ctx, sx(r.sd), sy(r.mean), "#adb5bd", 5));
    const m = Stats.mix(a, b, wNow);
    Charts.dot(ctx, sx(Stats.sd(m)), sy(Stats.mean(m)), "#212529", 8, "지금 바구니");
  },
};
