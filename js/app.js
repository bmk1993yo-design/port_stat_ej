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
// 창 크기가 바뀌면(전체 화면 전환 등) 현재 단계의 그래프를 새 크기로 다시 그린다
let resizeTimer;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderers[current] && renderers[current](), 100);
});
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
// 학생은 분산만 계산해 적고(소수 첫째 자리까지 반올림한 값이 정답), 표준편차는 그 분산의 제곱근을 앱이 바로 보여 준다
const CALC = Object.fromEntries(RISK_KEYS.map((k) => [k, R(Stats.variance(SHOPS[k].returns))]));
$("#all-table").innerHTML = shopTable(entries(RISK_KEYS), "<th>분산</th><th>표준편차<br><small>(자동)</small></th>", (k, s) =>
  `<td class="calc"><input class="calc-in" type="text" inputmode="decimal" autocomplete="off"
    data-k="${k}" aria-label="${s.name} 분산"><span class="calc-mark" aria-hidden="true"></span></td>
   <td class="calc-auto"><output data-k="${k}" aria-label="${s.name} 표준편차(자동 계산)">—</output></td>`,
  WEATHER_SHORT);

const calcRaw = (k) => $(`.calc-in[data-k="${k}"]`).value.trim().replace(",", ".");
const isNum = (raw) => /^\d+(\.\d+)?$/.test(raw);
// 소수 첫째 자리까지 쓴 분산이 정답과 같은지
const calcOk = (k, raw) => /^\d+(\.\d)?$/.test(raw) && Math.abs(parseFloat(raw) - CALC[k]) < 1e-9;
// 학생이 쓴 분산으로 구한 표준편차(소수 첫째 자리), 숫자가 아니면 null
const autoSd = (raw) => (isNum(raw) ? R(Math.sqrt(parseFloat(raw))) : null);

$$(".calc-in").forEach((i) => {
  i.oninput = () => {
    const sd = autoSd(calcRaw(i.dataset.k));
    $(`.calc-auto output[data-k="${i.dataset.k}"]`).textContent = sd === null ? "—" : sd.toFixed(1);
  };
  i.onkeydown = (e) => { if (e.key === "Enter" && !$("#rank-check").disabled) $("#rank-check").click(); };
});

// 채점: 분산 칸마다 ✓/✗를 표시하고 빈칸 수와 맞힌 수를 돌려준다
function gradeCalc() {
  let blank = 0, right = 0;
  $$(".calc-in").forEach((i) => {
    const raw = calcRaw(i.dataset.k), mark = i.nextElementSibling;
    if (!raw) { blank++; i.classList.remove("ok", "bad"); mark.textContent = ""; return; }
    const ok = calcOk(i.dataset.k, raw);
    right += ok;
    i.classList.toggle("ok", ok); i.classList.toggle("bad", !ok);
    mark.textContent = ok ? "✓" : "✗"; mark.className = `calc-mark ${ok ? "ok" : "no"}`;
  });
  return { blank, right, total: $$(".calc-in").length };
}
let ranking = [], revealed = false;
const RISK_ORDER = [...RISK_KEYS].sort((a, b) => Stats.sd(SHOPS[b].returns) - Stats.sd(SHOPS[a].returns));
renderers[1] = () => (revealed ? Charts.sdBars($("#sd-bars"), RISK_ORDER) : Charts.prep($("#sd-bars")));
function renderRank() {
  $("#rank-pick").innerHTML = RISK_KEYS.map((k) =>
    `<button data-k="${k}" ${ranking.includes(k) ? "disabled" : ""}>${SHOPS[k].emoji} ${SHOPS[k].name}</button>`).join("");
  $$("#rank-pick button").forEach((b) => (b.onclick = () => { ranking.push(b.dataset.k); renderRank(); }));
  $("#rank-list").innerHTML = ranking.map((k, i) => `<li><b>${i + 1}위</b>${SHOPS[k].emoji} ${SHOPS[k].name}</li>`).join("");
  $("#rank-check").disabled = ranking.length !== RISK_KEYS.length;
  $("#rank-pick").hidden = ranking.length === RISK_KEYS.length; // 다 고르면 버튼 줄을 접어 공간 확보
}
$("#rank-reset").onclick = () => { ranking = []; renderRank(); };
$("#rank-check").onclick = () => {
  const c = gradeCalc();
  if (c.blank) {
    return say($("#rank-msg"), `표의 분산 칸을 모두 채워야 확인할 수 있어요. (빈칸 ${c.blank}개)`, false);
  }
  const hits = ranking.filter((k, i) => k === RISK_ORDER[i]).length;
  revealed = true;
  $("#sd-placeholder").hidden = true;
  $("#rank-reflect").hidden = false;
  renderers[1]();
  log.rank = `${ranking.map((k) => SHOPS[k].name).join(" > ")} (${hits}/4 일치)`;
  log.calc = `${c.right}/${c.total} 정답 — ` + RISK_KEYS.map((k) =>
    `${SHOPS[k].name} 분산 ${calcRaw(k)}`).join(" / ");
  const rankText = hits === 4 ? "🎉 순위 4곳 모두 맞혔어요!" : `순위 ${hits}곳 맞혔어요.`;
  const calcText = c.right === c.total ? "계산도 모두 정답! 흩어짐이 클수록 표준편차가 커요."
    : `분산 ${c.right}/${c.total}칸 정답 — ✗ 칸을 고쳐 다시 확인하세요.`;
  say($("#rank-msg"), `${rankText} ${calcText}`, hits === 4 && c.right === c.total);
};
renderRank();

