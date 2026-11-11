'use strict';
/* 画面: 窓口ごとの記録(窓口名・担当者・次の予約・言われたこと・約束・次に確かめる日)
   ・places.v1 = [{ id, name, person, next:'YYYY-MM-DD'|'', told, promise, check:'YYYY-MM-DD'|'' }]
   ・カードをタップで開いて直す(1つのフォームを使い回す)
   ・書きかけ = draft.madoguchi = { id, isNew, name, person, next, told, promise, check }(2026-11-11・ホームの draft.homeAdd と同じ形):
     書くたびに残し、言語切替・下ナビ・再読み込みで描き直しても、開いていた欄(新しく足す欄か、どのカードをなおす欄か)と字を戻す。
     ほぞん・けす・やめる(戻るボタンも)で消す。開いたときの中身と同じに戻したら消す */
(function(){
  var DRAFT = 'draft.madoguchi';
  var FIELDS = ['name', 'person', 'next', 'told', 'promise', 'check'];
  var stage = null;   // 戻るボタン(Play版): 画面の中の段を1つ戻す(描くたびに作り直す)

  window.SCREENS.register('madoguchi', {
    /* 戻るボタン(Play版・2026-09-29): 開いている入力の欄を閉じる(やめる と同じ・保存しない) */
    back: function(api){ return stage ? stage(api) : false; },
    render: function(c, api){
      var U = window.JUNBI_UI, T = api.T;
      var rows = U.list(api, 'places.v1');
      function persist(list){ if(!api.save('places.v1', list)){ api.toast(T('common.storageFull')); return false; } rows = list; return true; }

      c.appendChild(api.el('h1', 'scr-title', T('screen.madoguchi.title')));
      c.appendChild(api.el('p', 'hint', T('screen.madoguchi.hint')));
      var addB = U.btn(api, 'primary wide', T('screen.madoguchi.addBtn'), function(){ openForm(null); });
      addB.id = 'madoguchi-add';
      c.appendChild(addB);
      var formBox = api.el('div'); formBox.id = 'madoguchi-form'; c.appendChild(formBox);
      var listBox = api.el('div'); listBox.id = 'madoguchi-list'; c.appendChild(listBox);

      /* 開く(dr = 書きかけから戻すときの中身) */
      function openForm(row, dr){
        formBox.textContent = '';
        api.markSaved();   // 開いていた欄は入れ替わった(この画面の入力は この欄だけ)=戻るボタンの書きかけは無い
        api.remove(DRAFT);   // 別の欄を開いた=前の欄の書きかけは閉じた(dr があれば すぐ下で書き直す)
        var isNew = !row;
        row = row || { id: (dr && dr.id) || U.uid(), name: '', person: '', next: '', told: '', promise: '', check: '' };
        var init = {};
        FIELDS.forEach(function(k){ init[k] = row[k] == null ? '' : String(row[k]); });
        var v = dr || init;
        var card = api.el('div', 'card');
        var name = U.input('text', T('screen.madoguchi.namePh'), v.name); name.id = 'madoguchi-f-name';
        var person = U.input('text', T('screen.madoguchi.personPh'), v.person); person.id = 'madoguchi-f-person';
        var next = U.input('date', '', v.next); next.id = 'madoguchi-f-next';
        var told = U.textarea(T('screen.madoguchi.toldPh'), v.told, 3); told.id = 'madoguchi-f-told';
        var promise = U.textarea(T('screen.madoguchi.promisePh'), v.promise, 2); promise.id = 'madoguchi-f-promise';
        var check = U.input('date', '', v.check); check.id = 'madoguchi-f-check';
        var ctrls = { name: name, person: person, next: next, told: told, promise: promise, check: check };
        /* 書きかけを残す。開いたときの中身と同じなら要らない */
        function keep(){
          var d = { id: row.id, isNew: isNew };
          FIELDS.forEach(function(k){ d[k] = String(ctrls[k].value || ''); });
          var same = FIELDS.every(function(k){ return d[k] === init[k]; });
          if(same) api.remove(DRAFT); else api.save(DRAFT, d);
        }
        FIELDS.forEach(function(k){ ctrls[k].addEventListener('input', keep); });
        next.addEventListener('change', keep);
        check.addEventListener('change', keep);
        function close(){ formBox.textContent = ''; api.remove(DRAFT); }
        card.appendChild(U.field(api, T('screen.madoguchi.name'), name));
        card.appendChild(U.field(api, T('screen.madoguchi.person'), person));
        card.appendChild(U.field(api, T('screen.madoguchi.next'), next));
        card.appendChild(U.field(api, T('screen.madoguchi.told'), told));
        card.appendChild(U.field(api, T('screen.madoguchi.promise'), promise));
        card.appendChild(U.field(api, T('screen.madoguchi.check'), check));
        var btns = api.el('div', 'btn-row');
        var saveB = U.btn(api, 'primary', T('common.save'), function(){
          var rec = { id: row.id, name: String(name.value || '').trim(), person: String(person.value || '').trim(), next: next.value || '',
                      told: String(told.value || '').trim(), promise: String(promise.value || '').trim(), check: check.value || '' };
          if(!rec.name){ api.toast(T('screen.madoguchi.needName')); return; }   // 名前が空なら保存しない(「(名前なし)」のカードを作らない)
          var list = U.list(api, 'places.v1');
          if(isNew) list.push(rec); else list = list.map(function(x){ return x.id === rec.id ? rec : x; });
          if(!persist(list)) return;
          api.toast(T('common.saved')); close(); drawList(); api.markSaved();
        });
        saveB.id = 'madoguchi-f-save';
        btns.appendChild(saveB);
        btns.appendChild(U.btn(api, '', T('common.cancel'), function(){ close(); api.markSaved(); }));
        if(!isNew) btns.appendChild(U.delBtn(api, function(){
          if(!persist(U.list(api, 'places.v1').filter(function(x){ return x.id !== row.id; }))) return;
          api.toast(T('common.deleted')); close(); drawList(); api.markSaved();
        }));
        card.appendChild(btns);
        formBox.appendChild(card);
        if(dr){
          api.save(DRAFT, dr);
          /* 描き直した欄にも字がある=戻るボタン(Play版)で閉じるときは確かめる(描き直しで消えた印を付け直す) */
          try{ name.dispatchEvent(new Event('input', { bubbles:true })); }catch(_){}
        }
      }

      function line(parent, label, val){ if(val) parent.appendChild(api.el('div', 'hint', label + ': ' + val)); }
      function drawList(){
        listBox.textContent = '';
        if(!rows.length){ listBox.appendChild(api.el('p', 'empty', T('screen.madoguchi.empty'))); return; }
        /* 近い日が上(2026-11-11): 次の予約か次に確かめる日のうち、今日以降でいちばん近い日の順。今日から7日以内は「もうすぐ」の印。
           日の入っていない・過ぎた日だけのカードは、そのあとに足した順のまま。保存の順は変えない */
        function dayNum(s){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN; }
        var t0 = dayNum(U.today());
        function nearest(r){
          var best = NaN;
          [r.next, r.check].forEach(function(x){ var n = dayNum(x); if(n >= t0 && (isNaN(best) || n < best)) best = n; });
          return isNaN(best) ? NaN : best - t0;
        }
        var order = rows.map(function(r, i){ return { r: r, i: i, d: nearest(r) }; });
        order.sort(function(a, b){
          var au = !isNaN(a.d), bu = !isNaN(b.d);
          if(au !== bu) return au ? -1 : 1;
          if(au && a.d !== b.d) return a.d - b.d;
          return a.i - b.i;
        });
        order.forEach(function(o){
          var r = o.r;
          var card = api.el('div', 'card tappable');
          var title = api.el('div', 'item-title', r.name || T('screen.madoguchi.untitled'));
          if(!isNaN(o.d) && o.d <= 7) title.appendChild(api.el('span', 'soon-badge', T('screen.madoguchi.soon')));
          card.appendChild(title);
          line(card, T('screen.madoguchi.person'), r.person);
          line(card, T('screen.madoguchi.next'), r.next);
          line(card, T('screen.madoguchi.told'), r.told);
          line(card, T('screen.madoguchi.promise'), r.promise);
          line(card, T('screen.madoguchi.check'), r.check);
          api.Tap.bind(card, function(){ openForm(r); try{ formBox.scrollIntoView(); }catch(_){} });
          listBox.appendChild(card);
        });
      }
      drawList();
      stage = function(){
        if(!formBox.firstChild) return false;
        formBox.textContent = '';
        api.remove(DRAFT);   // やめる と同じ
        return true;
      };
      /* 書きかけがあれば、その欄を開き直す(なおすカードが もう無ければ書きかけは捨てる) */
      (function(){
        var dr = api.load(DRAFT, null);
        if(!dr || typeof dr !== 'object' || Array.isArray(dr)) return;
        var d = { id: typeof dr.id === 'string' ? dr.id : '', isNew: dr.isNew !== false };
        FIELDS.forEach(function(k){ d[k] = typeof dr[k] === 'string' ? dr[k] : ''; });
        if(d.isNew){ openForm(null, d); return; }
        var r = rows.filter(function(x){ return x.id === d.id; })[0];
        if(r) openForm(r, d); else api.remove(DRAFT);
      })();
    }
  });
})();
