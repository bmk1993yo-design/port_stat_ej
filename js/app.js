// 화면 전환과 단계별 활동 연결
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const R = Stats.round;
const pct = (x) => `${x > 0 ? "+" : ""}${R(x)}%`;
const log = {}; // 학생 활동 기록 (내려받기용)

function say(el, text, good) {
  el.textContent = text;
  el.classList.toggle("good", good === true);
  el.classList.toggle("bad", good === false);
}

/* ---------- 단계 이동 ---------- */
const STEP_COUNT = 6;
let current = 0;
const renderers = {};
function go(n) {
  current = Math.max(0, Math.min(STEP_COUNT - 1, n));
  $$(".step").forEach((s, i) => s.classList.toggle("active", i === current));
  $$("#steps button").forEach((b, i) => b.classList.toggle("active", i === current));
  $("#step-count").textContent = `${current + 1} / ${STEP_COUNT}`;
  $("#prev").disabled = current === 0;
  $("#next").disabled = current === STEP_COUNT - 1;
  renderers[current] && renderers[current]();
  $("main").scrollTop = 0;
}
$$("#steps button").forEach((b) => (b.onclick = () => go(+b.dataset.step)));
$("#prev").onclick = () => go(current - 1);
$("#next").onclick = () => go(current + 1);

// 가게 수익률 표
function shopTable(shops, extraHead = "", extraCell = () => "", heads = WEATHER) {
  return `<tr><th>가게</th>${heads.map((w) => `<th>${w}</th>`).join("")}${extraHead}</tr>` +
    shops.map(([k, s]) => `<tr><td>${s.emoji} ${s.name}</td>${s.returns
      .map((r) => `<td class="${r < 0 ? "neg" : ""}">${pct(r)}</td>`).join("")}${extraCell(k, s)}</tr>`).join("");
}
const entries = (keys) => keys.map((k) => [k, SHOPS[k]]);

/* ---------- 0. 투자 고민 ---------- */
$("#story-table").innerHTML = shopTable(entries(["A", "B"]));
$$("#vote button").forEach((b) => (b.onclick = () => {
  $$("#vote button").forEach((x) => x.classList.toggle("picked", x === b));
  log.vote = b.textContent;
  say($("#vote-msg"), "좋아요. 이 판단이 맞는지 오늘 배운 개념으로 검증해 봅시다. 마지막에 다시 돌아올 거예요.");
}));

/* ---------- 1. 위험 진단 ---------- */
const RISK_KEYS = ["A", "B", "C", "D"];
$("#all-table").innerHTML = shopTable(entries(RISK_KEYS));
let ranking = [];
function renderRank() {
  $("#rank-pick").innerHTML = RISK_KEYS.map((k) =>
    `<button data-k="${k}" ${ranking.includes(k) ? "disabled" : ""}>${SHOPS[k].emoji} ${SHOPS[k].name}</button>`).join("");
  $$("#rank-pick button").forEach((b) => (b.onclick = () => { ranking.push(b.dataset.k); renderRank(); }));
  $("#rank-list").innerHTML = ranking.map((k, i) => `<li><b>${i + 1}위</b>${SHOPS[k].emoji} ${SHOPS[k].name}</li>`).join("");
  $("#rank-check").disabled = ranking.length !== RISK_KEYS.length;
}
$("#rank-reset").onclick = () => { ranking = []; renderRank(); };
$("#rank-check").onclick = () => {
  const truth = [...RISK_KEYS].sort((a, b) => Stats.sd(SHOPS[b].returns) - Stats.sd(SHOPS[a].returns));
  const hits = ranking.filter((k, i) => k === truth[i]).length;
  $("#sd-placeholder").hidden = true;
  $("#rank-reflect").hidden = false;
  Charts.sdBars($("#sd-bars"), truth);
  log.rank = `${ranking.map((k) => SHOPS[k].name).join(" > ")} (${hits}/4 일치)`;
  say($("#rank-msg"), hits === 4
    ? "🎉 4곳 모두 맞혔어요! 수익률이 평균에서 멀리 흩어진 가게일수록 표준편차가 커요."
    : `${hits}곳 맞혔어요. 순위가 다른 가게는 수익률이 평균에서 얼마나 떨어져 있는지 다시 비교해 보세요.`, hits === 4);
};
renderRank();

/* ---------- 2. 같은 평균, 다른 위험 ---------- */
let missionIdx = 0;
const missionDone = new Set();
$("#missions").innerHTML = MISSIONS.map((m, i) =>
  `<label><input type="radio" name="mission" value="${i}" ${i ? "" : "checked"}> 미션 ${i + 1}. ${m.text}</label>`).join("");
$$("#missions input").forEach((r) => (r.onchange = () => { missionIdx = +r.value; checkMission(); }));
$("#my-inputs").innerHTML = WEATHER.map((w, i) =>
  `<label>${w}<input class="num" type="number" step="1" value="${[10, 5, 0][i]}" aria-label="${w} 수익률(%)"></label>`).join("") +
  `<label>&nbsp;<span class="note" style="display:block;margin-top:10px">단위: %</span></label>`;
