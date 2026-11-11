'use strict';
/* 画面: 年表(受診/言われた病名(キーは diag)/薬の開始/薬の変更/薬の中止/出来事 を1本の一覧に)
   ・timeline.v1 = [{ id, date:'YYYY-MM-DD', kind, text, feel, look }] (feel=実感(本人)・look=様子(家族)は薬の種類だけ)
   ・見せる範囲(種類)= api.setExtra('nenpyoKinds', [...]) 初期値は最小限(受診・言われた病名)。実感/様子は setExtra('nenpyoFeel') 初期値=見せない
   ・「飲んだ時刻」「次に飲めるのは何時」は持たない
   ・書きかけ = draft.nenpyo = { id, isNew, date, kind, text, feel, look }(2026-11-11・ホームの draft.homeAdd と同じ形):
     書くたびに残し、言語切替・下ナビ・再読み込みで描き直しても、開いていた欄(新しく足す欄か、どの行をなおす欄か)と字を戻す。
     ほぞん・けす・やめる(戻るボタンも)で消す。開いたときの中身と同じに戻したら消す */
(function(){
  var DRAFT = 'draft.nenpyo';
  var KINDS = ['visit', 'diag', 'medStart', 'medChange', 'medStop', 'event'];
  var MED_KINDS = ['medStart', 'medChange', 'medStop'];
  var DEFAULT_SHOW = ['visit', 'diag'];
  var stage = null;   // 戻るボタン(Play版): 画面の中の段を1つ戻す(描くたびに作り直す)

  window.SCREENS.register('nenpyo', {
    /* 戻るボタン(Play版・2026-09-29): 開いている入力の欄を閉じる(やめる と同じ・保存しない) */
    back: function(api){ return stage ? stage(api) : false; },
    render: function(c, api){
      var U = window.JUNBI_UI, T = api.T;
      var rows = U.list(api, 'timeline.v1');
      var showKinds = api.getExtra('nenpyoKinds', DEFAULT_SHOW.slice());
      if(!Array.isArray(showKinds)) showKinds = DEFAULT_SHOW.slice();
      var showFeel = !!api.getExtra('nenpyoFeel', false);
      var note = U.obj(api, 'note.v1', { who:'' });

      function kindLabel(k){ return T('screen.nenpyo.kinds.' + k); }
      function sorted(list){ return list.slice().sort(function(a, b){ return String(a.date).localeCompare(String(b.date)); }); }
      function persist(list){ if(!api.save('timeline.v1', list)){ api.toast(T('common.storageFull')); return false; } rows = list; return true; }

      c.appendChild(api.el('h1', 'scr-title', T('screen.nenpyo.title')));
      c.appendChild(api.el('p', 'hint', T('screen.nenpyo.hint')));
      var warn = api.el('p', 'note', T('screen.nenpyo.medWarn'));
      warn.id = 'nenpyo-medwarn';
      c.appendChild(warn);

      /* 追加・編集フォーム(1つを使い回す) */
      var formBox = api.el('div');
      formBox.id = 'nenpyo-form';
      var addB = U.btn(api, 'primary wide', T('screen.nenpyo.addBtn'), function(){ openForm(null); });
      addB.id = 'nenpyo-add';
      c.appendChild(addB);
      c.appendChild(formBox);

      /* 開く(dr = 書きかけから戻すときの中身) */
      function openForm(row, dr){
        formBox.textContent = '';
        api.markSaved();   // 開いていた欄は入れ替わった(この画面の入力は この欄だけ)=戻るボタンの書きかけは無い
        api.remove(DRAFT);   // 別の欄を開いた=前の欄の書きかけは閉じた(dr があれば すぐ下で書き直す)
        var card = api.el('div', 'card');
        var isNew = !row;
        row = row || { id: (dr && dr.id) || U.uid(), date: U.today(), kind: 'visit', text: '', feel: '', look: '' };
        var init = { date: row.date || '', kind: row.kind, text: row.text || '', feel: row.feel || '', look: row.look || '' };
        var v = dr || init;
        var date = U.input('date', '', v.date); date.id = 'nenpyo-f-date';
        var kind = U.select(KINDS.map(function(k){ return { value: k, label: kindLabel(k) }; }), KINDS.indexOf(v.kind) >= 0 ? v.kind : init.kind); kind.id = 'nenpyo-f-kind';
        var text = U.textarea(T('screen.nenpyo.textPh'), v.text, 2); text.id = 'nenpyo-f-text';
        var feel = U.textarea(T('screen.nenpyo.feelPh'), v.feel, 2); feel.id = 'nenpyo-f-feel';
        var look = U.textarea(T('screen.nenpyo.lookPh'), v.look, 2); look.id = 'nenpyo-f-look';
        /* 書きかけを残す。開いたときの中身と同じなら要らない */
        function keep(){
          var d = { id: row.id, isNew: isNew, date: String(date.value || ''), kind: kind.value, text: String(text.value || ''), feel: String(feel.value || ''), look: String(look.value || '') };
          var same = ['date', 'kind', 'text', 'feel', 'look'].every(function(k){ return d[k] === init[k]; });
          if(same) api.remove(DRAFT); else api.save(DRAFT, d);
        }
        [date, text, feel, look].forEach(function(x){ x.addEventListener('input', keep); });
        date.addEventListener('change', keep);
        kind.addEventListener('change', keep);
        function close(){ formBox.textContent = ''; api.remove(DRAFT); }
        card.appendChild(U.field(api, T('screen.nenpyo.date'), date));
        card.appendChild(U.field(api, T('screen.nenpyo.kind'), kind));
        card.appendChild(U.field(api, T('screen.nenpyo.text'), text));
        var medBox = api.el('div');
        medBox.appendChild(U.field(api, T('screen.nenpyo.feel'), feel));
        medBox.appendChild(U.field(api, T('screen.nenpyo.look'), look));
        card.appendChild(medBox);
        function syncMed(){ medBox.classList.toggle('hidden', MED_KINDS.indexOf(kind.value) < 0); }
        kind.addEventListener('change', syncMed);   // select だけネイティブイベント
        syncMed();
        var btns = api.el('div', 'btn-row');
        var saveB = U.btn(api, 'primary', T('common.save'), function(){
          var t = String(text.value || '').trim();
          if(!t){ api.toast(T('screen.nenpyo.needText')); return; }   // ないようが空なら「書いてください」(「ほぞんできません」だと容量の話に見える)
          var rec = { id: row.id, date: date.value || U.today(), kind: kind.value, text: t,
                      feel: MED_KINDS.indexOf(kind.value) >= 0 ? String(feel.value || '').trim() : '',
                      look: MED_KINDS.indexOf(kind.value) >= 0 ? String(look.value || '').trim() : '' };
          var list = U.list(api, 'timeline.v1');
          if(isNew) list.push(rec); else list = list.map(function(x){ return x.id === rec.id ? rec : x; });
          if(!persist(list)) return;
          api.toast(T('common.saved')); close(); drawList(); api.markSaved();
        });
        saveB.id = 'nenpyo-f-save';
        btns.appendChild(saveB);
        btns.appendChild(U.btn(api, '', T('common.cancel'), function(){ close(); api.markSaved(); }));
        if(!isNew) btns.appendChild(U.delBtn(api, function(){
          if(!persist(U.list(api, 'timeline.v1').filter(function(x){ return x.id !== row.id; }))) return;
          api.toast(T('common.deleted')); close(); drawList(); api.markSaved();
        }));
        card.appendChild(btns);
        formBox.appendChild(card);
        if(dr){
          api.save(DRAFT, dr);
          /* 描き直した欄にも字がある=戻るボタン(Play版)で閉じるときは確かめる(描き直しで消えた印を付け直す) */
          try{ text.dispatchEvent(new Event('input', { bubbles:true })); }catch(_){}
        }
      }

      /* 一覧 */
      var listBox = api.el('div');
      listBox.id = 'nenpyo-list';
      c.appendChild(listBox);
      function drawList(){
        listBox.textContent = '';
        if(!rows.length){ listBox.appendChild(api.el('p', 'empty', T('screen.nenpyo.empty'))); return; }
        var ul = api.el('ul', 'list');
        sorted(rows).forEach(function(r){
          var li = api.el('li', 'tappable kind-' + r.kind);
          var g = api.el('div', 'grow');
          g.appendChild(api.el('div', 'hint', r.date + '  ' + kindLabel(r.kind)));
          g.appendChild(api.el('div', 'item-title', r.text));
          if(r.feel) g.appendChild(api.el('div', 'hint', T('screen.nenpyo.feel') + ': ' + r.feel));
          if(r.look) g.appendChild(api.el('div', 'hint', T('screen.nenpyo.look') + ': ' + r.look));
          li.appendChild(g);
          li.appendChild(U.btn(api, 'small', T('common.edit'), function(){ openForm(r); try{ formBox.scrollIntoView(); }catch(_){} }));
          ul.appendChild(li);
        });
        listBox.appendChild(ul);
      }
      drawList();
      stage = function(){
        if(!formBox.firstChild) return false;
        formBox.textContent = '';
        api.remove(DRAFT);   // やめる と同じ
        return true;
      };
      /* 書きかけがあれば、その欄を開き直す(なおす行が もう無ければ書きかけは捨てる) */
      (function(){
        var dr = api.load(DRAFT, null);
        if(!dr || typeof dr !== 'object' || Array.isArray(dr)) return;
        var d = { id: typeof dr.id === 'string' ? dr.id : '' };
        ['date', 'kind', 'text', 'feel', 'look'].forEach(function(k){ d[k] = typeof dr[k] === 'string' ? dr[k] : ''; });
        d.isNew = dr.isNew !== false;
        if(d.isNew){ openForm(null, d); return; }
        var r = rows.filter(function(x){ return x.id === d.id; })[0];
        if(r) openForm(r, d); else api.remove(DRAFT);
      })();

      /* 見せる範囲 */
      c.appendChild(api.el('h2', 'sec-h', T('screen.nenpyo.rangeTitle')));
      c.appendChild(api.el('p', 'hint', T('screen.nenpyo.rangeHint')));
      var chips = api.el('div', 'chips');
      KINDS.forEach(function(k){
        var on = showKinds.indexOf(k) >= 0;
        var ch = api.el('button', 'chip' + (on ? ' on' : ''), kindLabel(k));
        ch.id = 'nenpyo-range-' + k;
        api.Tap.bind(ch, function(){
          var i = showKinds.indexOf(k);
          if(i >= 0) showKinds.splice(i, 1); else showKinds.push(k);
          api.setExtra('nenpyoKinds', showKinds.slice());
          ch.classList.toggle('on', showKinds.indexOf(k) >= 0);
        });
        chips.appendChild(ch);
      });
      c.appendChild(chips);
      var feelChip = api.el('button', 'chip' + (showFeel ? ' on' : ''), T('screen.nenpyo.rangeFeel'));
      feelChip.id = 'nenpyo-range-feel';
      api.Tap.bind(feelChip, function(){ showFeel = !showFeel; api.setExtra('nenpyoFeel', showFeel); feelChip.classList.toggle('on', showFeel); });
      var fw = api.el('div', 'chips'); fw.appendChild(feelChip); c.appendChild(fw);

      var showB = U.btn(api, 'primary wide', T('common.show'), function(){
        var list = sorted(rows).filter(function(r){ return showKinds.indexOf(r.kind) >= 0; });
        U.openOv(api, function(box){
          box.appendChild(api.el('div', 'show-head', T('screen.nenpyo.ovHead')));
          if(note.who) box.appendChild(api.el('p', 'show-label', U.fmt(T('screen.ichimai.ovWho'), { who: note.who })));
          if(!list.length){ box.appendChild(api.el('p', 'empty', T('screen.nenpyo.ovEmpty'))); return; }
          list.forEach(function(r){
            var b = api.el('div', 'show-block');
            b.appendChild(api.el('div', 'show-label', r.date + '  ' + kindLabel(r.kind)));
            b.appendChild(api.el('div', 'show-value', r.text));
            if(showFeel && MED_KINDS.indexOf(r.kind) >= 0){
              if(r.feel) b.appendChild(api.el('div', 'show-detail', T('screen.nenpyo.ovFeel') + ': ' + r.feel));
              if(r.look) b.appendChild(api.el('div', 'show-detail', T('screen.nenpyo.ovLook') + ': ' + r.look));
            }
            box.appendChild(b);
          });
        });
      });
      showB.id = 'nenpyo-show';
      c.appendChild(showB);
    }
  });
})();
