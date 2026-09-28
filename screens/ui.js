'use strict';
/* 画面共通の小さな部品(このアプリ内だけ)。画面の状態は持たない(純粋な生成関数だけ)。
   ・window.JUNBI_UI = { uid, today, fmt, list, obj, field, input, textarea, select, btn, openOv, delBtn }
   ・操作は全部 api.Tap.bind(click禁止)。select と file input だけネイティブイベント */
(function(){
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function today(){ var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  /* {n} などの差し替え */
  function fmt(s, map){ var out = String(s); for(var k in map){ out = out.split('{' + k + '}').join(String(map[k])); } return out; }
  /* 保存した一覧を読む。配列でなければ [](形の違う控えを読んだときなど)・オブジェクトでない行は除く */
  function isObj(x){ return !!x && typeof x === 'object' && !Array.isArray(x); }
  function list(api, key){ var v = api.load(key, []); return Array.isArray(v) ? v.filter(isObj) : []; }
  /* 保存した1件(表紙の1行など)を読む。普通のオブジェクトでなければ def */
  function obj(api, key, def){ var v = api.load(key, null); return isObj(v) ? v : def; }

  function input(type, ph, value){
    var i = document.createElement('input');
    i.type = type || 'text';
    if(ph) i.placeholder = ph;
    if(value != null) i.value = value;
    return i;
  }
  function textarea(ph, value, rows){
    var t = document.createElement('textarea');
    if(ph) t.placeholder = ph;
    if(value != null) t.value = value;
    t.rows = rows || 2;
    return t;
  }
  function select(options, value){
    var s = document.createElement('select');
    for(var i = 0; i < options.length; i++){
      var o = document.createElement('option');
      o.value = options[i].value; o.textContent = options[i].label;
      s.appendChild(o);
    }
    if(value != null) s.value = value;
    return s;
  }
  /* ラベル付きの欄 */
  function field(api, label, ctrl){
    var f = api.el('div', 'field');
    if(label){ f.appendChild(api.el('label', null, label)); }
    f.appendChild(ctrl);
    return f;
  }
  function btn(api, cls, text, fn){
    var b = api.el('button', 'btn' + (cls ? ' ' + cls : ''), text);
    api.Tap.bind(b, fn);
    return b;
  }
  /* 2段階の「けす」: 1回目で文言が「ほんとうに けしますか?」に変わり、2回目で実行 */
  function delBtn(api, fn){
    var armed = false;
    var b = api.el('button', 'btn danger', api.T('common.del'));
    api.Tap.bind(b, function(){
      if(!armed){ armed = true; b.textContent = api.T('common.delConfirm'); return; }
      fn();
    });
    return b;
  }
  /* 相手に見せる全画面(.ov)。build(box) で中身を作る。閉じるボタンは共通。戻り値=閉じる関数 */
  function openOv(api, build, onClose){
    var ov = api.el('div', 'ov show-white');
    var box = api.el('div', 'ov-body');
    build(box);
    ov.appendChild(box);
    var close = api.el('button', 'ov-close', api.T('common.showClose'));
    function doClose(){ if(ov.parentNode) ov.parentNode.removeChild(ov); if(onClose) onClose(); }
    api.Tap.bind(close, doClose);
    ov.appendChild(close);
    document.body.appendChild(ov);
    return doClose;
  }
  window.JUNBI_UI = { uid: uid, today: today, fmt: fmt, list: list, obj: obj, input: input, textarea: textarea, select: select, field: field, btn: btn, delBtn: delBtn, openOv: openOv };
})();