$$("#my-inputs input").forEach((inp) => (inp.oninput = checkMission));

function checkMission() {
  const vals = $$("#my-inputs input").map((i) => parseFloat(i.value));
  if (vals.some(isNaN)) return say($("#mission-msg"), "세 칸을 모두 숫자로 채워 주세요.", false);
  const m = Stats.mean(vals), sd = Stats.sd(vals), goal = MISSIONS[missionIdx];
  Charts.numberLine($("#my-line"), vals, MIX_COLOR);
  if (Math.abs(m - goal.mean) > 0.05) {
    return say($("#mission-msg"), `평균이 ${R(m)}%예요. 먼저 평균을 ${goal.mean}%로 맞춰 보세요.`, false);
  }
  if (sd >= goal.sdMin && sd <= goal.sdMax) {
    missionDone.add(missionIdx);
    $$("#missions label")[missionIdx].classList.add("done");
    log.missions = `${missionDone.size}/${MISSIONS.length} 성공`;
    return say($("#mission-msg"), `🎉 미션 ${missionIdx + 1} 성공! (표준편차 ${R(sd)}%)`, true);
  }
  say($("#mission-msg"), `평균은 맞았어요. 표준편차가 ${R(sd)}%예요. 수익률을 평균에서 ${sd < goal.sdMin ? "더 멀리" : "더 가까이"} 옮겨 보세요.`, false);
}
renderers[2] = checkMission;

/* ---------- 3. 짝꿍 찾기 ---------- */
const CORR_LABEL = { pos: "양의 상관", neg: "음의 상관", none: "상관없음" };
const corrType = (k) => {
  const r = Stats.corr(SHOPS.A.returns, SHOPS[k].returns);
  return r > 0.3 ? "pos" : r < -0.3 ? "neg" : "none";
};
$("#partner-table").innerHTML = shopTable(entries(PARTNERS), "<th>내 예측</th><th></th>", (k) =>
  `<td><select data-k="${k}" aria-label="${SHOPS[k].name} 상관관계 예측"><option value="">선택</option>${
    Object.entries(CORR_LABEL).map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></td><td class="mark" data-k="${k}"></td>`, WEATHER_SHORT);
$("#partner-table").insertAdjacentHTML("afterbegin", `<caption class="note" style="caption-side:top;text-align:left">기준: 🍦 아이스크림 가게 ${SHOPS.A.returns.map(pct).join(" / ")}</caption>`);

let scatterPartner = PARTNERS[0], corrChecked = false;
$("#corr-check").onclick = () => {
  const picks = $$("#partner-table select");
  if (picks.some((s) => !s.value)) return say($("#corr-msg"), "세 가게의 예측을 모두 골라 주세요.", false);
  let hits = 0;
  picks.forEach((s) => {
    const ok = s.value === corrType(s.dataset.k);
    hits += ok;
    $(`.mark[data-k="${s.dataset.k}"]`).innerHTML = ok ? `<span class="ok">✓</span>` : `<span class="no">✗</span><br><small>${CORR_LABEL[corrType(s.dataset.k)]}</small>`;
  });
  corrChecked = true;
  log.corr = `${hits}/3 일치`;
  $("#scatter-placeholder").hidden = true;
  drawPair();
  say($("#corr-msg"), hits === 3 ? "🎉 모두 맞혔어요! 오른쪽에서 산점도를 하나씩 확인해 보세요." : `${hits}개 맞혔어요. 오른쪽 산점도로 이유를 찾아보세요.`, hits === 3);
};
$("#scatter-tabs").innerHTML = PARTNERS.map((k) => `<button data-k="${k}">${SHOPS[k].emoji} ${SHOPS[k].name}</button>`).join("");
$$("#scatter-tabs button").forEach((b) => (b.onclick = () => { scatterPartner = b.dataset.k; drawPair(); }));
function drawPair() {
  const P = SHOPS[scatterPartner];
  $$("#scatter-tabs button").forEach((b) => {
    const on = b.dataset.k === scatterPartner;
    b.classList.toggle("picked", on);
    b.style.background = on ? SHOPS[b.dataset.k].color : "";
  });
  if (!corrChecked) { Charts.axes($("#pair-scatter"), { xMin: -25, xMax: 25, yMin: -25, yMax: 25, xStep: 10, yStep: 10 }); return; }
  Charts.scatter($("#pair-scatter"),
    SHOPS.A.returns.map((a, i) => [a, P.returns[i], P.color, WEATHER_SHORT[i]]),
    { xMin: -25, xMax: 25, yMin: -25, yMax: 25, xStep: 10, yStep: 10,
      xLabel: `🍦 아이스크림 가게 수익률(%)`, yLabel: `${P.emoji} ${P.name} 수익률(%)` });
}
renderers[3] = drawPair;

$("#best-pick").innerHTML = PARTNERS.map((k) => `<button data-k="${k}">${SHOPS[k].emoji} ${SHOPS[k].name}</button>`).join("");
$$("#best-pick button").forEach((b) => (b.onclick = () => {
  $$("#best-pick button").forEach((x) => x.classList.toggle("picked", x === b));
  log.best = SHOPS[b.dataset.k].name;
}));

