'use strict';
/* 画面: 1枚(伝えたいことを大事な順に並べ、上から3〜5項目を相手に見せる)
   ・items.v1 = [{ id, title, detail, created }] 並び順=大事な順
   ・said.v1  = [{ id, title, detail, saidAt }] 窓口で「言えた」もの(言えなかったものは items に残る=次回へ繰り越し)
   ・見せる数(3〜5)は api.setExtra('showN')
   ・相手テンプレは初版で病院のみ(見出し文 screen.ichimai.ovHead) */
(function(){
  var N_CHOICES = [3, 4, 5];

  window.SCREENS.register('ichimai', {
    render: function(c, api){
      var U = window.JUNBI_UI, T = api.T;
      var items = U.list(api, 'items.v1');
      var said = U.list(api, 'said.v1');
      var showN = Number(api.getExtra('showN', 3));
      if(N_CHOICES.indexOf(showN) < 0) showN = 3;
      var note = U.obj(api, 'note.v1', { who:'' });
      var afterMode = false;   // 窓口のあとの「言えた/言えなかった」を付けるモード

      function saveItems(list){ if(!api.save('items.v1', list)){ api.toast(T('common.storageFull')); return false; } return true; }
      function rerender(){ api.go('ichimai'); }

      c.appendChild(api.el('h1', 'scr-title', T('screen.ichimai.title')));
      var hint = api.el('p', 'hint', U.fmt(T('screen.ichimai.hint'), { n: showN }));
      c.appendChild(hint);

      /* 見せる数(3/4/5) */
      var nRow = api.el('div', 'row');
      nRow.appendChild(api.el('span', 'lbl-inline', T('screen.ichimai.nLabel')));
      var chips = api.el('div', 'chips');
      N_CHOICES.forEach(function(n){
        var ch = api.el('button', 'chip' + (n === showN ? ' on' : ''), String(n));
        ch.id = 'ichimai-n-' + n;
        api.Tap.bind(ch, function(){ api.setExtra('showN', n); rerender(); });
        chips.appendChild(ch);
      });
      nRow.appendChild(chips);
      c.appendChild(nRow);

      /* 相手に見せる */
      var showBtn = U.btn(api, 'primary wide', T('common.show'), function(){ openShow(); });
      showBtn.id = 'ichimai-show';
      c.appendChild(showBtn);

      /* 窓口のあとに付ける */
      var afterBtn = U.btn(api, 'wide', T('screen.ichimai.afterBtn'), function(){ afterMode = !afterMode; drawList(); });
      afterBtn.id = 'ichimai-after';
      c.appendChild(afterBtn);

      var listBox = api.el('div');
      listBox.id = 'ichimai-list';
      c.appendChild(listBox);

      function drawList(){
        listBox.textContent = '';
        if(afterMode){
          listBox.appendChild(api.el('h2', 'sec-h', T('screen.ichimai.afterTitle')));
          listBox.appendChild(api.el('p', 'hint', T('screen.ichimai.afterHint')));
        }
        if(!items.length){ listBox.appendChild(api.el('p', 'empty', T('screen.ichimai.empty'))); return; }
        var ul = api.el('ul', 'list');
        items.forEach(function(it, idx){
          var li = api.el('li', idx < showN ? 'in-sheet' : '');
          li.setAttribute('data-id', it.id);
          var num = api.el('span', 'num', String(idx + 1));
          li.appendChild(num);
          var grow = api.el('div', 'grow');
          grow.appendChild(api.el('div', 'item-title', it.title));
          if(it.detail) grow.appendChild(api.el('div', 'hint', it.detail));
          li.appendChild(grow);
          var ctl = api.el('div', 'ctl');
          if(afterMode){
            var okB = U.btn(api, 'primary small', T('screen.ichimai.said'), function(){
              var list = U.list(api, 'items.v1');
              var pos = -1; for(var i = 0; i < list.length; i++) if(list[i].id === it.id) pos = i;
              if(pos < 0) return;
              var moved = list.splice(pos, 1)[0];
              var before = U.list(api, 'said.v1');
              var s = [{ id: moved.id, title: moved.title, detail: moved.detail || '', saidAt: Date.now() }].concat(before);
              /* 先に「言えた こと」へ足し、うまくいったら 1枚 から外す(保存がいっぱいでも項目が消えない) */
              if(!api.save('said.v1', s)){ api.toast(T('common.storageFull')); return; }
              if(!saveItems(list)){ api.save('said.v1', before); return; }
              items = list; said = s; drawList(); drawSaid();
            });
            okB.className = 'btn primary small';
            ctl.appendChild(okB);
            ctl.appendChild(U.btn(api, 'small', T('screen.ichimai.unsaid'), function(){ li.classList.add('kept'); }));
          } else {
            ctl.appendChild(U.btn(api, 'small', T('screen.ichimai.up'), function(){ move(idx, -1); }));
            ctl.appendChild(U.btn(api, 'small', T('screen.ichimai.down'), function(){ move(idx, 1); }));
            ctl.appendChild(U.btn(api, 'small', T('common.edit'), function(){ openEdit(li, it); }));
          }
          li.appendChild(ctl);
          ul.appendChild(li);
          /* 見せる範囲の区切り: N行目のあとに1行(N行より多いときだけ) */
          if(!afterMode && idx === showN - 1 && items.length > showN){
            var end = api.el('li', 'sheet-end', T('screen.ichimai.sheetEnd'));
            end.id = 'ichimai-sheet-end';
            ul.appendChild(end);
          }
        });
        listBox.appendChild(ul);
        if(afterMode){
          var done = U.btn(api, 'wide', T('screen.ichimai.afterDone'), function(){ afterMode = false; drawList(); });
          done.id = 'ichimai-after-done';
          listBox.appendChild(done);
        }
      }
      function move(idx, d){
        var list = U.list(api, 'items.v1');
        var j = idx + d;
        if(j < 0 || j >= list.length) return;
        var tmp = list[idx]; list[idx] = list[j]; list[j] = tmp;
        if(!saveItems(list)) return;
        items = list; drawList();
      }
      /* その場で直す(1行+くわしく)・けす */
      function openEdit(li, it){
        li.textContent = '';
        var box = api.el('div', 'grow');
        var t = U.input('text', T('screen.ichimai.editTitlePh'), it.title);
        var d = U.textarea(T('screen.ichimai.editDetailPh'), it.detail || '', 2);
        box.appendChild(U.field(api, null, t));
        box.appendChild(U.field(api, null, d));
        var row = api.el('div', 'btn-row');
        row.appendChild(U.btn(api, 'primary', T('common.save'), function(){
          var list = U.list(api, 'items.v1');
          for(var i = 0; i < list.length; i++){ if(list[i].id === it.id){ list[i].title = String(t.value || '').trim() || it.title; list[i].detail = String(d.value || '').trim(); } }
          if(!saveItems(list)) return;
          items = list; api.toast(T('common.saved')); drawList();
        }));
        row.appendChild(U.btn(api, '', T('common.cancel'), function(){ drawList(); }));
        row.appendChild(U.delBtn(api, function(){
          var list = U.list(api, 'items.v1').filter(function(x){ return x.id !== it.id; });
          if(!saveItems(list)) return;
          items = list; api.toast(T('common.deleted')); drawList();
        }));
        box.appendChild(row);
        li.appendChild(box);
      }
      drawList();

      /* 言えたこと */
      var saidBox = api.el('div');
      saidBox.id = 'ichimai-said';
      c.appendChild(saidBox);
      function drawSaid(){
        saidBox.textContent = '';
        if(!said.length) return;
        saidBox.appendChild(api.el('h2', 'sec-h', T('screen.ichimai.saidList')));
        var ul = api.el('ul', 'list done-list');
        said.forEach(function(s){
          var li = api.el('li');
          var dt = new Date(s.saidAt || 0);
          li.appendChild(api.el('span', 'hint', dt.getFullYear() + '/' + (dt.getMonth() + 1) + '/' + dt.getDate()));
          var g = api.el('div', 'grow'); g.appendChild(api.el('div', null, s.title)); li.appendChild(g);
          ul.appendChild(li);
        });
        saidBox.appendChild(ul);
        var clearB = U.delBtn(api, function(){ api.save('said.v1', []); said = []; drawSaid(); });
        clearB.textContent = T('screen.ichimai.saidClear');   // 「けす」だけでは何を消すか分からないので明示(2回目は共通の確認文)
        clearB.id = 'ichimai-said-clear';
        saidBox.appendChild(clearB);
      }
      drawSaid();

      /* 相手に見せる画面(病院テンプレ・漢字・上からN項目・大きな字) */
      function openShow(){
        var top = items.slice(0, showN);
        U.openOv(api, function(box){
          box.appendChild(api.el('div', 'show-head', T('screen.ichimai.ovHead')));
          if(note.who) box.appendChild(api.el('p', 'show-label', U.fmt(T('screen.ichimai.ovWho'), { who: note.who })));
          box.appendChild(api.el('p', 'show-label', T('screen.ichimai.ovNote')));
          if(!top.length){ box.appendChild(api.el('p', 'empty', T('screen.ichimai.empty'))); return; }
          top.forEach(function(it, i){
            var b = api.el('div', 'show-block');
            b.appendChild(api.el('div', 'show-label', String(i + 1)));
            b.appendChild(api.el('div', 'show-value', it.title));
            if(it.detail) b.appendChild(api.el('div', 'show-detail', it.detail));
            box.appendChild(b);
          });
        });
      }
    }
  });
})();
