/* 幼幼眠：把頁面模板（{{ }}、sc-for、sc-if）交給 React 繪製的小型執行程式 */
(function () {
  var R = window.React, h = R.createElement;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var ATTR = { 'class': 'className', 'for': 'htmlFor', maxlength: 'maxLength', inputmode: 'inputMode', tabindex: 'tabIndex', readonly: 'readOnly', onclick: 'onClick', onchange: 'onChange', oninput: 'onInput', viewbox: 'viewBox', preserveaspectratio: 'preserveAspectRatio' };
  var BOOL = { disabled: 1, checked: 1, readOnly: 1 };

  function get(vals, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, vals);
  }
  function interp(str, vals) {
    var m = str.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/);
    if (m) return get(vals, m[1]);
    return str.replace(HOLE, function (_, p) { var v = get(vals, p); return v == null ? '' : String(v); });
  }
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
  function styleObj(s) {
    var o = {};
    String(s || '').split(';').forEach(function (d) {
      var i = d.indexOf(':'); if (i < 0) return;
      var k = d.slice(0, i).trim(), v = d.slice(i + 1).trim();
      if (!k) return;
      o[k.indexOf('--') === 0 ? k : camel(k)] = v;
    });
    return o;
  }
  function kids(node, vals) {
    var src = node.content ? node.content.childNodes : node.childNodes, out = [];
    for (var i = 0; i < src.length; i++) {
      var r = build(src[i], vals, i);
      if (r == null || r === false) continue;
      if (Array.isArray(r)) { out.push.apply(out, r); continue; }
      out.push(typeof r === 'object' && !R.isValidElement(r) ? String(r) : r);
    }
    return out;
  }
  function build(node, vals, key) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      return t.indexOf('{{') < 0 ? t : interp(t, vals);
    }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = interp(node.getAttribute('list'), vals) || [], as = node.getAttribute('as');
      return list.map(function (item, i) {
        var v = Object.assign({}, vals); v[as] = item; v.$index = i;
        return h.apply(null, [R.Fragment, { key: i }].concat(kids(node, v)));
      });
    }
    if (tag === 'sc-if') {
      return interp(node.getAttribute('value'), vals) ? h.apply(null, [R.Fragment, { key: key }].concat(kids(node, vals))) : null;
    }
    var props = { key: key };
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a], n = at.name;
      if (n.indexOf('hint-') === 0) continue;
      var v = at.value.indexOf('{{') >= 0 ? interp(at.value, vals) : at.value;
      if (n === 'style') { props.style = styleObj(v); continue; }
      n = ATTR[n] || n;
      if (n.indexOf('aria-') !== 0 && n.indexOf('data-') !== 0 && n.indexOf('-') > 0) n = camel(n);
      if (BOOL[n]) v = (v === true || v === 'true' || v === '' || v === n);
      props[n] = v;
    }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if ('value' in props && props.value == null) props.value = '';
      if ('value' in props && !props.onChange) { props.defaultValue = props.value; delete props.value; }
      if ('checked' in props && !props.onChange) { props.defaultChecked = props.checked; delete props.checked; }
    }
    if (tag === 'textarea') return h(tag, props);
    return h.apply(null, [tag, props].concat(kids(node, vals)));
  }

  window.DCLogic = R.Component;
  window.DCMini = {
    mount: function (Component) {
      var tpl = document.getElementById('dc-tpl');
      class Page extends Component {
        render() { return h.apply(null, [R.Fragment, null].concat(kids(tpl, (this.renderVals && this.renderVals()) || {}))); }
      }
      ReactDOM.createRoot(document.getElementById('dc-root')).render(h(Page));
    }
  };
})();