/* ---------- 4. 바구니 설계 챌린지 ---------- */
const records = [];
$("#partner").innerHTML = PARTNERS.map((k) => `<option value="${k}">${SHOPS[k].emoji} ${SHOPS[k].name}</option>`).join("");
function basket() {
  const w = +$("#wA").value / 100, k = $("#partner").value, mix = Stats.mix(SHOPS.A.returns, SHOPS[k].returns, w);
  return { w, k, mix, mean: Stats.mean(mix), sd: Stats.sd(mix) };
}
function renderMix() {
  const b = basket(), P = SHOPS[b.k], ok = b.mean >= CHALLENGE.minMean - 1e-9;
  $("#wA-label").textContent = `${Math.round(b.w * 100)}%  ·  ${P.emoji} ${Math.round((1 - b.w) * 100)}%`;
  $("#mix-stats").innerHTML = `<div class="stat-line">
    <span>평균 <b>${R(b.mean)}%</b></span><span>표준편차 <b>${R(b.sd)}%</b></span>
    <span class="${ok ? "ok" : "no"}">${ok ? "✓ 조건 만족" : "✗ 평균 3% 미만"}</span></div>`;
  Charts.bars($("#mix-bars"), b.mix);
  Charts.riskReturn($("#risk-return"), SHOPS.A.returns, P.returns, b.w, P.color, records.filter((r) => r.k === b.k));
}
function renderRecords() {
  const valid = records.filter((r) => r.ok);
  const best = valid.length ? valid.reduce((a, b) => (b.sd < a.sd ? b : a)) : null;
  $("#records").innerHTML = `<tr><th>바구니</th><th>평균</th><th>표준편차</th><th>조건</th></tr>` +
    records.map((r) => `<tr class="${r === best ? "best" : ""}"><td>🍦 ${r.wA}% + ${SHOPS[r.k].emoji} ${100 - r.wA}%${r === best ? " 🏆" : ""}</td>
      <td>${R(r.mean)}%</td><td>${R(r.sd)}%</td><td>${r.ok ? "✓" : "✗"}</td></tr>`).join("");
  log.best4 = best ? `🍦 ${best.wA}% + ${SHOPS[best.k].name} ${100 - best.wA}% (평균 ${R(best.mean)}%, 표준편차 ${R(best.sd)}%)` : "-";
}
$("#record-btn").onclick = () => {
  const b = basket(), wA = Math.round(b.w * 100);
  if (records.some((r) => r.k === b.k && r.wA === wA)) return;
  records.push({ k: b.k, wA, mean: b.mean, sd: b.sd, ok: b.mean >= CHALLENGE.minMean - 1e-9 });
  renderRecords(); renderMix();
};
$("#wA").oninput = renderMix;
$("#partner").onchange = renderMix;
renderers[4] = renderMix;
renderRecords();

/* ---------- 5. 적용과 한계 ---------- */
$("#apply-table").innerHTML = shopTable([["A", SHOPS.A], ["X", APPLY.shop]]);
$("#quiz").innerHTML = APPLY.questions.map((item, qi) => `<div class="quiz-item"><p>Q${qi + 1}. ${item.q}</p>
  <div class="choices">${item.options.map((o, oi) => `<button data-q="${qi}" data-o="${oi}">${o}</button>`).join("")}</div></div>`).join("");
const answers = {};
$$("#quiz button").forEach((b) => (b.onclick = () => {
  const q = +b.dataset.q, ok = +b.dataset.o === APPLY.questions[q].answer;
  $$(`#quiz button[data-q="${q}"]`).forEach((x) => x.classList.remove("right", "wrong"));
  b.classList.add(ok ? "right" : "wrong");
  answers[q] = ok;
  const score = Object.values(answers).filter(Boolean).length;
  log.quiz = `${score} / ${APPLY.questions.length}`;
  say($("#quiz-score"), `맞힌 문제: ${log.quiz}`, score === APPLY.questions.length ? true : undefined);
}));

$("#save-btn").onclick = () => {
  const text = [
    `[0. 첫 판단] ${log.vote || "-"}`, `    근거: ${$("#vote-reason").value}`,
    `[1. 위험 순위 예측] ${log.rank || "-"}`, `    생각 넓히기: ${$("#reflect-1").value}`,
    `[2. 나만의 가게 미션] ${log.missions || "0/3 성공"}`, `    규칙 찾기: ${$("#reflect-2").value}`,
    `[3. 상관관계 예측] ${log.corr || "-"}`, `    최고의 짝꿍 예측: ${log.best || "-"} / 이유: ${$("#reflect-3").value}`,
    `[4. 최고의 바구니] ${log.best4 || "-"}`, `    모둠 결론: ${$("#mission").value}`,
    `[5. 적용 문제] ${log.quiz || "-"}`, `    한계 토론: ${$("#limit").value}`,
    `[출구 카드] ${$("#exit-card").value}`,
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = "포트폴리오_응용_활동기록.txt";
  a.click();
};

go(0);
