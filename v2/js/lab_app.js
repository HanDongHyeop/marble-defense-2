// [v2] 마블 디펜스 2 판용 복사본(lab/js/lab_app.js) — 아웃게임 덱 · 지휘관 · 성장을 그대로 받음 · 끌어 쓰는 지휘관 단추 · 첫 판 규칙 카드
// 마블 디펜스 실험실 — 앱 층: 판 시작할 때 맵별 단추 · 게이지 그림 · 본편 성장 저장과 분리
// [주의] main.js 뒤 스크립트로 두면, 그림이 캐시에 있을 때 본편 boot가 먼저 판을 시작해 버린다(두 번째 판에서 단추가 안 붙음 — WebKit에서 발견)
//   → UI 생성자(bind) 안에서 부른다: UI는 boot가 판을 열기 전에 만들어진다
(function (root) {
  const LAB = root.LAB; if (!LAB) return;
  root.LAB_APP = function (App) {
  const $ = id => document.getElementById(id);
  const MAP = LAB.map;
  if (!App.embed) App.embedMeta = { nodes: {} };   // 단독으로 열면 성장 없음 · 아웃게임 안에선 아웃게임 성장(og.meta)
  document.title = LAB.TITLE[MAP];
  document.body.classList.add('lab', 'lab-' + MAP, 'v2');

  function setupDom() {
    if (setupDom.done) return; setupDom.done = true;
    const gi = $('gaugeIco'); if (gi) gi.src = 'assets/img/x_crystal.png';
    $('gaugeTxt').textContent = LAB.C.crystal + ' / ' + LAB.C.crystal; $('gaugeFill').style.width = '100%';   // 판이 '시작'을 기다리는 동안(update 전)에도 수정 체력으로
    // 끌어 쓰는 지휘관(건축가 · 철거반장 · 정비공 · 순간이동술사): 단추를 누르면 '포탑 고르기' 상태
    $('cmdBtn').addEventListener('click', e => {
      const g = App.game; if (!g) return; const C = root.DATA.COMMANDERS[g.cmd.id]; if (C.mode !== 'drag') return;
      e.stopImmediatePropagation();
      if (e.target && e.target.tagName === 'INPUT') return;   // 아이폰: 단추 속 진동 라벨(haptic.js)이 click을 한 번 더 보냄 — 그 두 번째는 무시
      if (!g.cmdReady()) { App.ui.toast('지휘관', '아직 못 써요', '쿨다운 중', true, 1.2); return; }
      if (App.ui.cmdArm) return;   // 이미 고르는 중(취소 = 판의 빈 곳 누르기)
      App.ui.cmdArm = true; $('cmdBtn').classList.add('droptarget');
      App.ui.toast('지휘관 · ' + C.name, '쓸 포탑을 누르세요', C.act, false, 2.2);
    }, true);
    if (MAP === 'marble') return;
    // 굴리기 단추 → 소환 단추(값 · AUTO는 그대로)
    const rb = $('rollBtn');
    const sm = document.createElement('div'); sm.className = 'labSumm'; sm.innerHTML = '<i class="sp"></i><b>소환</b>';
    rb.insertBefore(sm, rb.firstChild);
    const row = $('mainRow');
    if (MAP === 'dial') {
      const mk = (id, dir, ico, txt) => {
        const b = document.createElement('button'); b.id = id; b.className = 'slot labrot'; b.setAttribute('aria-label', txt);
        b.innerHTML = `<span class="ico">${ico}</span><span class="lab">${txt}</span>`;
        let iv = null;
        const stop = () => { clearInterval(iv); iv = null; b.classList.remove('press'); };
        b.addEventListener('pointerdown', e => {
          e.preventDefault(); if (!App.game || App.game.over) return; root.SFX.init && root.SFX.init();
          b.classList.add('press'); App.cmd('rotateBy', [dir]); try { root.SFX.click(); } catch (er) { /* 소리 없음 */ }
          clearInterval(iv); iv = setInterval(() => { if (App.game && !App.game.over) App.cmd('rotateBy', [dir]); }, 170);
        });
        for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, stop);
        return b;
      };
      row.insertBefore(mk('labRotL', -1, '⟲', '반시계로 돌리기'), $('rollBtn'));
      row.appendChild(mk('labRotR', 1, '⟳', '시계로 돌리기'));
    }
    if (MAP === 'slide') {
      const w = document.createElement('div'); w.id = 'labWave'; w.className = 'slot'; row.insertBefore(w, $('rollBtn'));
      const pad = document.createElement('div'); pad.id = 'labPad'; pad.className = 'slot';
      pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', '밀기 방향');
      pad.innerHTML = [['-U', '↖', 'lt'], ['-V', '↗', 'rt'], ['+V', '↙', 'lb'], ['+U', '↘', 'rb']].map(([d, a, c]) => `<span class="pd ${c}" data-d="${d}">${a}</span>`).join('') + '<span class="mid">밀기</span>';
      // 칸 전체를 네 쪽으로 나눠 누름(작은 화면에서 손가락이 단추 사이에 떨어져도 방향이 정해지게)
      pad.addEventListener('pointerdown', e => {
        e.preventDefault(); root.SFX.init && root.SFX.init();
        const r = pad.getBoundingClientRect(), L = e.clientX < r.left + r.width / 2, T = e.clientY < r.top + r.height / 2;
        const d = T ? (L ? '-U' : '-V') : (L ? '+V' : '+U'), el = pad.querySelector(`[data-d="${d}"]`);
        el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
        App.ui.labSlide(d);
      });
      row.appendChild(pad);
    }
  }

  const baseStart = App.start;
  App.start = function (choice, seed) {
    const ch = Object.assign(LAB.choice(), choice || {}); if (ch.commander === 'gambler') ch.commander = 'cheer'; ch.coop = false;
    baseStart.call(this, ch, seed);
    setupDom();
    // 처음 하는 판: 규칙 카드(창이 떠 있는 동안 판은 멈춤)
    if (this.embed) { let seen = false; try { seen = !!localStorage.getItem('mdv2_tut'); localStorage.setItem('mdv2_tut', '1'); } catch (er) { /* 저장 안 됨 */ } if (!seen) this.ui.labIntro(); }
    this.ui._waveKey = null;
  };
  // 자동 확인(?qa=bot): 다이얼 · 밀어 합치기는 실험실 봇
  App.botTick = function (dt) { this.botT = (this.botT || 0) + dt; if (this.botT > 0.25) { this.botT = 0; const f = MAP === 'marble' ? root.BOT : root.LABBOT; if (f) f(this.game); } };
  };
})(window);