/* ---------- 2. 같은 평균, 다른 위험 ---------- */
let missionIdx = 0;
const missionDone = new Set(), missionValues = {}; // 성공했을 때 학생이 만든 수익률
$("#missions").innerHTML = MISSIONS.map((m, i) =>
  `<label><input type="radio" name="mission" value="${i}" ${i ? "" : "checked"}> 미션 ${i + 1}. ${m.text}</label>`).join("");
$$("#missions input").forEach((r) => (r.onchange = () => { missionIdx = +r.value; checkMission(); }));
$("#my-inputs").innerHTML = WEATHER.map((w, i) =>
  `<label>${w}에는<span class="unit-input"><input class="num" type="number" step="1" value="${[10, 5, 0][i]}"
    aria-label="${w}에 우리 가게 수익률(%)">%</span></label>`).join("");
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
    missionValues[missionIdx] = { vals, sd };
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
const answers = {}, quizChoice = {}; // 맞았는지 / 마지막으로 고른 보기
$$("#quiz button").forEach((b) => (b.onclick = () => {
  const q = +b.dataset.q, ok = +b.dataset.o === APPLY.questions[q].answer;
  $$(`#quiz button[data-q="${q}"]`).forEach((x) => x.classList.remove("right", "wrong"));
  b.classList.add(ok ? "right" : "wrong");
  answers[q] = ok;
  quizChoice[q] = +b.dataset.o;
  const score = Object.values(answers).filter(Boolean).length;
  log.quiz = `${score} / ${APPLY.questions.length}`;
  say($("#quiz-score"), `맞힌 문제: ${log.quiz}`, score === APPLY.questions.length ? true : undefined);
}));

/* ---------- 활동 기록: 제출(구글 스프레드시트) / 내려받기 ---------- */
// 문항마다 질문·의미·평가 요소·정답(기준)과 학생 응답을 함께 모아, 교사가 결과만 보고도 알아볼 수 있게 한다
const NONE = "(응답 없음)";
const val = (sel) => $(sel).value.trim() || NONE;

// 문항 목록: [{ no, title, question, meaning, assess, key, response }] 와 한 줄 요약
function collectItems() {
  const items = [];
  const add = (meta, lines) => items.push({ ...meta, response: lines.join("\n") });

  add(REPORT.vote, [`선택: ${log.vote || NONE}`, `근거: ${val("#vote-reason")}`]);

  const hits = ranking.length === RISK_KEYS.length ? ranking.filter((k, i) => k === RISK_ORDER[i]).length : null;
  add(REPORT.rank, ranking.length
    ? [`내 순위: ${ranking.map((k, i) => `${i + 1}위 ${SHOPS[k].name}`).join(" > ")}`,
       revealed ? `결과: ${hits}/4곳 일치` : "결과: 아직 확인하지 않음"]
    : [NONE]);

  const c = { right: 0, total: RISK_KEYS.length };
  const calcLines = RISK_KEYS.map((k) => {
    const v = calcRaw(k), name = `${SHOPS[k].emoji} ${SHOPS[k].name}`;
    if (!v) return `${name}: 분산 (빈칸)`;
    const ok = calcOk(k, v), sd = autoSd(v);
    c.right += ok;
    return `${name}: 분산 ${v} ${ok ? "✓" : `✗(정답 ${CALC[k].toFixed(1)})`} → 표준편차(자동) ${sd === null ? "-" : sd.toFixed(1)}`;
  });
  add(REPORT.calc, [...calcLines, `결과: 분산 ${c.right}/${c.total}칸 정답`]);
  add(REPORT.reflect1, [val("#reflect-1")]);

  add(REPORT.missions, MISSIONS.map((m, i) => missionValues[i]
    ? `미션 ${i + 1} ✓ 성공 — 무더운 해 ${pct(missionValues[i].vals[0])}, 보통인 해 ${pct(missionValues[i].vals[1])}, 비가 많은 해 ${pct(missionValues[i].vals[2])} (표준편차 ${R(missionValues[i].sd)}%)`
    : `미션 ${i + 1} 미완료 (${m.text})`).concat(`결과: ${missionDone.size}/${MISSIONS.length} 성공`));
  add(REPORT.reflect2, [val("#reflect-2")]);

  add(REPORT.corr, $$("#partner-table select").map((s) => {
    const k = s.dataset.k, mine = s.value ? CORR_LABEL[s.value] : "(선택 안 함)";
    return `${SHOPS[k].emoji} ${SHOPS[k].name}: ${mine}${s.value ? (s.value === corrType(k) ? " ✓" : ` ✗(정답 ${CORR_LABEL[corrType(k)]})`) : ""}`;
  }).concat(corrChecked ? [`결과: ${log.corr}`] : ["결과: 아직 확인하지 않음"]));
  add(REPORT.best, [`예측: ${log.best || NONE}`, `이유: ${val("#reflect-3")}`]);

  add(REPORT.basket, records.length
    ? records.map((r) => `🍦 ${r.wA}% + ${SHOPS[r.k].name} ${100 - r.wA}% → 평균 ${R(r.mean)}%, 표준편차 ${R(r.sd)}% ${r.ok ? "(조건 만족)" : "(평균 3% 미만)"}`)
        .concat(`내가 찾은 최고의 바구니: ${log.best4 || "-"}`)
    : ["기록한 바구니 없음"]);
  add(REPORT.conclusion, [val("#mission")]);

  APPLY.questions.forEach((item, qi) => {
    const pick = quizChoice[qi];
    add({ no: `5-${"①②③④"[qi]}`, title: "적용 문제", question: item.q, meaning: item.meaning, assess: item.assess,
      key: item.options[item.answer] },
    [pick === undefined ? NONE : `선택: ${item.options[pick]} ${pick === item.answer ? "✓" : "✗"}`]);
  });
  add(REPORT.limit, [val("#limit")]);
  add(REPORT.exit, [val("#exit-card")]);

  const summary = `위험 순위 예측 ${hits === null || !revealed ? "-" : `${hits}/4`} · 분산 계산 ${c.right}/${c.total}`
    + ` · 미션 ${missionDone.size}/${MISSIONS.length} · 상관관계 예측 ${corrChecked ? log.corr : "-"} · 적용 문제 ${log.quiz || "-"}`;
  return { items, summary };
}

