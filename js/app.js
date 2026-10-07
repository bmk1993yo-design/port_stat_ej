// 화면 전환과 단계별 활동 연결
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const log = {}; // 학생 활동 기록 (저장 버튼으로 내려받기)

/* ---------- 단계 이동 ---------- */
let current = 0;
const renderers = {};
function go(n) {
  current = Math.max(0, Math.min(5, n));
  $$(".step").forEach((s, i) => s.classList.toggle("active", i === current));
  $$("#steps button").forEach((b, i) => b.classList.toggle("active", i === current));
  renderers[current] && renderers[current]();
  window.scrollTo(0, 0);
}
$$("#steps button").forEach((b) => (b.onclick = () => go(+b.dataset.step)));
$("#prev").onclick = () => go(current - 1);
$("#next").onclick = () => go(current + 1);

// 숫자 입력 칸 + 정답 확인 (허용 오차 tol)
function checkInput(input, answer, tol = 0.05) {
  const ok = Math.abs(parseFloat(input.value) - answer) <= tol;
  input.classList.toggle("ok", ok);
  input.classList.toggle("bad", !ok && input.value !== "");
  return ok;
}

/* ---------- 0. 이야기 ---------- */
$("#story-table").innerHTML =
  `<tr><th>날씨</th>${WEATHER.map((w) => `<th>${w}</th>`).join("")}</tr>` +
  ["A", "B"].map((k) => `<tr><td>${SHOPS[k].emoji} ${SHOPS[k].name}</td>${SHOPS[k].returns
    .map((r) => `<td class="${r < 0 ? "neg" : ""}">${r > 0 ? "+" : ""}${r}%</td>`).join("")}</tr>`).join("");

$$("#vote button").forEach((b) => (b.onclick = () => {
  $$("#vote button").forEach((x) => x.classList.toggle("picked", x === b));
  log.vote = b.textContent;
  $("#vote-msg").textContent = "좋아요! 이 선택이 맞는지 수학으로 확인해 봅시다. 수업 끝에 다시 돌아올 거예요.";
}));

/* ---------- 1. 평균과 편차 ---------- */
function devTable(key) {
  const s = SHOPS[key], m = Stats.mean(s.returns), devs = Stats.deviations(s.returns);
  const box = $(`#dev-${key}`);
  box.innerHTML = `<h3>${s.emoji} ${s.name}</h3>
    <p>평균 = (${s.returns.join(" + ")}) ÷ 3 = <input class="num" data-ans="${m}"> %</p>
    <table class="data"><tr><th>날씨</th><th>수익률</th><th>편차</th></tr>
    ${s.returns.map((r, i) => `<tr><td>${WEATHER[i]}</td><td>${r}</td>
      <td><input class="num" data-ans="${devs[i]}"></td></tr>`).join("")}
    <tr><td colspan="2">편차의 합</td><td><input class="num" data-ans="0"></td></tr></table>
    <button class="check">확인</button> <span class="hint"></span>`;
  $(".check", box).onclick = () => {
    const all = $$("input", box).map((i) => checkInput(i, +i.dataset.ans));
    $(".hint", box).textContent = all.every(Boolean) ? "🎉 모두 정답!" : "빨간 칸을 다시 계산해 보세요.";
  };
}
renderers[1] = () => Charts.dotplot($("#dotplot"), [SHOPS.A, SHOPS.B]);
devTable("A"); devTable("B");

/* ---------- 2. 분산과 표준편차 ---------- */
function varTable(key) {
  const s = SHOPS[key], devs = Stats.deviations(s.returns);
  const v = Stats.variance(s.returns), sd = Stats.sd(s.returns);
  const box = $(`#var-${key}`);
  box.innerHTML = `<h3>${s.emoji} ${s.name}</h3>
    <table class="data"><tr><th>편차</th><th>(편차)²</th></tr>
    ${devs.map((d) => `<tr><td>${d}</td><td><input class="num" data-ans="${d * d}"></td></tr>`).join("")}</table>
    <p>분산 = (편차² 의 합) ÷ 3 ≈ <input class="num" data-ans="${v}" data-tol="0.1"> (소수 첫째 자리까지)</p>
    <p>표준편차 = √분산 ≈ <input class="num" data-ans="${sd}" data-tol="0.1"> % <small>(계산기 사용 가능)</small></p>
    <button class="check">확인</button> <span class="hint"></span>`;
  $(".check", box).onclick = () => {
    const all = $$("input", box).map((i) => checkInput(i, +i.dataset.ans, +(i.dataset.tol || 0.05)));
    $(".hint", box).textContent = all.every(Boolean)
      ? `🎉 정답! ${s.name}의 수익은 평균에서 보통 약 ${Stats.round(sd)}%p 정도 벗어나요.`
      : "빨간 칸을 다시 확인해 보세요.";
  };
}
renderers[2] = () => Charts.squares($("#squares"), [SHOPS.A, SHOPS.B]);
varTable("A"); varTable("B");

/* ---------- 3. 산점도와 상관관계 ---------- */
const abOpt = { xMin: -25, xMax: 25, yMin: -25, yMax: 25, xStep: 10, yStep: 10,
  xLabel: "🍦 A 수익률(%)", yLabel: "☂️ B 수익률(%)" };
renderers[3] = () => {
  Charts.scatter($("#scatterAB"),
    SHOPS.A.returns.map((a, i) => [a, SHOPS.B.returns[i], "#2b8a3e", WEATHER[i].split(" ")[0]]), abOpt);
  drawLab();
};
$$("#ab-corr button").forEach((b) => (b.onclick = () => {
  $$("#ab-corr button").forEach((x) => x.classList.toggle("picked", x === b));
  $("#ab-msg").textContent = b.dataset.v === "neg"
    ? "🎉 맞아요! A가 오르면 B는 내려요. 오른쪽 아래로 향하는 '음의 상관관계'입니다."
    : "다시 보세요. A가 커질 때 B는 어떻게 되나요?";
}));

