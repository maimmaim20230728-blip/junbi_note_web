'use strict';
/* 画面: はじめて行くときの1枚(困っている場面・いつから・体と気持ちの変化・してほしいこと の4欄)
   ・first.v1 = { scene, since, change, wish }
   ・ホームの大ボタンから来る(ナビには置かない)
   ・書きかけ = draft.shokai = { scene, since, change, wish }(2026-10-30・場面の手引きと同じ形):
     書くたびに残す。下ナビ・名前・戻るボタン・言語切替・再読み込みで離れても消えない(だから戻るボタンで確かめない=data-nodirty)。
     ほぞん・相手に見せる(どちらも first.v1 に保存する)で消す。開いたとき書きかけがあれば、保存した中身より書きかけを出す */
(function(){
  var FIELDS = ['scene', 'since', 'change', 'wish'];
  var DRAFT = 'draft.shokai';

  window.SCREENS.register('shokai', {
    render: function(c, api){
      var U = window.JUNBI_UI, T = api.T;
      var data = U.obj(api, 'first.v1', { scene:'', since:'', change:'', wish:'' });
      var note = U.obj(api, 'note.v1', { who:'' });
      var draft = api.load(DRAFT, null);
      if(!draft || typeof draft !== 'object' || Array.isArray(draft)) draft = null;

      c.appendChild(api.el('h1', 'scr-title', T('screen.shokai.title')));
      c.appendChild(api.el('p', 'hint', T('screen.shokai.hint')));

      var ctrls = {};
      FIELDS.forEach(function(k){
        var v = (draft && typeof draft[k] === 'string') ? draft[k] : (data[k] || '');
        var t = U.textarea(T('screen.shokai.' + k + 'Ph'), v, 3);
        t.id = 'shokai-' + k;
        t.setAttribute('data-nodirty', '1');   // 書くたびに残すので、戻るボタンで「すてますか」と たずねない
        t.addEventListener('input', keep);
        ctrls[k] = t;
        c.appendChild(U.field(api, T('screen.shokai.' + k), t));
      });
      function raw(){
        var d = {};
        FIELDS.forEach(function(k){ d[k] = String(ctrls[k].value || ''); });
        return d;
      }
      /* 書きかけを残す。保存した中身と同じになったら書きかけは要らない */
      function keep(){
        var d = raw();
        var same = FIELDS.every(function(k){ return d[k].trim() === String(data[k] || ''); });
        if(same) api.remove(DRAFT); else api.save(DRAFT, d);
      }
      function collect(){
        var d = {};
        FIELDS.forEach(function(k){ d[k] = String(ctrls[k].value || '').trim(); });
        return d;
      }
      var row = api.el('div', 'btn-row');
      var saveB = U.btn(api, 'primary', T('common.save'), function(){
        var d = collect();
        if(!api.save('first.v1', d)){ api.toast(T('common.storageFull')); return; }
        api.remove(DRAFT);
        data = d; api.toast(T('common.saved')); api.markSaved();   // 戻るボタン(Play版)の確かめを出さない
      });
      saveB.id = 'shokai-save';
      row.appendChild(saveB);
      var showB = U.btn(api, '', T('common.show'), function(){
        var d = collect();
        if(api.save('first.v1', d)){ api.remove(DRAFT); api.markSaved(); data = d; }
        else api.toast(T('common.storageFull'));   // 見せるのはそのまま。保存できなかったことだけ知らせる(書きかけは残る)
        U.openOv(api, function(box){
          box.appendChild(api.el('div', 'show-head', T('screen.shokai.ovHead')));
          if(note.who) box.appendChild(api.el('p', 'show-label', U.fmt(T('screen.ichimai.ovWho'), { who: note.who })));
          FIELDS.forEach(function(k){
            var b = api.el('div', 'show-block');
            b.appendChild(api.el('div', 'show-label', T('screen.shokai.ov' + k.charAt(0).toUpperCase() + k.slice(1))));
            b.appendChild(api.el('div', 'show-value', d[k] || T('screen.shokai.ovEmpty')));
            box.appendChild(b);
          });
        });
      });
      showB.id = 'shokai-show';
      row.appendChild(showB);
      c.appendChild(row);
      var back = U.btn(api, 'wide', T('common.back'), function(){ api.go('home'); });
      back.id = 'shokai-back';
      c.appendChild(back);
    }
  });
})();
