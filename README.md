# 계란을 한 바구니에 담지 마라 🥚

**산포도(분산·표준편차)** 와 **산점도(상관관계)** 를 이미 배운 중학생이, 포트폴리오 이론을 예시로 배운 내용을 응용해 보는 수업용 웹앱입니다.

- 학생 접속 링크: https://bmk1993yo-design.github.io/port_stat_ej/
- 수업 설계(차시 흐름·정답·발문·루브릭): [docs/lesson-plan.md](docs/lesson-plan.md)
- Claude Code 작업 기준(가로형 노트북 디자인 원칙): [CLAUDE.md](CLAUDE.md)

## 폴더 구조

```
index.html          앱 본체 (단계 0~5)
css/style.css       스타일
js/data.js          가게 수익률·산점도 예시·퀴즈 ← 수업 내용은 여기서 수정
js/stats.js         통계 계산
js/charts.js        canvas 차트
js/app.js           화면 전환·채점·기록 저장
docs/lesson-plan.md 교사용 수업 설계
```

빌드 과정이나 설치할 패키지가 없습니다. `index.html`을 브라우저로 열면 바로 실행됩니다(인터넷 불필요).

## 처음 설정 (기기마다 한 번)

### 공통
1. [Git](https://git-scm.com/), [VS Code](https://code.visualstudio.com/), VS Code의 Claude Code 확장을 설치합니다.
2. 저장소를 내려받습니다.
   ```bash
   git clone https://github.com/bmk1993yo-design/port_stat_ej.git
   cd port_stat_ej
   ```
3. 커밋 작성자를 GitHub 비공개 이메일로 설정합니다(이 저장소에만 적용).
   ```bash
   git config user.name "bmk1993yo-design"
   git config user.email "254077981+bmk1993yo-design@users.noreply.github.com"
   ```

### Windows
```powershell
winget install Git.Git GitHub.cli OpenJS.NodeJS.LTS
gh auth login
```

### macOS
```bash
xcode-select --install          # Git 포함
brew install gh node            # Homebrew가 없으면 https://brew.sh 먼저
gh auth login
```

Node.js는 앱 실행에는 필요 없고, Claude Code의 MCP(Playwright·shadcn)를 쓸 때만 필요합니다.

### Claude Code MCP·플러그인 (선택)
MCP는 저장소가 아니라 **기기별 사용자 설정**에 저장되므로 각 기기에서 따로 등록합니다. 터미널에서:

```bash
claude mcp add playwright --scope user -- npx -y @playwright/mcp@latest
claude mcp add shadcn --scope user -- npx -y shadcn@latest mcp
claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill --scope user
```

- Windows에서 `claude` 명령이 없으면 VS Code 확장 폴더의 `claude.exe`를 쓰거나 Claude Code 대화창에 "MCP 설치해줘"라고 요청하세요.
- Windows에서 MCP가 `Connection closed`로 실패하면 VS Code를 완전히 종료 후 다시 실행하세요(Node 설치 전에 켜진 VS Code는 `npx` 경로를 모릅니다).

## 작업 흐름 (두 기기 오가기)

```bash
git pull                 # 작업 시작 전 항상 최신 내용 받기
# ... 수정 ...
git add -A
git commit -m "무엇을 바꿨는지"
git push                 # 1~2분 뒤 학생 링크에 반영
```

- 수업 중에는 푸시하지 마세요. 학생 화면이 바뀝니다.
- 한쪽 기기에서 푸시하지 않고 다른 기기에서 작업하면 충돌이 납니다. **시작할 때 pull, 끝날 때 push.**

## macOS·Windows 호환 규칙

| 규칙 | 이유 |
|---|---|
| 줄바꿈은 LF (`.gitattributes`, `.editorconfig`로 자동 처리) | 두 OS에서 파일 전체가 "변경됨"으로 뜨는 문제 방지 |
| 파일·폴더 이름은 **영문 소문자·숫자·하이픈**만 | 한글 파일명은 macOS(NFD)와 Windows(NFC)에서 다르게 저장돼 같은 파일이 둘로 보일 수 있음 |
| 대소문자만 다른 파일명 금지 (`App.js`/`app.js`) | 두 OS 모두 기본적으로 대소문자를 구분하지 않음 |
| 경로는 `/` 사용, 절대 경로 금지 | 코드 안 경로는 항상 상대 경로(`js/app.js`) |
| `.DS_Store`, `Thumbs.db` 등은 `.gitignore`로 제외 | OS가 자동 생성하는 파일 |

화면 안의 한글(제목, 설명, 퀴즈)은 문제없습니다. 파일 **이름**에만 영문을 씁니다.