// 산점도 실험실: 클릭으로 점 추가/삭제
let lab = { xLabel: "x", yLabel: "y", points: [] };
function labRange() {
  const xs = lab.points.map((p) => p[0]), ys = lab.points.map((p) => p[1]);
  const pad = (a, b) => { const r = (b - a) * 0.15 || 10; return [a - r, b + r]; };
  if (!xs.length) return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
  const [xMin, xMax] = pad(Math.min(...xs), Math.max(...xs));
  const [yMin, yMax] = pad(Math.min(...ys), Math.max(...ys));
  return { xMin, xMax, yMin, yMax };
}
let labRangeFixed = null, labG = null;
function drawLab() {
  const range = labRangeFixed || labRange();
  labG = Charts.scatter($("#lab"), lab.points, { ...range, xLabel: lab.xLabel, yLabel: lab.yLabel });
  const n = lab.points.length, needle = $("#r-needle");
  if (n < 3) { needle.style.left = "50%"; $("#lab-msg").textContent = "점을 3개 이상 찍어 보세요."; return; }
  const r = Stats.corr(lab.points.map((p) => p[0]), lab.points.map((p) => p[1]));
  needle.style.left = `${(r + 1) * 50}%`;
  const kind = r > 0.3 ? "양의 상관관계 ↗ (x가 커지면 y도 커지는 경향)"
    : r < -0.3 ? "음의 상관관계 ↘ (x가 커지면 y는 작아지는 경향)"
    : "상관관계가 거의 없음 (뚜렷한 경향이 없음)";
  $("#lab-msg").textContent = `점 ${n}개 → ${kind}`;
}
$$("#presets button").forEach((b) => (b.onclick = () => {
  const p = PRESETS[b.dataset.p];
  lab = p ? { ...p, points: p.points.map((x) => [...x]) } : { xLabel: "x", yLabel: "y", points: [] };
  labRangeFixed = p ? null : { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
  labRangeFixed = labRangeFixed || labRange(); // 점을 찍는 동안 축이 흔들리지 않도록 고정
  drawLab();
}));
$("#lab").onclick = (e) => {
  const cv = e.target, rect = cv.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (cv.width / rect.width), py = (e.clientY - rect.top) * (cv.height / rect.height);
  if (!labRangeFixed) labRangeFixed = labRange();
  const hit = lab.points.findIndex((p) => Math.hypot(labG.sx(p[0]) - px, labG.sy(p[1]) - py) < 9);
  if (hit >= 0) lab.points.splice(hit, 1);
  else lab.points.push(labG.inv(px, py).map((v) => Stats.round(v)));
  drawLab();
};

/* ---------- 4. 섞어 담기 ---------- */
function renderMix() {
  const w = +$("#wA").value / 100, P = SHOPS[$("#partner").value], A = SHOPS.A;
  $("#wA-label").textContent = `${Math.round(w * 100)}% / ${P.emoji} ${Math.round((1 - w) * 100)}%`;
  const mix = Stats.mix(A.returns, P.returns, w);
  Charts.bars($("#mixbars"), mix, WEATHER.map((x) => x.split(" ")[0]), "#2b8a3e");
  Charts.riskCurve($("#riskcurve"), A.returns, P.returns, w, P.color);
  const row = (label, xs) => `<tr><td>${label}</td><td>${Stats.round(Stats.mean(xs))}%</td><td>${Stats.round(Stats.sd(xs))}%</td></tr>`;
  $("#mix-stats").innerHTML = `<table class="data"><tr><th></th><th>평균 수익률</th><th>표준편차(위험)</th></tr>
    ${row(`${A.emoji} A만`, A.returns)}${row(`${P.emoji} ${P.name}만`, P.returns)}
    <tr class="hl">${row("🧺 섞은 바구니", mix).slice(4)}</table>`;
}
$("#wA").oninput = renderMix;
$("#partner").onchange = renderMix;
renderers[4] = renderMix;

/* ---------- 5. 정리 ---------- */
$("#quiz").innerHTML = QUIZ.map((item, qi) => `<div class="quiz-item"><p>Q${qi + 1}. ${item.q}</p>
  <div class="choices small">${item.options.map((o, oi) => `<button data-q="${qi}" data-o="${oi}">${o}</button>`).join("")}</div></div>`).join("");
const answers = {};
$$("#quiz button").forEach((b) => (b.onclick = () => {
  const q = +b.dataset.q, ok = +b.dataset.o === QUIZ[q].answer;
  $$(`#quiz button[data-q="${q}"]`).forEach((x) => x.classList.remove("right", "wrong"));
  b.classList.add(ok ? "right" : "wrong");
  answers[q] = ok;
  const score = Object.values(answers).filter(Boolean).length;
  $("#quiz-score").textContent = `맞힌 문제: ${score} / ${QUIZ.length}`;
  log.quiz = `${score} / ${QUIZ.length}`;
}));

$("#save-btn").onclick = () => {
  const text = [
    `[처음 선택] ${log.vote || "-"}`, `[이유] ${$("#vote-reason").value}`,
    `[섞어 담기 미션] ${$("#mission").value}`, `[퀴즈] ${log.quiz || "-"}`,
    `[출구 카드] ${$("#exit-card").value}`,
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = "산포도_상관관계_활동기록.txt";
  a.click();
};

go(0);
