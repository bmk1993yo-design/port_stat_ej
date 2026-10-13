/**
 * 포트폴리오 응용 활동 기록 수신용 Google Apps Script
 *
 * 이 파일 내용을 구글 스프레드시트의 [확장 프로그램 → Apps Script]에 붙여 넣고
 * 웹 앱으로 배포한다. 자세한 순서는 docs/google-sheets-setup.md 참고.
 *
 * 시트 구성
 *  - "제출"     : 학생 1명의 제출 1번 = 1행 (제출 시각, 학번, 이름, 요약, 문항별 응답…)
 *  - "문항설명" : 각 열(문항)이 무엇을 묻고 무엇을 평가하는지 (처음 제출될 때 자동으로 만들어짐)
 */

// ★ 수업 코드: Apps Script 편집기에서만 정해 넣으세요(예: "봄비42"). 저장소의 이 파일에는 적지 마세요.
//   학생은 수업 시간에 칠판으로 안내받은 코드를 제출할 때 함께 입력합니다. 비어 있으면 모든 제출을 거절합니다.
//   코드를 바꾼 뒤에는 [배포 → 배포 관리 → ✏️ → 버전: 새 버전 → 배포]를 해야 적용됩니다.
const CLASS_CODE = "";

const SUBMIT_SHEET = "제출";
const INFO_SHEET = "문항설명";
const MAX_CELL = 5000; // 셀 하나에 들어갈 최대 글자 수

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // 여러 학생이 동시에 제출해도 줄이 섞이지 않도록
  try {
    const data = JSON.parse(e.postData.contents);
    const norm = (v) => String(v == null ? "" : v).trim().toLowerCase();
    if (!CLASS_CODE || norm(data.classCode) !== norm(CLASS_CODE)) {
      return json({ ok: false, error: "code" });
    }
    const id = clean(data.studentId, 10);
    const name = clean(data.name, 20);
    if (!id || !name || !Array.isArray(data.items) || data.items.length === 0 || data.items.length > 50) {
      return json({ ok: false, error: "잘못된 제출" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SUBMIT_SHEET) || ss.insertSheet(SUBMIT_SHEET);
    if (sheet.getLastRow() === 0) {
      const header = ["제출 시각", "학번", "이름", "요약"].concat(data.items.map((it) => `[${clean(it.no, 10)}] ${clean(it.title, 40)}`));
      sheet.appendRow(header);
      sheet.setFrozenRows(1);
      sheet.setFrozenColumns(3);
      sheet.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#ebfbee").setWrap(true);
    }
    sheet.appendRow([new Date(), safe(id), safe(name), safe(clean(data.summary, 500))]
      .concat(data.items.map((it) => safe(clean(it.response, MAX_CELL)))));

    if (!ss.getSheetByName(INFO_SHEET)) {
      const info = ss.insertSheet(INFO_SHEET);
      const rows = [["번호", "문항", "질문", "의미", "평가 요소", "정답·기준"]].concat(data.items.map((it) =>
        [it.no, it.title, it.question, it.meaning, it.assess, it.key].map((v) => safe(clean(v, MAX_CELL)))));
      info.getRange(1, 1, rows.length, rows[0].length).setValues(rows).setWrap(true).setVerticalAlignment("top");
      info.getRange(1, 1, 1, rows[0].length).setFontWeight("bold").setBackground("#ebfbee");
      info.setFrozenRows(1);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 주소가 살아 있는지 브라우저로 열어 확인할 때
function doGet() {
  return json({ ok: true, message: "활동 기록 수신 준비 완료" });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max);
}

// =, +, -, @ 로 시작하는 글은 시트가 수식으로 실행하지 않도록 앞에 ' 를 붙인다
function safe(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
