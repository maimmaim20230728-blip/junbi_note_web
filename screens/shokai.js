'use strict';
/* 画面: はじめて行くときの1枚(困っている場面・いつから・体と気持ちの変化・してほしいこと の4欄)
   ・first.v1 = { scene, since, change, wish }
   ・ホームの大ボタンから来る(ナビには置かない) */
(function(){
  var FIELDS = ['scene', 'since', 'change', 'wish'];

  window.SCREENS.register('shokai', {
    render: function(c, api){
      var U = window.JUNBI_UI, T = api.T;
      var data = api.load('first.v1', { scene:'', since:'', change:'', wish:'' });
      var note = api.load('note.v1', { who:'' });

      c.appendChild(api.el('h1', 'scr-title', T('screen.shokai.title')));
      c.appendChild(api.el('p', 'hint', T('screen.shokai.hint')));

      var ctrls = {};
      FIELDS.forEach(function(k){
        var t = U.textarea(T('screen.shokai.' + k + 'Ph'), data[k] || '', 3);
        t.id = 'shokai-' + k;
        ctrls[k] = t;
        c.appendChild(U.field(api, T('screen.shokai.' + k), t));
      });
      function collect(){
        var d = {};
        FIELDS.forEach(function(k){ d[k] = String(ctrls[k].value || '').trim(); });
        return d;
      }
      var row = api.el('div', 'btn-row');
      var saveB = U.btn(api, 'primary', T('common.save'), function(){
        var d = collect();
        if(!api.save('first.v1', d)){ api.toast(T('common.storageFull')); return; }
        data = d; api.toast(T('common.saved'));
      });
      saveB.id = 'shokai-save';
      row.appendChild(saveB);
      var showB = U.btn(api, '', T('common.show'), function(){
        var d = collect();
        api.save('first.v1', d); data = d;
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