function buildReport(student) {
  const { items, summary } = collectItems();
  const line = "────────────────────────────────────────";
  return [
    "포트폴리오 응용 활동 기록 — 계란을 한 바구니에 담지 마라 (산포도·상관관계 응용)",
    `저장한 때: ${new Date().toLocaleString("ko-KR")}`,
    `학번: ${student.id || "______"}   이름: ${student.name || "__________"}`,
    "",
    `요약: ${summary}`,
    "",
    ...items.map((it) => [
      line, `[${it.no}] ${it.title}`,
      `  ■ 질문: ${it.question}`, `  ■ 의미: ${it.meaning}`, `  ■ 평가 요소: ${it.assess}`, `  ■ 정답·기준: ${it.key}`,
      "  ▶ 내 응답", ...it.response.split("\n").map((l) => `     ${l}`),
    ].join("\n")),
    line,
  ].join("\n");
}

function readStudent() {
  const idEl = $("#student-id"), nameEl = $("#student-name");
  const student = { id: idEl.value.trim(), name: nameEl.value.trim() };
  idEl.classList.toggle("bad", !student.id);
  nameEl.classList.toggle("bad", !student.name);
  return student;
}

function downloadReport(student) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buildReport(student)], { type: "text/plain;charset=utf-8" }));
  a.download = `포트폴리오_응용_활동기록_${student.id || "학번"}_${student.name || "이름"}.txt`;
  a.click();
}

$("#submit-btn").onclick = async () => {
  const student = readStudent(), msg = $("#submit-msg"), btn = $("#submit-btn");
  if (!student.id || !student.name) return say(msg, "학번과 이름을 모두 써 주세요.", false);
  const codeEl = $("#class-code"), classCode = codeEl.value.trim();
  codeEl.classList.toggle("bad", !classCode && !!SUBMIT_URL);
  if (!SUBMIT_URL) {
    $("#save-btn").hidden = false;
    return say(msg, "제출 주소가 아직 없어요. 파일로 내려받아 선생님께 내 주세요.", false);
  }
  if (!classCode) return say(msg, "칠판에 적힌 수업 코드를 써 주세요.", false);
  const { items, summary } = collectItems();
  btn.disabled = true;
  say(msg, "제출하는 중…");
  try {
    // text/plain으로 보내야 브라우저의 사전 확인(CORS preflight) 없이 Apps Script에 바로 전달된다
    const res = await fetch(SUBMIT_URL, {
      method: "POST",
      body: JSON.stringify({ classCode, studentId: student.id, name: student.name, summary, items }),
    });
    const out = await res.json();
    if (out.error === "code") {
      codeEl.classList.add("bad");
      return say(msg, "✗ 수업 코드가 틀렸어요. 칠판을 다시 확인해 주세요.", false);
    }
    if (!out.ok) throw new Error(out.error || "제출 실패");
    codeEl.classList.remove("bad");
    say(msg, `✓ 제출했어요! (${new Date().toLocaleTimeString("ko-KR")}) 고쳐서 다시 내면 새로 추가돼요.`, true);
  } catch (e) {
    $("#save-btn").hidden = false;
    say(msg, "✗ 제출하지 못했어요. 다시 눌러 보거나, 파일로 내려받아 선생님께 내 주세요.", false);
  } finally {
    btn.disabled = false;
  }
};

$("#save-btn").onclick = () => downloadReport(readStudent());

go(0);
