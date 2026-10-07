// 통계 계산 함수 (중학교 정의: 분산 = 편차 제곱의 평균)
const Stats = {
  mean: (xs) => xs.reduce((s, x) => s + x, 0) / xs.length,
  deviations(xs) {
    const m = Stats.mean(xs);
    return xs.map((x) => x - m);
  },
  variance(xs) {
    return Stats.mean(Stats.deviations(xs).map((d) => d * d));
  },
  sd: (xs) => Math.sqrt(Stats.variance(xs)),
  // 상관계수 r (중학교 범위 밖 — 상관 미터 표시용으로만 사용)
  corr(xs, ys) {
    const dx = Stats.deviations(xs), dy = Stats.deviations(ys);
    const sxy = dx.reduce((s, d, i) => s + d * dy[i], 0);
    const sxx = dx.reduce((s, d) => s + d * d, 0);
    const syy = dy.reduce((s, d) => s + d * d, 0);
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  },
  // 두 가게에 w : (1-w)로 나눠 투자했을 때 날씨별 수익률
  mix: (a, b, w) => a.map((x, i) => w * x + (1 - w) * b[i]),
  round: (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d,
};
