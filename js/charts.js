// 라이브러리 없이 canvas로 그리는 간단한 차트 모음 (인터넷 없는 교실에서도 동작)
const Charts = {
  PAD: 44,

  // 좌표 변환 정보를 가진 축 그리기
  axes(cv, { xMin, xMax, yMin, yMax, xLabel = "", yLabel = "", xStep, yStep }) {
    const ctx = cv.getContext("2d"), P = Charts.PAD, W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const sx = (x) => P + ((x - xMin) / (xMax - xMin)) * (W - P * 1.5);
    const sy = (y) => H - P - ((y - yMin) / (yMax - yMin)) * (H - P * 1.5);
    ctx.font = "12px sans-serif";
    ctx.strokeStyle = "#e9ecef"; ctx.fillStyle = "#868e96"; ctx.lineWidth = 1;
    if (yStep) for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      ctx.beginPath(); ctx.moveTo(P, sy(y)); ctx.lineTo(W - P / 2, sy(y)); ctx.stroke();
      ctx.textAlign = "right"; ctx.fillText(y, P - 6, sy(y) + 4);
    }
    if (xStep) for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      ctx.textAlign = "center"; ctx.fillText(x, sx(x), H - P + 16);
    }
    ctx.strokeStyle = "#495057";
    ctx.beginPath(); ctx.moveTo(P, P / 2); ctx.lineTo(P, H - P); ctx.lineTo(W - P / 2, H - P); ctx.stroke();
    ctx.fillStyle = "#212529"; ctx.textAlign = "center";
    ctx.fillText(xLabel, (P + W) / 2, H - 6);
    ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();
    return { ctx, sx, sy, inv: (px, py) => [
      xMin + ((px - P) / (W - P * 1.5)) * (xMax - xMin),
      yMin + ((H - P - py) / (H - P * 1.5)) * (yMax - yMin),
    ] };
  },

  dot(ctx, x, y, color, r = 6, label) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (label) { ctx.fillStyle = "#212529"; ctx.textAlign = "left"; ctx.fillText(label, x + 9, y - 6); }
  },

  // 1단계: 수직선 위의 점 + 평균선 + 편차 화살표
  dotplot(cv, shops) {
    const ctx = cv.getContext("2d"), W = cv.width, P = 50;
    ctx.clearRect(0, 0, W, cv.height);
    const sx = (x) => P + ((x + 25) / 50) * (W - 2 * P);
    ctx.font = "12px sans-serif";
    shops.forEach((s, row) => {
      const y = 60 + row * 100, m = Stats.mean(s.returns);
      ctx.strokeStyle = "#adb5bd"; ctx.beginPath(); ctx.moveTo(sx(-25), y); ctx.lineTo(sx(25), y); ctx.stroke();
      for (let t = -25; t <= 25; t += 5) { ctx.fillStyle = "#868e96"; ctx.textAlign = "center"; ctx.fillText(t, sx(t), y + 18); }
      ctx.strokeStyle = s.color; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(sx(m), y - 34); ctx.lineTo(sx(m), y + 6); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = s.color; ctx.fillText(`평균 ${m}%`, sx(m), y - 38);
      s.returns.forEach((r, i) => {
        const yy = y - 8 - i * 7;
        ctx.strokeStyle = s.color; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(sx(m), yy); ctx.lineTo(sx(r), yy); ctx.stroke(); ctx.globalAlpha = 1;
        Charts.dot(ctx, sx(r), y, s.color, 6);
      });
      ctx.textAlign = "left"; ctx.fillStyle = "#212529"; ctx.fillText(`${s.emoji} ${s.name}`, 4, y - 40);
    });
  },

  // 2단계: 편차를 한 변으로 하는 정사각형 (편차² 의 시각화)
  squares(cv, shops) {
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.font = "12px sans-serif";
    const k = 4.5; // 1%당 픽셀
    shops.forEach((s, col) => {
      let x = 20 + col * 380;
      ctx.fillStyle = "#212529"; ctx.textAlign = "left";
      ctx.fillText(`${s.emoji} 편차를 한 변으로 하는 정사각형`, x, 16);
      Stats.deviations(s.returns).forEach((d) => {
        const side = Math.abs(d) * k;
        ctx.fillStyle = s.color; ctx.globalAlpha = 0.25; ctx.fillRect(x, 240 - side, side, side);
        ctx.globalAlpha = 1; ctx.strokeStyle = s.color; ctx.strokeRect(x, 240 - side, side, side);
        ctx.fillStyle = "#212529"; ctx.fillText(`${Stats.round(d)}² = ${Stats.round(d * d)}`, x, 254);
        x += Math.max(side, 60) + 12;
      });
    });
  },

  scatter(cv, pts, opt) {
    const g = Charts.axes(cv, opt);
    pts.forEach((p) => Charts.dot(g.ctx, g.sx(p[0]), g.sy(p[1]), p[2] || "#1971c2", 6, p[3]));
    return g;
  },

  bars(cv, values, labels, color) {
    const g = Charts.axes(cv, { xMin: 0, xMax: values.length, yMin: -25, yMax: 25, yStep: 5, yLabel: "수익률(%)" });
    const { ctx, sx, sy } = g;
    ctx.strokeStyle = "#495057"; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(values.length), sy(0)); ctx.stroke();
    values.forEach((v, i) => {
      const x0 = sx(i + 0.2), x1 = sx(i + 0.8);
      ctx.fillStyle = v >= 0 ? color : "#c92a2a";
      ctx.fillRect(x0, Math.min(sy(0), sy(v)), x1 - x0, Math.abs(sy(v) - sy(0)));
      ctx.fillStyle = "#212529"; ctx.textAlign = "center";
      ctx.fillText(`${Stats.round(v)}%`, (x0 + x1) / 2, v >= 0 ? sy(v) - 4 : sy(v) + 14);
      ctx.fillText(labels[i], (x0 + x1) / 2, cv.height - Charts.PAD + 16);
    });
  },

  // 4단계: A 비율에 따른 표준편차 곡선
  riskCurve(cv, a, b, wNow, color) {
    const g = Charts.axes(cv, { xMin: 0, xMax: 100, yMin: 0, yMax: 18, xStep: 25, yStep: 3,
      xLabel: "🍦 A 비율(%)", yLabel: "표준편차(%) = 위험" });
    const { ctx, sx, sy } = g;
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    for (let p = 0; p <= 100; p++) {
      const s = Stats.sd(Stats.mix(a, b, p / 100));
      p ? ctx.lineTo(sx(p), sy(s)) : ctx.moveTo(sx(p), sy(s));
    }
    ctx.stroke(); ctx.lineWidth = 1;
    const sNow = Stats.sd(Stats.mix(a, b, wNow));
    Charts.dot(ctx, sx(wNow * 100), sy(sNow), "#212529", 7, `${Stats.round(sNow)}%`);
  },
};
