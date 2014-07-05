/*  Prototype JavaScript framework, version 1.6.1
 *  (c) 2005-2009 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {
  Version: '1.6.1',

  Browser: (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    return {
      IE:             !!window.attachEvent && !isOpera,
      Opera:          isOpera,
      WebKit:         ua.indexOf('AppleWebKit/') > -1,
      Gecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
      MobileSafari:   /Apple.*Mobile.*Safari/.test(ua)
    }
  })(),

  BrowserFeatures: {
    XPath: !!document.evaluate,
    SelectorsAPI: !!document.querySelector,

    /* 判断是否建立了window.Element类，建立返回true，否则返回false
    此处ElementExtensions不是函数(周围的括号不是必须的，即可以写成：ElementExtensions: (function () { ...  )！！！
    这里的函数仅仅用来根据条件参数初始化这个属性——它创建后并立即调用。
    即调用方法为：
    BrowserFeatures.ElementExtensions；
    */

    ElementExtensions: (function () {    
      var constructor = window.Element || window.HTMLElement;
      return !!(constructor && constructor.prototype);
    })(),
    SpecificElementExtensions: (function() {
      if (typeof window.HTMLDivElement !== 'undefined')
        return true;

      var div = document.createElement('div');
      var form = document.createElement('form');
      var isSupported = false;

      if (div['__proto__'] && (div['__proto__'] !== form['__proto__'])) {
        isSupported = true;
      }

      div = form = null;

      return isSupported;
    })()
  },
   //*?为非贪婪匹配，表示：
   //重复任意次，但尽可能少重复 
  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',   
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },
  K: function(x) { return x }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;


var Abstract = { };


var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

/* Based on Alex Arnell's inheritance implementation. */

var Class = (function () {
    function subclass() { };    //空类
    /*
    var PeriodicalExecuter = Class.create({
    initialize: function(callback, frequency) {
    this.callback = callback;       //这个this指代什么？？
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
    },

    registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
    },

    execute: function() {
    this.callback(this);
    },
    ...

    */
    function create() {
        var parent = null, properties = $A(arguments);      //$A:把参数转化为数组(返回副本)
        if (Object.isFunction(properties[0]))
            parent = properties.shift();
        function klass() {
        /* 如var PeriodicalExecuter = Class.create(...);
        var test = new PeriodicalExecuter("aaa");

        在该示例中：

        此处的arguments[0]即为"aaa"，
        此处this应该就是指向示例中的PeriodicalExecuter。
        */
            this.initialize.apply(this, arguments);   
        }

        Object.extend(klass, Class.Methods);    
        klass.superclass = parent;
        klass.subclasses = [];

        if (parent) {
            //使用subclass作为中间类，这样继承的话，改变klass的prototype就不会改变到parent的prototype了！
            subclass.prototype = parent.prototype;
            klass.prototype = new subclass;

            parent.subclasses.push(klass);
        }

        for (var i = 0; i < properties.length; i++)
            klass.addMethods(properties[i]);

        if (!klass.prototype.initialize)
            klass.prototype.initialize = Prototype.emptyFunction;

        klass.prototype.constructor = klass;
        return klass;
    }

    function addMethods(source) {
        var ancestor = this.superclass && this.superclass.prototype;
        var properties = Object.keys(source);

        if (!Object.keys({ toString: true }).length) {
            if (source.toString != Object.prototype.toString)
                properties.push("toString");
            if (source.valueOf != Object.prototype.valueOf)
                properties.push("valueOf");
        }

        /*
        Ajax.Request = Class.create(Ajax.Base, {
          _complete: false,

          initialize: function($super, url, options) {
            $super(options);
            this.transport = Ajax.getTransport();
            this.request(url);
          },
        */
        for (var i = 0, length = properties.length; i < length; i++) {
            var property = properties[i], value = source[property];
            if (ancestor && Object.isFunction(value) &&
          value.argumentNames().first() == "$super") {  //argumentNames为function类的扩展方法
                var method = value;
                /*  在示例中，即将options作为形参传递Ajax.Base中的initialize方法，然后将
                    Ajax.Base中的initialize方法指向Ajax.Request，然后再包装Ajax.Request中的initialize方法
                    （在示例中就是执行Ajax.Base的initialize方法,再执行
                    this.transport = Ajax.getTransport();
                    this.request(url);）
                */
                value = (function (m) {
                    return function () { return ancestor[m].apply(this, arguments); };  //此处的arguments指的是????
                    
                    /*
                    wrap示例：

                    function wrapped() { 
                    alert('wrapped'); 
                    } 
                    //可以在wrapper之前调用原函数或者之后调用，是不是有点AOP的意思了 
                    var wrapper=wrapped.wrap(function(oldFunc,param){ 
                    //oldFunc() 
                    alert(param); 
                    oldFunc(); 
                    }); 

                    wrapper("wrapper");     //wrapper,wrapped 




                        function wrap(wrapper) {   
    var __method = this;
    return function () {
    //被包装的函数当作第一个参数传入包装函数
    //this指向哪个？？？？  见下例
    var a = update([__method.bind(this)], arguments);   //[__method.bind(this)]为数组，元素为函数

    return wrapper.apply(this, a);
    }
    }
                    */
                })(property).wrap(method);

                value.valueOf = method.valueOf.bind(method);
                value.toString = method.toString.bind(method);
            }
            this.prototype[property] = value;
        }

        return this;
    }

    return {
        create: create,
        Methods: {
            addMethods: addMethods
        }
    };
})();






(function() {

  var _toString = Object.prototype.toString;

  function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
  }
  /*
将对象转换为字符串，这里能够更详细一些，只要对象自定义了inspect函数。而不是原来对象的toString总是[object]。
例如后面对数组定义了inspect函数，使得
var arr=[1,2,3];
－》arr.inspect()=="[1,2,3]";
*/

  function inspect(object) {
    try {
      if (isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  }
  function toJSON(object) {
    var type = typeof object;
    switch (type) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return object.toString();
    }

    if (object === null) return 'null';
    if (object.toJSON) return object.toJSON(); 
    if (isElement(object)) return;

    var results = [];
    for (var property in object) {
      var value = toJSON(object[property]); //递归
      if (!isUndefined(value))
        results.push(property.toJSON() + ': ' + value);
    }

    return '{' + results.join(', ') + '}';
  }

  function toQueryString(object) {
    return $H(object).toQueryString();
  }

  function toHTML(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  }

  function keys(object) {
    var results = [];
    for (var property in object)
      results.push(property);
    return results;
  }

  function values(object) {
    var results = [];
    for (var property in object)
      results.push(object[property]);
    return results;
  }

  function clone(object) {
    return extend({ }, object);
  }

  function isElement(object) {
    return !!(object && object.nodeType == 1);
  }

  function isArray(object) {
    return _toString.call(object) == "[object Array]";
  }


  function isHash(object) {
    return object instanceof Hash;
  }

  function isFunction(object) {
    return typeof object === "function";
  }

  function isString(object) {
    return _toString.call(object) == "[object String]"; //用toString.call判断类型的方法具有通用性
  }

  function isNumber(object) {
    return _toString.call(object) == "[object Number]";
  }

  function isUndefined(object) {
    return typeof object === "undefined";
  }

  extend(Object, {  //赋给object类，作为object类的静态方法
    extend:        extend,
    inspect:       inspect,
    toJSON:        toJSON,
    toQueryString: toQueryString,
    toHTML:        toHTML,
    keys:          keys,
    values:        values,
    clone:         clone,
    isElement:     isElement,
    isArray:       isArray,
    isHash:        isHash,
    isFunction:    isFunction,
    isString:      isString,
    isNumber:      isNumber,
    isUndefined:   isUndefined
  });
})();
/*






*/
Object.extend(Function.prototype, (function () {    //注意这种写法！
    /*
    调用Array的原型方法slice
    slice:
    返回一个数组的一段。arrayObj.slice(start, [end]) 参数开始索引和结束索引，结束索引可以省略 
    */
    var slice = Array.prototype.slice;    //调用array的原型方法slice

    function update(array, args) {
        var arrayLength = array.length, length = args.length;
        while (length--) array[arrayLength + length] = args[length];
        return array;
    }

    function merge(array, args) {
        /*
        Array.prototype.slice.call(arguments,0) 这句里，就是把 arguments 当做当前对象 
        ﻿也就是说 要调用的是 arguments 的slice 方法，后面的 参数 0 也就成了 slice 的第一个参数slice(0)就是获取所有 

        为什么要这么调用 arguments 的slice 方法呢？就是因为 arguments 不是真的组数，


        //typeof arguments==="Object" 而不是 "Array"   //这种说法错误，就算arguments是数组，typeof arguments也为object

        它没有slice这个方法，通过这么Array.prototype.slice.call调用，JS的内部机制应该是 把arguments对象转化为Array 

        因为Array.prototype.slice.call调用后，返回的是一个组数 


        */
        _array = slice.call(array, 0);   //将array转化为数组   Array.prototype.slice返回的是副本，即此处改变_array不会影响到array
        return update(_array, args);
    }

    function argumentNames() {
        var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]    //this是指向调用该方法的function
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
        return names.length == 1 && !names[0] ? [] : names;
    }
    /*
    bind方法使用实例：
    Examples
    The code below is simply proof-of-concept:


    var obj = {
    name: 'A nice demo',
    fx: function() {
    alert(this.name);
    }
    };
    window.name = 'I am such a beautiful window!';
    function runFx(f) {
    f();
    }
    var fx2 = obj.fx.bind(obj);
    runFx(obj.fx);  //输出'I am such a beautiful window!'
    runFx(fx2); //输出'A nice demo'
 
    Now, what few people realize is, bind can also be used to prepend arguments to the final argument list:


    var obj = {
    name: 'A nice demo',
    fx: function() {
    alert(this.name + '\n' + $A(arguments).join(', '));
    }
    };
    var fx2 = obj.fx.bind(obj, 1, 2, 3);
    fx2(4, 5); // Alerts the proper name, then "1, 2, 3, 4, 5"
    */
    function bind(context) {
        if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
        var __method = this;    //this指向function,即指向调用bind方法的函数
         args = slice.call(arguments, 1);   //此处的arguments为bind函数的参数数组
        return function () {
            var a = merge(args, arguments);   //此处的arguments为闭包函数的参数数组，如上例中的fx2(4, 5)的4和5
            return __method.apply(context, a);    //此处用了return， 即返回了调用bind方法的函数。其中该函数指向context,参数为a
        }
    }

    function bindAsEventListener(context) { //将event对象传递给调用bindAsEventListener的函数
        var __method = this, args = slice.call(arguments, 1);
        return function (event) {
            var a = update([event || window.event], args);
            return __method.apply(context, a);
        }
    }
    /*
    String.prototype.splitOnSpaces = String.prototype.split.curry(" ");
    "foo bar baz thud".splitOnSpaces(); //-> ["foo", "bar", "baz", "thud"]
    .*/
    function curry() {
    if (!arguments.length) return this;
    var __method = this, args = slice.call(arguments, 0);
    return function () {
    var a = merge(args, arguments);
    return __method.apply(this, a); //此处this指向示例中的String.prototype.splitOnSpaces
    }
    }
    /* 基本就是window.setTimeout的简单封装，时间单位为秒 */
    function delay(timeout) {
    var __method = this, args = slice.call(arguments, 1);
    timeout = timeout * 1000    //将延时时间单位从ms转化为s
    return window.setTimeout(function () {
    return __method.apply(__method, args);  
    }, timeout);
}

    //相当于delay(0.01) 

    //defer最后指向this，而delay指向__method，两者指向不同！所以两个函数不同吧！！！
    //所以上面的说法错误！！??
    function defer() {  //timeout赋值为0.01
    var args = update([0.01], arguments);
    return this.delay.apply(this, args);
    }



    /*
    function wrapped() { 
    alert('wrapped'); 
    } 
    //可以在wrapper之前调用原函数或者之后调用，是不是有点AOP的意思了 
    var wrapper=wrapped.wrap(function(oldFunc,param){ 
    //oldFunc() 
    alert(param); 
    oldFunc(); 
    }); 

    wrapper("wrapper");     //wrapper,wrapped 

    */

    function wrap(wrapper) {   
    var __method = this;
    return function () {
    //被包装的函数当作第一个参数传入包装函数
    //this指向哪个？？？？  见下例
    var a = update([__method.bind(this)], arguments);   //[__method.bind(this)]为数组，元素为函数

    return wrapper.apply(this, a);
    }
    }


    /*
    这个方法先检查将要被methodize的方法是否已经methodize过了，通过内部的变量this._methodized做检查， 
    最后methodize函数返回的其实就是this._methodized。 
    这句话：var a = update([this], arguments);是关键，可以看出把this当成第一个参数传到这个原始函数中了。
    详细出处参考：http://www.jb51.net/article/19092.htm
    */

    /*
    var fn = function(target, foo) { target.value = foo; }; var object = {}; 
    // 原始的方法 
    fn(object, 'bar'); 
    object.value //-> 'bar' 
    //调用methodize之后，可以看出fn函数第一个参数target变成了object 
    object.fnMethodized = fn.methodize(); 
    object.fnMethodized('boom!'); 
    object.value //-> 'boom!' 

    详细出处参考：http://www.jb51.net/article/19092.htm
    */
    function methodize() {
        if (this._methodized) return this._methodized;
        var __method = this;
        return this._methodized = function () {
            var a = update([this], arguments);  //this指向示例中的object.fnMethodized
            return __method.apply(null, a);
        };
    }

    return {
        argumentNames: argumentNames,
        bind: bind,
        bindAsEventListener: bindAsEventListener,
        curry: curry,
        delay: delay,
        defer: defer,
        wrap: wrap,
        methodize: methodize
    }
})());
/*














*/







Date.prototype.toJSON = function() {
  return '"' + this.getUTCFullYear() + '-' +
    (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
    this.getUTCDate().toPaddedString(2) + 'T' +
    this.getUTCHours().toPaddedString(2) + ':' +
    this.getUTCMinutes().toPaddedString(2) + ':' +
    this.getUTCSeconds().toPaddedString(2) + 'Z"';
};


RegExp.prototype.match = RegExp.prototype.test;

/*就一个escape方法，就是把那几个特殊字符转义一下。 
还有就是match方法是test方法的别名。 
看一个例子: 
var str=RegExp.escape("+.[]$://!"); 
document.writeln(str) //==> "\+\.\[\]\$\:\/\/\!"

*/
RegExp.escape = function(str) {
return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1'); //??
};

/*这个对象提供一定间隔时间上重复调用一个方法的逻辑。
callback  Function()  被调用的方法，该方法不会被传入参数。 
frequency  Number  以秒为单位的间隔。 
currentlyExecuting  Boolean  表示这个方法是否正在执行 



实例：
<div id="time"></div>   
<script>   
var i = 0;    
var p = new PeriodicalExecuter(showTime,0.1); //创建实例。每0.1秒调用一次showTime方法    
function showTime(){    
$('time').innerHTML=new Date().toString();    
++i;    
if(i>100){    
p.stop(); //停止    
}    
}       
</script>   
 


*/
var PeriodicalExecuter = Class.create({
initialize: function(callback, frequency) {
this.callback = callback;
this.frequency = frequency;
this.currentlyExecuting = false;

this.registerCallback();
},

registerCallback: function() {
this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
},

execute: function() {
this.callback(this);
},

stop: function() {
if (!this.timer) return;
clearInterval(this.timer);
this.timer = null;  //引用置为空，便于cg回收
},

onTimerEvent: function() {
if (!this.currentlyExecuting) {
try {
this.currentlyExecuting = true;
this.execute();
this.currentlyExecuting = false;
} catch(e) {
this.currentlyExecuting = false;
throw e;
}
}
}
});
Object.extend(String, {
interpret: function(value) {
return value == null ? '' : String(value);
},
specialChar: {
'\b': '\\b',
'\t': '\\t',
'\n': '\\n',
'\f': '\\f',
'\r': '\\r',
'\\': '\\\\'
}
});
/*














*/

Object.extend(String.prototype, (function () {
    /*

    var Template = Class.create({
    initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
    },

    evaluate: function(object) {
    if (object && Object.isFunction(object.toTemplateReplacements))
    object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
    if (object == null) return (match[1] + '');

    var before = match[1] || '';
    if (before == '\\') return match[2];

    var ctx = object, expr = match[3];
    var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
    match = pattern.exec(expr);
    if (match == null) return before;

    while (match != null) {
    var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
    ctx = ctx[comp];
    if (null == ctx || '' == match[3]) break;
    expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
    match = pattern.exec(expr);
    }

    return before + String.interpret(ctx);
    });
    }
    });
    Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;
    */
    function prepareReplacement(replacement) {
        if (Object.isFunction(replacement)) return replacement;
        var template = new Template(replacement);
        return function (match) { return template.evaluate(match) };
    }
    /*
    var source = this;
    source = source.slice(5);
    如果gsub中包含此代码，并不会改变this，也就是说原字符串不会改变！


    这个函数不仅可以按照的正则表达式全部替换,而且...
    */
    function gsub(pattern, replacement) {
        var result = '', source = this, match;
        replacement = prepareReplacement(replacement);

        if (Object.isString(pattern))
            pattern = RegExp.escape(pattern);   //转义用于正则表达式的特殊字符

        if (!(pattern.length || pattern.source)) {  //如果匹配字符为空或??
            replacement = replacement('');    //如果replacement为函数，则传入空形参，并执行函数；如果replacement为string，则消去其中的#...之类的模版

            return replacement + source.split('').join(replacement) + replacement;
        }

        //按照replacement全部替换source，实现了replace方法,并不会改变原字符串
        while (source.length > 0) {
        /*执行match = source.match(pattern)，并判断match是否为null（为null则为false，否则为true）

        此处match难道是test方法？？？（RegExp.prototype.match = RegExp.prototype.test;）
        */
            if (match = source.match(pattern)) {  
                result += source.slice(0, match.index);
                /*如果replacement为function，则match（匹配结果数值）为形参传入，
                并执行该function
                */
                result += String.interpret(replacement(match));
                source = source.slice(match.index + match[0].length);
            } else {
                result += source, source = '';
            }
        }

        return result;
    }


    /*
    var fruits = 'apple pear orange';
    fruits.sub(' ', ', ');
    // -> 'apple, pear orange'
    fruits.sub(' ', ', ', 2);
    // -> 'apple, pear, orange'
    */
    function sub(pattern, replacement, count) {
    replacement = prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    //会循环执行：在(gsub)while (source.length > 0) 中会循环执行replacement(match)
    return this.gsub(pattern, function (match) {
    if (--count < 0) return match[0];
    return replacement(match);
    });
    }

    function scan(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
    }
    /*













    */
    /*将长字符串截成length-suffix.length,并在字符串末尾添上suffix,长度不够不变换*/
    function truncate(length, truncation) {
        length = length || 30;
        truncation = Object.isUndefined(truncation) ? '...' : truncation;
        return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
    }

    function strip() {
        return this.replace(/^\s+/, '').replace(/\s+$/, '');    //去掉开头和结尾的空格
    }

    function stripTags() {  //去除HTML标签(包括script标签,但是会执行Javascript??)
        return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
    }

    function stripScripts() {   //去除Javascript
        return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
    }

    function extractScripts() { //提取Javascript
        var matchAll = new RegExp(Prototype.ScriptFragment, 'img');
        var matchOne = new RegExp(Prototype.ScriptFragment, 'im');
        return (this.match(matchAll) || []).map(function (scriptTag) {  //map:数组继承集合类的方法
            return (scriptTag.match(matchOne) || ['', ''])[1];
        });
    }

    function evalScripts() {    //提取并执行Javascript
        return this.extractScripts().map(function (script) { return eval(script) });
    }

    function escapeHTML() { //将HTML标签字符转化为可以显示的字符
        return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function unescapeHTML() {
        return this.stripTags().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    }

    /*将形似"opt1=value1&opt2=value2"的字符串转化为Json
    
    示例：
    'section=blog&id=45'.toQueryParams();
    //->{section:'blog',id:'45'}

    'section=blog;id=45'.toQueryParams();
    //->{section:'blog',id:'45'}

    'section=blog&tag=javascript&tag=prototype&tag=doc'.toQueryParams()
    //->{section:'blog',tag:['javascript','prototype','doc']}

    'tag=ruby on rails'.toQueryParams();
    //->{tag:'ruby%20on%20rails'}  还可以编码 
    */
    function toQueryParams(separator) {
        var match = this.strip().match(/([^?#]*)(#.*)?$/);
        if (!match) return {};
        /*
        function inject(memo, iterator, context) {
        this.each(function(value, index) {
        memo = iterator.call(context, memo, value, index);
        });
        return memo;
        }
        */
        return match[1].split(separator || '&').inject({}, function (hash, pair) {  //inject为集合类的方法
            if ((pair = pair.split('='))[0]) {
                var key = decodeURIComponent(pair.shift());
                var value = pair.length > 1 ? pair.join('=') : pair[0];
                if (value != undefined) value = decodeURIComponent(value);

                if (key in hash) {  //如果有重复的参数，如：tag=javascript&tag=prototype&tag=doc'
                //注意转化为数组的方式！！！
                    if (!Object.isArray(hash[key])) hash[key] = [hash[key]];    //如果hash[key]不是数组，则转化为数组
                    hash[key].push(value);
                }
                else hash[key] = value;
            }
            return hash;
        });
    }
    /*转换成Array
    注意split('')
    */
    function toArray() {
        return this.split('');
    }
    //最后一个字符的ASCII自增
    function succ() {
        return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
    }

    /*
    将字符重复count次

    示例：
    var str = "0".times(2);
    alert(str); / -> "00"
    */
    function times(count) { 
        return count < 1 ? '' : new Array(count + 1).join(this);    //注意此处的写法！！利用数组和join！
    }

    //运用在Selector中,将一些Css属性和其他的特殊字符串转化成一个统一的格式
    function camelize() {
        var parts = this.split('-'), len = parts.length;
        if (len == 1) return parts[0];

        var camelized = this.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

        for (var i = 1; i < len; i++)
            camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

        return camelized;
    }

    function capitalize() {
        return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
    }

    //与camlize()功能相反
    function underscore() {
        return this.replace(/::/g, '/')
               .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')   //$1为第一个子匹配，$2为第二个子匹配
               .replace(/([a-z\d])([A-Z])/g, '$1_$2')
               .replace(/-/g, '_')
               .toLowerCase();
    }
    function dasherize() {
        return this.replace(/_/g, '-');
    }

    function inspect(useDoubleQuotes) {
        var escapedString = this.replace(/[\x00-\x1f\\]/g, function (character) {
            if (character in String.specialChar) {  //如果为特殊字符
                return String.specialChar[character];
            }
            return '\\u00' + character.charCodeAt().toPaddedString(2, 16);
        });
        if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
        return "'" + escapedString.replace(/'/g, '\\\'') + "'";
    }

    function toJSON() { //返回json格式数据？this.inspect(true)能返回json？
        return this.inspect(true);
    }

    function unfilterJSON(filter) {
        return this.replace(filter || Prototype.JSONFilter, '$1');
    }

    function isJSON() {
        var str = this;
        if (str.blank()) return false;  //开头为空格
        str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
        return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
    }

    function evalJSON(sanitize) {
        var json = this.unfilterJSON();
        try {
            if (!sanitize || json.isJSON()) return eval('(' + json + ')');
        } catch (e) { }
        throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
    }

    function include(pattern) {
        return this.indexOf(pattern) > -1;
    }

    function startsWith(pattern) {
        /*
        1、对于string,number等基础类型，==和===是有区别的 
        1）不同类型间比较，==之比较“转化成同一类型后的值”看“值”是否相等，===如果类型不同，其结果就是不等
        2）同类型比较，直接进行“值”比较，两者结果一样


        2、对于Array,Object等高级类型，==和===是没有区别的
        进行“指针地址”比较


        3、基础类型与高级类型，==和===是有区别的
        1）对于==，将高级转化为基础类型，进行“值”比较
        2）因为类型不同，===结果为false
        */
        return this.indexOf(pattern) === 0;
    }

    function endsWith(pattern) {
        var d = this.length - pattern.length;
        return d >= 0 && this.lastIndexOf(pattern) === d;   //lastIndexOf为string类自带的方法
    }

    function empty() {
        return this == '';
    }

    function blank() {
        return /^\s*$/.test(this);
    }

    function interpolate(object, pattern) {
        return new Template(this, pattern).evaluate(object);
    }

    return {
        gsub: gsub,
        sub: sub,
        scan: scan,
        truncate: truncate,
        strip: String.prototype.trim ? String.prototype.trim : strip,
        stripTags: stripTags,
        stripScripts: stripScripts,
        extractScripts: extractScripts,
        evalScripts: evalScripts,
        escapeHTML: escapeHTML,
        unescapeHTML: unescapeHTML,
        toQueryParams: toQueryParams,
        parseQuery: toQueryParams,
        toArray: toArray,
        succ: succ,
        times: times,
        camelize: camelize,
        capitalize: capitalize,
        underscore: underscore,
        dasherize: dasherize,
        inspect: inspect,
        toJSON: toJSON,
        unfilterJSON: unfilterJSON,
        isJSON: isJSON,
        evalJSON: evalJSON,
        include: include,
        startsWith: startsWith,
        endsWith: endsWith,
        empty: empty,
        blank: blank,
        interpolate: interpolate
    };
})());

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (object && Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements(); //toObject

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return (match[1] + '');

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3];
      var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;  
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }
      
      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

/*这个版本没有$continue异常

定义了异常对象，主要用于迭代控制
如果抛出$break异常，则不再继续迭代
*/
var $break = { };

var Enumerable = (function () {
    /*
    each(iterator)->Enumerable:Enumerable的基础 ,iterator有两个参数(value.index) 

    ["First","Second","Third"].each(function(str,index){alert(index+":"+str);})

    在each方法中可以抛出两种异常,$continue,$break
    var result=[];
    $R(1,10).each(function(n){
    if(0==n%2)
    throw $continue;
    if(n>6)
    throw $break;
    result.push(n);
    });
    //result->[1,3,5]


    each与_each的区别
    each(value,index)在运行时调用_each(iterator),iterator是每次迭代是调用的函数(见上面的实现) 
    在each中可以使用$continue,$break 

    */
    function each(iterator, context) {
        var index = 0;
        try {
            /*此处_each函数在子类中具体实现
            有点像模版模式


            _each的实现如：


            Array.from = $A;


            (function() {
            var arrayProto = Array.prototype,
            slice = arrayProto.slice,
            _each = arrayProto.forEach; // use native browser JS 1.6 implementation if available

            function each(iterator) {
            for (var i = 0, length = this.length; i < length; i++)
            iterator(this[i]);
            }
            if (!_each) _each = each; //如果_each不存在，则使用each函数来实现_each
            */
            this._each(function (value) {
                /*如果context为undefine，则表示将value和index(然后自加)作为参数赋给iterator，然后执行iterator

                此处可以抛出$break异常，如：
                this.each(function(value, index) {
                if (result = !!iterator.call(context, value, index))
                throw $break;
                });
                */
                iterator.call(context, value, index++);
            });
        } catch (e) {
            if (e != $break) throw e; //如果抛出$break，则跳出each循环，继续执行下面的代码；如果抛出的是其它异常，则跳出each循环，并向外抛出异常
        }
        return this;
    }
    /*













    */

    /*
    var students = [
    { name: 'Sunny', age: 20 },
    { name: 'Audrey', age: 21 },
    { name: 'Matt', age: 20 },
    { name: 'Amelie', age: 26 },
    { name: 'Will', age: 21 }
    ];
    students.eachSlice(3, function(student) {
    return student.name;
    });
    // -> [['Sunny', 'Audrey', 'Matt'], ['Amelie', 'Will']]

    */
    function eachSlice(number, iterator, context) {
        /*
        function toArray() {
        return this.map();
        }
        */
        var index = -number, slices = [], array = this.toArray();
        if (number < 1) return array;
        while ((index += number) < array.length)
            slices.push(array.slice(index, index + number));
            /*
            示例中：
            [{ name: 'Sunny', age: 20 },{ name: 'Audrey', age: 21 },{ name: 'Matt', age: 20 }].name
            这个会报错啊！！所以有问题！！！！
            */
        return slices.collect(iterator, context);   
    }

    /*在最后一块插入fillWith
    如：
    var students = [
    { name: 'Sunny',  age: 20 },
    { name: 'Audrey', age: 21 },
    { name: 'Matt',   age: 20 },
    { name: 'Amelie', age: 26 },
    { name: 'Will',   age: 21 }
    ];
    students.inGroupsOf(2, { name: '', age: 0 });
    // -> [
    //      [{ name: 'Sunny', age: 20 }, { name: 'Audrey', age: 21 }],
    //      [{ name: 'Matt', age: 20 },  { name: 'Amelie', age: 26 }],
    //      [{ name: 'Will', age: 21 },  { name: '', age: 0 }]
    //    ]
    
    */
    function inGroupsOf(number, fillWith) {
        fillWith = Object.isUndefined(fillWith) ? null : fillWith;
        return this.eachSlice(number, function (slice) { //eachSlice中的collect为迭代循环
            while (slice.length < number) slice.push(fillWith);    //找到一块长度小于number（即如果最后一块未填满，则为最后一块），插入fillWith
            return slice;
        });
    }



    /*all([iterator=Prototype.K])->Boolean:判断元素是否至少有一个元素迭代等于false
    */
    function all(iterator, context) {
        iterator = iterator || Prototype.K;
        var result = true;
        this.each(function (value, index) {

            /*此句相当于：
            result = (result && !!iterator.call(context, value, index)); 
            */
            result = result && !!iterator.call(context, value, index);


            /*
            throw(exception) 



            exception 可以是字符串、整数、逻辑值或者对象。


            注意！可以抛出一个对象，然后在catch中捕捉到！
            如：
            catch (e) {
            if (e != $break) throw e;
            }

            其中$break为空对象{ }.
            */
            if (!result) throw $break;    //跳出each循环
        });
        return result;
    }

    function any(iterator, context) {
        iterator = iterator || Prototype.K;
        var result = false;
        this.each(function (value, index) {
            if (result = !!iterator.call(context, value, index))  //注意！用了"!!"后，就不用"=="判断了，而用"="！
                throw $break;
        });
        return result;
    }
    /*返回所有枚举元素通过迭代器执行的结果，作为数组返回

    Prototype.K(argument) → argument
    Prototype.K：返回argument。
    示例：
    Prototype.K('hello world!');
    // -> 'hello world!'
    Prototype.K(200);
    // -> 200
    Prototype.K(Prototype.K);
    // -> Prototype.K
    */
    //[
    //      [{ name: 'Sunny', age: 20 }, { name: 'Audrey', age: 21 }],
    //      [{ name: 'Matt', age: 20 },  { name: 'Amelie', age: 26 }],
    //      [{ name: 'Will', age: 21 },  { name: '', age: 0 }]
    //    ]
    function collect(iterator, context) {
        iterator = iterator || Prototype.K;
        var results = [];
        this.each(function (value, index) {
            results.push(iterator.call(context, value, index));
        });
        return results;
    }
    //判断是否有元素等于true,若有返回头一个元素.无则返回undefined
    function detect(iterator, context) {
        var result;
        this.each(function (value, index) {
            if (iterator.call(context, value, index)) {
                result = value;
                throw $break;
            }
        });
        return result;
    }

    function findAll(iterator, context) {
        var results = [];
        this.each(function (value, index) {
            if (iterator.call(context, value, index))
                results.push(value);
        });
        return results;
    }

    function grep(filter, iterator, context) {
        iterator = iterator || Prototype.K;
        var results = [];

        if (Object.isString(filter))
            filter = new RegExp(RegExp.escape(filter));
        this.each(function (value, index) {
            if (filter.match(value))  //match为test方法？？
                results.push(iterator.call(context, value, index));
        });
        return results;
    }

    function include(object) {
        if (Object.isFunction(this.indexOf))    //注意此处if (this.indexOf(object) != -1) return true;为一个语句！即属于if (Object.isFunction(this.indexOf))的范围内
            if (this.indexOf(object) != -1) return true;

        var found = false;
        this.each(function (value) {
            if (value == object) {
                found = true;
                throw $break;
            }
        });
        return found;
    }

    /*
    累积结果存放的数组,与accumulatedValue相同;
    iterator含三个参数(accumulateArray,value,index).该方法避免了复制大容量的数组

    示例：
  
    ['hello','world','this','is','nice'].inject([],function(array,value,index){
    if(0==index%2)
    array.push(value);
    return array;
    })
    //->['hello','this','nice']
    */
    function inject(memo, iterator, context) {
        this.each(function (value, index) {
            memo = iterator.call(context, memo, value, index);  //直接改变了形参memo（因为传递的是地址，所以memo本身被改变了）
        });
        return memo;
    }
    /*
    性能很高的调用方法,返回每次迭代的结果的数组
    method为方法名
    示例：
    ['hello','world','cool!'].invoke('toUpperCase')//->['HELLO','WORLD','COOL!']

    ['hello','world','cool!'].invoke('substring',0,3)//=>['hel','wor','coo']

    $('navBar','adsBar','footer').invoke('hide')

    */
    function invoke(method) {
        var args = $A(arguments).slice(1);  //取出方法参数
        return this.map(function (value) {   //map是collect的别名
            /* 对于value[method]我的理解：
            在示例：
            ['hello','world','cool!'].invoke('toUpperCase')
            中，第一个value为'hellp',method为'toUpperCase'，
            因为'hellp'为string对象，所以可以用'hellp'['toUpperCase']访问string对象的toUpperCase属性（此处toUpperCase为function）！
            */
            return value[method].apply(value, args);
        });
    }

    function max(iterator, context) {
        iterator = iterator || Prototype.K;
        var result;
        this.each(function (value, index) {
            value = iterator.call(context, value, index);
            if (result == null || value >= result)
                result = value;
        });
        return result;
    }

    function min(iterator, context) {
        iterator = iterator || Prototype.K;
        var result;
        this.each(function (value, index) {
            value = iterator.call(context, value, index);
            if (result == null || value < result)
                result = value;
        });
        return result;
    }
    /*
    将每次迭代返回的结果数组按等于true/false分开成两个数组,并返回
    */
    function partition(iterator, context) {
        iterator = iterator || Prototype.K;
        var trues = [], falses = [];
        this.each(function (value, index) {
            (iterator.call(context, value, index) ?
        trues : falses).push(value);    //注意这种写法！js太灵活了！
        });
        return [trues, falses]; //返回一个嵌套数组，即多维数组
    }
    /*获取每个元素的同一属性值的数组
    ['hello','world','this','is','nice'].pluck('length')
    //->[5,5,4,3,4]

    此处value[property]的property也是String对象（也可以为其它对象，具体见sortBy函数的分析）的属性，
    不过它不是function，而是变量
    */
    function pluck(property) {
        var results = [];
        this.each(function (value) {
            results.push(value[property]);
        });
        return results;
    }

    function reject(iterator, context) {
        var results = [];
        this.each(function (value, index) {
            if (!iterator.call(context, value, index))
                results.push(value);
        });
        return results;
    }
    /*
    ['hello','world','this','is','nice'].sortBy(function(s){returns.length;})
    //->'is','this','nice','hello','world']

    */
    function sortBy(iterator, context) {
        return this.map(function (value, index) {
            return {
                value: value,
                criteria: iterator.call(context, value, index)
            };
        }).sort(function (left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;    //注意这种写法！！   此处为升序排列
            /*
            获取每个元素的value属性值的数组，即前面
            return {
            value: value,
            criteria: iterator.call(context, value, index)
            };
            中的value，即示例中的'hello'等
            */
        }).pluck('value');
    }

    function toArray() {
        return this.map();
    }

    function zip() {  //?
        var iterator = Prototype.K, args = $A(arguments);
        if (Object.isFunction(args.last())) //last为array扩展方法
        //pop() 方法将删除 arrayObject 的最后一个元素，把数组长度减 1，并且返回它删除的元素的值。
        //如果数组已经为空，则 pop() 不改变数组，并返回 undefined 值。
            iterator = args.pop();


        var collections = [this].concat(args).map($A);  //??
        return this.map(function (value, index) {
            return iterator(collections.pluck(index));
        });
    }

    function size() {
        return this.toArray().length;
    }
    /*
    这实际上这是一个待实现的抽象方法，在Array对象中有对其进行的重定义
    所以将this转换为数组（toArray()），再调用inspect。
    对于非数组形式的枚举对象，则会加上'#<Enumerable:....>'这样的形式



    this.toArray().inspect():调用array的inspect方法
    */

    function inspect() {
        return '#<Enumerable:' + this.toArray().inspect() + '>';
    }

    return {
        each: each,
        eachSlice: eachSlice,
        all: all,
        every: all,
        any: any,
        some: any,
        collect: collect,
        map: collect,
        detect: detect,
        findAll: findAll,
        select: findAll,
        filter: findAll,
        grep: grep,
        include: include,
        member: include,
        inGroupsOf: inGroupsOf,
        inject: inject,
        invoke: invoke,
        max: max,
        min: min,
        partition: partition,
        pluck: pluck,
        reject: reject,
        sortBy: sortBy,
        toArray: toArray,
        entries: toArray,
        zip: zip,
        size: size,
        inspect: inspect,
        find: detect
    };
})();

function $A(iterable) {
    if (!iterable) return [];
    //if ('toArray' in Object(iterable))相当于if (iterable.toArray)
  if ('toArray' in Object(iterable)) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];  //为什么要倒序赋值？？？   因为向下数到0，通常更快。因为和0做比较要比和数组长度或是其他不是0的东西作比较更有效率

  return results;
}
/*
$w('apples bananas kiwis')
// -> ['apples', 'bananas', 'kiwis']
*/
function $w(string) {
  if (!Object.isString(string)) return [];  //如果不是string对象，则返回空数组
  string = string.strip();  //去除左边和右边的空格
  return string ? string.split(/\s+/) : [];
}

Array.from = $A;
/*












*/

(function() {
  var arrayProto = Array.prototype,
      slice = arrayProto.slice,
      _each = arrayProto.forEach; // use native browser JS 1.6 implementation if available

  function each(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  }
  if (!_each) _each = each; //如果_each不存在，则使用each函数来实现_each

  function clear() {
    this.length = 0;
    return this;
  }

  function first() {
    return this[0];
  }

  function last() {
    return this[this.length - 1];
  }
  /*
用于删除一个数组中的未定义值和null值
这里的select是从Emurable中继承的方法，而select又是findAll函数的别名
*/

  function compact() {
    return this.select(function(value) {
      return value != null;
    });
  }
  /*
将一个枚举对象中的所有数组元素全部展开，最后返回一个数组，是一个递归的过程

['frank',['bob','lisa'],['jill',['tom','sally']]].flatten()
//->['frank','bob','lisa','jill','tom','sally'] 将多维数组转化为一维数组 


*/

  function flatten() {
    return this.inject([], function(array, value) {
      if (Object.isArray(value))
        return array.concat(value.flatten());   //递归
      array.push(value);
      return array;
    });
  }

  function without() {
    var values = slice.call(arguments, 0);
    return this.select(function(value) {
      return !values.include(value);
    });
  }

  function reverse(inline) {
   //!== 和 === 这两个操作符将检查变量的精确值（比如null）
   /*
   if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;
   // _reverse并没有实现啊！！


      if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;


     _reverse就是array自带的reverse方法
    */
    return (inline !== false ? this : this.toArray())._reverse();  
  }
  /*
  var myGuys=guys.uniq();// myGuys->['Sam','Justin','Andrew','Dan','sam',''] 去除相同元素,区分大小写 
*/
  function uniq(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))   //注意！0 == index 此处为反起写！     为什么要反起写？？
        array.push(value);
      return array;
    });
  }
  //返回两个数组共同的元素
  function intersect(array) {
    return this.uniq().findAll(function(item) {
    //detect:判断是否有元素等于true,若有返回头一个元素.无则返回undefined
      return array.detect(function(value) { return item === value });
    });
  }


  function clone() {
    return slice.call(this, 0);
  }

  function size() {
    return this.length;
  }
  
  function inspect() {
  /*
      Object.inspect静态方法作迭代函数，用于返回String(this)，
      即this.map(Object.inspect)的作用为将数组的每个元素转换为字符串
  */
    return '[' + this.map(Object.inspect).join(', ') + ']'; 
  }

  function toJSON() {
    var results = [];
    this.each(function(object) {
      var value = Object.toJSON(object);    //调用object类的toJSON静态方法
      if (!Object.isUndefined(value)) results.push(value);
    });
    return '[' + results.join(', ') + ']';
  }

  function indexOf(item, i) {   //i为起始判断位置，从该位置i开始判断以后的元素是否存在item并取出其位置
    i || (i = 0);   //i默认值为0
    var length = this.length;
    if (i < 0) i = length + i;  //i为负数表示从倒数第i个开始判断
    for (; i < length; i++)
      if (this[i] === item) return i;
    return -1;
  }

  function lastIndexOf(item, i) {
    i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
    var n = this.slice(0, i).reverse().indexOf(item);
    return (n < 0) ? n : i - n - 1;
  }

  function concat() {   
    var array = slice.call(this, 0), item;  //array为调用concat方法的数组的备份
    for (var i = 0, length = arguments.length; i < length; i++) {
      item = arguments[i];
      if (Object.isArray(item) && !('callee' in item)) {
        for (var j = 0, arrayLength = item.length; j < arrayLength; j++)
          array.push(item[j]);
      } else {
        array.push(item);
      }
    }
    return array;
  }

  Object.extend(arrayProto, Enumerable);    //Array类继承Enumerable类

  if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;

  Object.extend(arrayProto, {
    _each:     _each,
    clear:     clear,
    first:     first,
    last:      last,
    compact:   compact,
    flatten:   flatten,
    without:   without,
    reverse:   reverse,
    uniq:      uniq,
    intersect: intersect,
    clone:     clone,
    toArray:   clone,
    size:      size,
    inspect:   inspect,
    toJSON:    toJSON
  });
  /*












  */
  var CONCAT_ARGUMENTS_BUGGY = (function() {
    return [].concat(arguments)[0][0] !== 1;    //[].concat(arguments) 应该是一维数组啊，为什么[].concat(arguments)[0][0]？？？
  })(1,2)

  if (CONCAT_ARGUMENTS_BUGGY) arrayProto.concat = concat;

  /*
  indexOf和lastIndexOf不覆盖原有同名的方法
  */
  if (!arrayProto.indexOf) arrayProto.indexOf = indexOf;    
  if (!arrayProto.lastIndexOf) arrayProto.lastIndexOf = lastIndexOf;
})();


function $H(object) {
  return new Hash(object);
};

/*
Hash是提供key/value的检索方式的容器.Prototype中的Hash是可以与Json相互转化的

示例：
var h=new Hash({name:'Prototype',version:1.5});//两种方法创建Hash 

//alert(h["version"]); //output "1.5final" 


为什么能h["version"]？？？？

*/
var Hash = Class.create(Enumerable, (function() {   //创建Hash类，父类为Enumerable类
  function initialize(object) {
    this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);    //_object应该为Hash类的局部变量
  }
  /*
  function each(iterator, context) {
        var index = 0;
        try {
   
            this._each(function (value) {

                iterator.call(context, value, index++);
            });
        } catch (e) {
            if (e != $break) throw e; //如果抛出$break，则跳出each循环，继续执行下面的代码；如果抛出的是其它异常，则跳出each循环，并向外抛出异常
        }
        return this;
    }*/
    /*
实现可枚举接口。
对hash对象中的每个元素进行迭代操作，迭代器被认为接收一个数组参数，数组的第一个元素是key，第二个元素是value
同时，此数组对象还增加了两个属性key和value。分表表示键和值。
*/

  function _each(iterator) {    //实现_each方法
    for (var key in this._object) {
      var value = this._object[key], pair = [key, value];
      pair.key = key;
      pair.value = value;
      iterator(pair);
    }
  }

  function set(key, value) {
    return this._object[key] = value;
  }

  function get(key) {
  //如果对应key的value不是object类的原型方法，则返回value。
  //对string、array等类扩展的方法，是不是也是object类的方法？？？？
    if (this._object[key] !== Object.prototype[key])    
      return this._object[key];
  }

  function unset(key) {
    var value = this._object[key];
    delete this._object[key];
    return value;
  }

  function toObject() {
    return Object.clone(this._object);
  }

  function keys() {
    return this.pluck('key');
  }

  function values() {
    return this.pluck('value');
  }

  function index(value) {
  //detect:判断是否有元素等于true,若有返回头一个元素.无则返回undefined
    var match = this.detect(function(pair) {
      return pair.value === value;
    });
    return match && match.key;  //返回对应value的key
  }

  function merge(object) {
    return this.clone().update(object);
  }
  /*
  function clone() {
    return new Hash(this);
  }
  */
  /*
  function inject(memo, iterator, context) {
        this.each(function (value, index) {
            memo = iterator.call(context, memo, value, index);
        });
        return memo;
    }
    */
  function update(object) {
    return new Hash(object).inject(this, function(result, pair) {   //inject方法不仅仅是用于数组
      result.set(pair.key, pair.value);
      return result;
    });
  }

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value));
  }
  /*
将hash对象转换为查询字符串表示的形式

旧版本：

  toQueryString: function() {
    return this.map(function(pair) {    //map返回一个数组
      return pair.map(encodeURIComponent).join('=');    //将pair的key和value编码。 注意！此处传入的是js自带函数encodeURIComponent
    }).join('&');
  },


  旧版本好理解点 - -
  */

  /*
  function curry() {
        if (!arguments.length) return this;
        var __method = this, args = slice.call(arguments, 0);
        return function () {
            var a = merge(args, arguments);
            return __method.apply(this, a);
        }
    }
    */
  function toQueryString() {   
    return this.inject([], function(results, pair) {
      var key = encodeURIComponent(pair.key), values = pair.value;
      
      if (values && typeof values == 'object') {
          if (Object.isArray(values))
          //toQueryPair.curry(key)???  toQueryPair又不是类？curry为toQueryPair又不是类的静态方法？？

          //curry为Function类的扩展方法，toQueryPair是function
          //values.map(toQueryPair.curry(key))的意思是将values(数组)中的value赋给toQueryPair.curry(key)，
          //所以这句话相当于对values中的每个value调用toQueryPair(key,value)方法，
          //其中，key为encodeURIComponent(pair.key)，value为values中的value。
          return results.concat(values.map(toQueryPair.curry(key)));    
      } else results.push(toQueryPair(key, values));
      return results;
    }).join('&');
  }

  function inspect() {
    return '#<Hash:{' + this.map(function(pair) {
      return pair.map(Object.inspect).join(': ');
    }).join(', ') + '}>';
  }

  function toJSON() {
    return Object.toJSON(this.toObject());
  }

  function clone() {
    return new Hash(this);
  }

  return {
    initialize:             initialize,
    _each:                  _each,
    set:                    set,
    get:                    get,
    unset:                  unset,
    toObject:               toObject,
    toTemplateReplacements: toObject,
    keys:                   keys,
    values:                 values,
    index:                  index,
    merge:                  merge,
    update:                 update,
    toQueryString:          toQueryString,
    inspect:                inspect,
    toJSON:                 toJSON,
    clone:                  clone
  };
})());
/*











*/



Hash.from = $H;
Object.extend(Number.prototype, (function () {
    function toColorPart() {
        return this.toPaddedString(2, 16);
    }

    function succ() {
        return this + 1;
    }
    /*
    执行指定次数的循环，例如获取10个随机数
    var ran=[]
    var c=10;
    c.times(function(){
    ran.push(Math.random());
    });
    */
    function times(iterator, context) {
        $R(0, this, true).each(iterator, context);
        return this;
    }
    /*
    进制转换

    var a=11;
    a.toPaddedString(4,8)//8进制 长度4  返回"0013"
    */
    function toPaddedString(length, radix) {
    /*
    toString 方法 
返回对象的字符串表示。 

objectname.toString([radix])参数 
objectname 
必选项。要得到字符串表示的对象。 
radix 
可选项。指定将数字值转换为字符串时的进制。 

详细出处参考：http://www.jb51.net/article/8321.htm
*/
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;  //此处调用string类的times方法，重复（length - string.length）次0，并与string变量拼接
    }

    function toJSON() {
    /*
    JavaScript isFinite() 函数
定义和用法
isFinite() 函数用于检查其参数是否是无穷大。

语法
1.isFinite(number)参数 描述 
number 必需。要检测的数字。 

返回值
如果 number 是有限数字（或可转换为有限数字），那么返回 true。否则，如果 number 是 NaN（非数字），或者是正、负无穷大的数，则返回 false。

实例
在本例中，我们将使用 isFinite() 在检测无穷数：

1.<script type="text/javascript">2.alert(isFinite(123)+ "<br />") //true3.alert(isFinite(-1.23)+ "<br />") //true4.alert(isFinite(5-2)+ "<br />") //true5.alert(isFinite(0)+ "<br />") //true6.alert(isFinite("Hello")+ "<br />") //false7.alert(isFinite("2005/12/12")+ "<br />") //false8.</script>
*/
    return isFinite(this) ? this.toString() : 'null';
    }

    function abs() {
    return Math.abs(this);
    }

    function round() {
    return Math.round(this);
    }

    function ceil() {
    return Math.ceil(this);
    }

    function floor() {
    return Math.floor(this);
    }

    return {
    toColorPart: toColorPart,
    succ: succ,
    times: times,
    toPaddedString: toPaddedString,
    toJSON: toJSON,
    abs: abs,
    round: round,
    ceil: ceil,
    floor: floor
    };
    })());

    function $R(start, end, exclusive) {
    return new ObjectRange(start, end, exclusive);
    }

    var ObjectRange = Class.create(Enumerable, (function() {
    function initialize(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
    }
  
    /*迭代执行iterator end - start次*/
  function _each(iterator) {
      var value = this.start;
      /*
      此include不是Enumerable的include方法，而是下面的include方法
      （ObjectRange的include方法覆盖了Enumerable的同名方法）
      */
    while (this.include(value)) {   
      iterator(value);
      value = value.succ(); //value=value + 1
    }
  }

  //注意！！此处返回一个表达式
  //上面说法错误！此处返回bool值
  function include(value) {    
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }

  return {
    initialize: initialize,
    _each:      _each,
    include:    include
  };
})());


/*  ajax开始  */
var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },
//当前激活的请求数目
  activeRequestCount: 0
};
/*
Ajax的返回值
*/
Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
      this.responders._each(iterator);    //调用Array类的_each方法，遍历responders数组
  },
  /*
  function include(object) {
        if (Object.isFunction(this.indexOf))    //注意此处if (this.indexOf(object) != -1) return true;为一个语句！即属于if (Object.isFunction(this.indexOf))的范围内
            if (this.indexOf(object) != -1) return true;

        var found = false;
        this.each(function (value) {
            if (value == object) {
                found = true;
                throw $break;
            }
        });
        return found;
    }
   */
register: function (responder) {
    /*
    调用Enumerable的include方法，因为Ajax.Responders的_each方法是遍历responders这个数组，
    所以此处是判断responders数组中是否包含responder
    */
      if (!this.include(responder))   
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function (callback, request, transport, json) {  //调用responders中的callback方法
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});
/*









*/
Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isString(this.options.parameters))
      this.options.parameters = this.options.parameters.toQueryParams();
    else if (Object.isHash(this.options.parameters))
    /*function toObject() {
        return Object.clone(this._object);
      }
      */
      this.options.parameters = this.options.parameters.toObject(); 
  }
});
Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
      $super(options);    //调用Ajax.Base的initialize方法
    this.transport = Ajax.getTransport();   //创建ajax对象
    this.request(url);
  },
  /*











  */
request: function (url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      params['_method'] = this.method;
      this.method = 'post';
    }

    this.parameters = params;

    if (params = Object.toQueryString(params)) {
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response); //调用onCreate方法

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);  //respondToReadyState没有传参数？？

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },
  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  /* 返回bool值 */
  success: function() { 
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300);
  },

  getStatus: function() {
    try {
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null; }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  /* 自定义处理异常 */
  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];








Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if(readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,

  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

/* Ajax.Updater:更新部分页面,调用格式 new Ajax.Updater(container,url[,options]) 
它在onComplete时$(container).innerHTML=XmlHttpRequest.responseText 
*/
Ajax.Updater = Class.create(Ajax.Request, {
initialize: function($super, container, url, options) {
this.container = {
success: (container.success || container),
failure: (container.failure || (container.success ? null : container))    //failure不存在且如果container有success方法，且failure为空
};

options = Object.clone(options);
var onComplete = options.onComplete;
options.onComplete = (function(response, json) {
this.updateContent(response.responseText);
if (Object.isFunction(onComplete)) onComplete(response, json);
}).bind(this);

$super(url, options);
},

updateContent: function(responseText) {
var receiver = this.container[this.success() ? 'success' : 'failure'],  //success方法为Ajax.Request的方法
options = this.options;

if (!options.evalScripts) responseText = responseText.stripScripts();

if (receiver = $(receiver)) {   //receiver为dom节点？？
if (options.insertion) {
if (Object.isString(options.insertion)) {
var insertion = { }; insertion[options.insertion] = responseText;
receiver.insert(insertion);
}
else options.insertion(receiver, responseText);
}
else receiver.update(responseText); //调用element对象的扩展方法update，更新receiver的innerHTML为responseText
}
}
});

/* Ajax.PeriodicalUpdater:周期刷新container,调用格式 new Ajax.PeriodicalUpdater(container,url[,options]) 

它的options相对于Ajax.Updater有两个不同 frequency和decay 

frequency是刷新频率,默认为2,单位为s,默认为每2s刷新一次

decay同样单位为s,默认为1s,即如果得到了相同的响应字符串,则在decay时间里不请求

var oPu=new Ajax.PeriodicalUpdater('divId','response.aspx',{
method:'get',frequency:3,decay:2
});
//刷新时间间隔为3s若得到相同的响应两次,则2s不请求

oPu.stop();//停止刷新
oPu.start();//开始周期执行刷新
*/
Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
initialize: function($super, container, url, options) {
$super(options);
this.onComplete = this.options.onComplete;
this.frequency = (this.options.frequency || 2);
this.decay = (this.options.decay || 1);

this.updater = { };
this.container = container;
this.url = url;

this.start();
},

start: function() {
this.options.onComplete = this.updateComplete.bind(this);
this.onTimerEvent();
},

stop: function() {
this.updater.options.onComplete = undefined;
clearTimeout(this.timer);
(this.onComplete || Prototype.emptyFunction).apply(this, arguments);
},

updateComplete: function(response) {
if (this.options.decay) {
this.decay = (response.responseText == this.lastText ?
this.decay * this.options.decay : 1);

this.lastText = response.responseText;
}
this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
},

onTimerEvent: function() {
this.updater = new Ajax.Updater(this.container, this.url, this.options);
}
});
/*  ajax结束  */


//此方法对于理解如何为element对象扩展方法很重要！！
//该方法扩展了id为element的dom对象，并返回该dom对象

//扩展element dom对象的基本思路：
//如要为id为a的dom对象扩展hide方法，则：
//document.getElementById('a').hide = hide();  或 document.getElementById('a')['hide'] = hide();

function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
      element = document.getElementById(element);

  /*

  //  注意!  Element.extend是一个闭包，返回一个函数extend，即Element.extend()就相当于函数extend()；
  //  因此Element.extend(element)就是将element赋给闭包返回的函数extend，相当于调用extend(element)


  Element.extend = (function() {

  function checkDeficiency(tagName) {     //这个函数有什么用？
  if (typeof window.Element != 'undefined') {
  var proto = window.Element.prototype;
  if (proto) {
  var id = '_' + (Math.random()+'').slice(2);
  var el = document.createElement(tagName);
  proto[id] = 'x';
  var isBuggy = (el[id] !== 'x');
  delete proto[id];
  el = null;
  return isBuggy;
  }
  }
  return false;
  }


  //该方法为element扩展（添加）methods中的方法
  function extendElementWith(element, methods) {
  for (var property in methods) {
  var value = methods[property];
  if (Object.isFunction(value) && !(property in element))
  // 
  //    methodize:

  //    这个方法先检查将要被methodize的方法是否已经methodize过了，通过内部的变量this._methodized做检查， 
  //    最后methodize函数返回的其实就是this._methodized。 
  //    这句话：var a = update([this], arguments);是关键，可以看出把this当成第一个参数传到这个原始函数中了。
  //    详细出处参考：http://www.jb51.net/article/19092.htm

  //    var fn = function(target, foo) { target.value = foo; }; var object = {}; 
  //    // 原始的方法 
  //    fn(object, 'bar'); 
  //    object.value //-> 'bar' 
  //    //调用methodize之后，可以看出fn函数第一个参数target变成了object 
  //    object.fnMethodized = fn.methodize(); 
  //    object.fnMethodized('boom!'); 
  //    object.value //-> 'boom!' 

  //    详细出处参考：http://www.jb51.net/article/19092.htm
  //    
  element[property] = value.methodize();    //为element扩展方法
  }
  }

  var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');

  if (Prototype.BrowserFeatures.SpecificElementExtensions) {
  if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY) {
  return function(element) {
  if (element && typeof element._extendedByPrototype == 'undefined') {
  var t = element.tagName;
  if (t && (/^(?:object|applet|embed)$/i.test(t))) {
  extendElementWith(element, Element.Methods);
  extendElementWith(element, Element.Methods.Simulated);
  extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
  }
  }
  return element;
  }
  }
  return Prototype.K;
  }

  var Methods = { }, ByTag = Element.Methods.ByTag;


  //  function extend(destination, source) {
  //    for (var property in source)
  //      destination[property] = source[property];
  //    return destination;
  //  }

  //extend函数开始

  //此处Object.extend的第一个参数为匿名函数，它的作用主要是为element（形参）添加Methods中的方法；
  //  第二个参数为object类，它有refresh方法。
  //  此处Object.extend的作用是将匿名函数返回给extend（即可以理解为extend就指向这个匿名函数），并将refresh方法赋给extend

  var extend = Object.extend(function(element) {
  if (!element || typeof element._extendedByPrototype != 'undefined' ||
  element.nodeType != 1 || element == window) return element;

  var methods = Object.clone(Methods),
  tagName = element.tagName.toUpperCase();

  if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

  extendElementWith(element, methods);

  element._extendedByPrototype = Prototype.emptyFunction;
  return element;

  }, {
  refresh: function() {
  if (!Prototype.BrowserFeatures.ElementExtensions) {   //如果不存在Element类
  Object.extend(Methods, Element.Methods);
  Object.extend(Methods, Element.Methods.Simulated);
  }
  }
  });

  extend.refresh();
  return extend;
  })();
  */
  return Element.extend(element);   
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!window.Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}


(function(global) {

  var SETATTRIBUTE_IGNORES_NAME = (function(){
    var elForm = document.createElement("form");
    var elInput = document.createElement("input");
    var root = document.documentElement;
    elInput.setAttribute("name", "test");
    elForm.appendChild(elInput);
    root.appendChild(elForm);
    var isBuggy = elForm.elements
      ? (typeof elForm.elements.test == "undefined")
      : null;
    root.removeChild(elForm);
    elForm = elInput = null;
    return isBuggy;
  })();

  var element = global.Element;
  global.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (SETATTRIBUTE_IGNORES_NAME && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };
  Object.extend(global.Element, element || { });
  if (element) global.Element.prototype = element.prototype;
})(this);   //此处this是指向window对象吗？？   应该是

Element.cache = { };
Element.idCounter = 1;
/*
扩展Element.Methods


新的DOM扩展中所有方法既可以用Element.funcName(element[,args])调用,也可以直接用element.functionName([,args])调用
*/
Element.Methods = {
    visible: function (element) {
        return $(element).style.display != 'none';
    },

    toggle: function (element) {
        element = $(element);   //element为id值，$(element)是按id获得该element对象
        Element[Element.visible(element) ? 'hide' : 'show'](element);   //此处用的是Element.funcName(element[,args])调用
        return element; //返回element对象，从而能够继续链式调用
    },


    hide: function (element) {
        element = $(element);
        element.style.display = 'none';
        return element;
    },

    show: function (element) {
        element = $(element);
        element.style.display = '';
        return element;
    },

    remove: function (element) {
        element = $(element);
        element.parentNode.removeChild(element);
        return element;
    },

    /*
    function stripScripts() {   //去除Javascript
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
    }

    function evalScripts() {    //提取并执行Javascript
    return this.extractScripts().map(function (script) { return eval(script) });
    }
    */
    /*
    用指定html填充element表示的节点
    setTimeout是极具技巧的用法，让人惊叹。
    update函数之所以会取代：element.innerHTML=html的用法，主要因为它实现了浏览器的兼容性：
    （1）对于IE，如果给innerHTML赋值的字符串中含有脚本标记，脚本是被忽略的，不起作用；而firefox则会执行脚本；
    （2）setTimeout使得可以在函数内可以通过eval定义全局函数，这是由于setTimeout的默认空间就是全局空间决定的（它是window对象的方法，而所有全局变量和全局函数实际上都是window对象的属性和方法）。

    老版的update方法:

    update: function(element, html) {
    $(element).innerHTML = html.stripScripts();
    setTimeout(function() {html.evalScripts()}, 10);
    },
    */
    update: (function () {    //新版的没懂起！！???

        var SELECT_ELEMENT_INNERHTML_BUGGY = (function () {
            var el = document.createElement("select"),
isBuggy = true;
            el.innerHTML = "<option value=\"test\">test</option>";
            if (el.options && el.options[0]) {
                isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION";
            }
            el = null;
            return isBuggy;
        })();

        var TABLE_ELEMENT_INNERHTML_BUGGY = (function () {
            try {
                var el = document.createElement("table");
                if (el && el.tBodies) {
                    el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
                    var isBuggy = typeof el.tBodies[0] == "undefined";
                    el = null;
                    return isBuggy;
                }
            } catch (e) {
                return true;
            }
        })();

        var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
            var s = document.createElement("script"),
isBuggy = false;
            try {
                s.appendChild(document.createTextNode(""));
                isBuggy = !s.firstChild ||
s.firstChild && s.firstChild.nodeType !== 3;
            } catch (e) {
                isBuggy = true;
            }
            s = null;
            return isBuggy;
        })();

        function update(element, content) {
            element = $(element);

            if (content && content.toElement)
                content = content.toElement();

            if (Object.isElement(content))
                return element.update().insert(content);

            content = Object.toHTML(content);

            var tagName = element.tagName.toUpperCase();

            if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
                element.text = content;
                return element;
            }

            if (SELECT_ELEMENT_INNERHTML_BUGGY || TABLE_ELEMENT_INNERHTML_BUGGY) {
                if (tagName in Element._insertionTranslations.tags) {
                    while (element.firstChild) {
                        element.removeChild(element.firstChild);
                    }
                    Element._getContentFromAnonymousElement(tagName, content.stripScripts())
.each(function (node) {
    element.appendChild(node)
});
                }
                else {
                    element.innerHTML = content.stripScripts();
                }
            }
            else {
                element.innerHTML = content.stripScripts();
            }

            content.evalScripts.bind(content).defer();
            return element;
        }

        return update;
    })(),

    /*
    将结点的innerHTMl替换为html.toString(),并允许包括scipt等的任何标签,并会执行script,不带参数是将innerHTML置空,并返回替换后的结点,
    其实html可以为任意类型,但必须支持toString()方法
    */
    replace: function (element, content) {
        element = $(element);
        if (content && content.toElement) content = content.toElement();    //toElement方法在哪定义了？？？
        else if (!Object.isElement(content)) {
            content = Object.toHTML(content);
            /*
            ownerDocument 是 文档

            documentElement 是 跟节点

            ownerDocument 下含2个一节点

            一是 <!DocType>

            二是 documentElemen

            --------------------------------------------

            ownerDocument返回的是某个元素的根节点文档对象（即document对象）
            而documentElement 返回的就是文档根节点
            如
            a.xml
            <?xml version="1.0" encoding="ISO-8859-1" ?>  
            -- <Node>
            <childNode></childNode>
            </Node>
            这里xmlDoc=loadXMLDoc("a.xml");
            var x=xmlDoc.getElementsByTagName("childNode")[0].ownerDocument;

            document.write("Nodename: " + x.nodeName);
            这里得出的是Nodename: #document
            而var x=xmlDoc.documentElement;
            document.write("Nodename: " + x.nodeName);
            这里得出的是
            Nodename: Node
            */
            var range = element.ownerDocument.createRange();    //createRange:创建TextRange对象
            range.selectNode(element);
            content.evalScripts.bind(content).defer();  //执行content中的js代码
            /*
            createContextualFragment() 方法讓您使用 文件物件模型 (DOM) 範圍的起始節點做為剖析內容，將 HTML 字串剖析為 DocumentFragment。
            這個方法不同於將標記插入 innerHTML，而是用來建立預先剖析的內容，以便在稍後需要時新增或插入到文件中。


            DocumentFragment:文档碎片节点




            JS技巧使用DocumentFragment加快DOM渲染速度 JS中提供了一个DocumentFragment的机制，相信大家对这个并不陌生，
            它可以提供一个缓冲的机制，将DOM节点先放到内存中，当节点都构造完成后，再将DocumentFragment对象添加到页面中，这时所有的节点都会一次渲染出来，这样就能减少浏览器很多的负担，
            明显的提高页面渲染速度。例如下面的代码：

            function CreateNodes(){
　　for(var i =0;i <10000;i ){ 
　　　　var tmpNode = document.createElement("div");
　　　　tmpNode.innerHTML ="test" i " <br />"; 
　　　　document.body.appendChild(tmpNode);
　　}
            } 
            function CreateFragments(){ 
　　var fragment = document.createDocumentFragment(); 
　　for(var i =0;i <10000;i ){ 
　　　　var tmpNode = document.createElement("div"); 
　　　　tmpNode.innerHTML ="test" i "<br />"; 
　　　　fragment.appendChild(tmpNode); 
　　}
　　document.body.appendChild(fragment);
            }
            上面的代码给出了两个函数，分别是用普通的DOM方法和DocumentFragement两种方式向页面添加一万个div节点，大家可以自己实验一下，使用第二种方式要比第一种快很多。
            这里只是简单的div标签的平铺添加，如果是更加复杂的HTML标签或是多层的嵌套标签，那么性能的差距就会更加明显。

            */
            content = range.createContextualFragment(content.stripScripts());
        }
        /*
        Node replaceChild(Node newChild, Node oldChild) throws DOMException

        将子节点列表中的子节点 oldChild 替换为 newChild，并返回 oldChild 节点。
        如果 newChild 为 DocumentFragment 对象，则将 oldChild 替换为所有 DocumentFragment 子节点，它们都以相同的顺序插入。如果 newChild 已经存在于树中，则首先移除它。 
        注：将节点替换为它本身与实现有关。


        参数： 
        newChild - 要在子节点列表中放入的新节点。 
        oldChild - 列表中被替换的节点。 
        返回： 
        替换的节点。 

        */
        element.parentNode.replaceChild(content, element);
        return element;
    },
    /*

    7-30







    */

    /*
    insert(element, { position: content }) -> HTMLElement
    insert(element, content) -> HTMLElement

    Inserts content before, after, at the top of, or at the bottom of element, 
    as specified by the position property of the second argument. If the second argument is the content itself, insert will append it to element.
    */
    insert: function (element, insertions) {
        element = $(element);

        if (Object.isString(insertions) || Object.isNumber(insertions) ||
Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
            insertions = { bottom: insertions };    //如果insertions为content本身（即不包含position），则默认position为bottom（即append）

        var content, insert, tagName, childNodes;

        for (var position in insertions) {
            content = insertions[position];
            position = position.toLowerCase();
            /*
            Element._insertionTranslations = {
            before: function(element, node) {
            element.parentNode.insertBefore(node, element);
            },
            top: function(element, node) {
            element.insertBefore(node, element.firstChild);
            },
            bottom: function(element, node) {
            element.appendChild(node);
            },
            after: function(element, node) {
            element.parentNode.insertBefore(node, element.nextSibling);
            },
            tags: {
TABLE:  ['<table>',                '</table>',                   1],
TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
SELECT: ['<select>',               '</select>',                  1]
}
};
            */
            insert = Element._insertionTranslations[position];

            if (content && content.toElement) content = content.toElement();
            if (Object.isElement(content)) {
                insert(element, content);   //如果content为element对象（即DOM元素），则插入
                continue;
            }

            content = Object.toHTML(content);

            tagName = ((position == 'before' || position == 'after') ? element.parentNode : element).tagName.toUpperCase();
            /*
            Element._getContentFromAnonymousElement = function (tagName, html) {     //将html转化为element数组，返回该数组
            var div = new Element('div'), t = Element._insertionTranslations.tags[tagName];
            if (t) {
            div.innerHTML = t[0] + html + t[1];
            t[2].times(function () { div = div.firstChild });   //执行指定次数(t[2]次)的循环
            } else div.innerHTML = html;
            return $A(div.childNodes); 
            };
            */
            childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());  ////将content.stripScripts()转化为element数组，返回该数组

            if (position == 'top' || position == 'after') childNodes.reverse();
            /*
            function curry() {
            if (!arguments.length) return this;
            var __method = this, args = slice.call(arguments, 0);
            return function () {
            var a = merge(args, arguments);
            return __method.apply(this, a);
            }
            }
            */

            /*childNodes为由element组成的数组。
            因为each(function(value, index))，所以此处相当于merge(element, value, index)，
            然后把合并后的数组作为形参传递给insert，因为insert形参只有两个，所以相当于insert(element, value)；
            因为value为content本身（即不包含position），则默认position为bottom（即append）


            所以这句代码的作用是将childNodes中的element append到element后面

            但是前面for循环不是已经插入了吗？这里再插入，岂不是重复了？？？？
            */
            childNodes.each(insert.curry(element)); //childNodes为数组
            

            content.evalScripts.bind(content).defer();  //执行content中的js代码
        }

        return element;
    },
    /*


    7-31




    */
    wrap: function (element, wrapper, attributes) {
        element = $(element);
        if (Object.isElement(wrapper))
            $(wrapper).writeAttribute(attributes || {});
        else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
        else wrapper = new Element('div', wrapper);
        if (element.parentNode)
            element.parentNode.replaceChild(wrapper, element);
        wrapper.appendChild(element);
        return wrapper;
    },

    inspect: function (element) {
        element = $(element);
        var result = '<' + element.tagName.toLowerCase();
        $H({ 'id': 'id', 'className': 'class' }).each(function (pair) { //pair为数组
            var property = pair.first(), attribute = pair.last();
            var value = (element[property] || '').toString();
            if (value) result += ' ' + attribute + '=' + value.inspect(true);
        });
        return result + '>';
    },
    //返回element及其子/父/兄/...元素，并为返回的每个元素扩展方法
    recursivelyCollect: function (element, property) {
        element = $(element);
        var elements = [];
        while (element = element[property])
            if (element.nodeType == 1)
                elements.push(Element.extend(element));
        return elements;
    },

    ancestors: function (element) {
        return Element.recursivelyCollect(element, 'parentNode');
    },

    descendants: function (element) {
        return Element.select(element, "*");
    },

    firstDescendant: function (element) {
        element = $(element).firstChild;
        while (element && element.nodeType != 1) element = element.nextSibling;
        return $(element);
    },

    immediateDescendants: function (element) {
        if (!(element = $(element).firstChild)) return [];
        while (element && element.nodeType != 1) element = element.nextSibling;
        if (element) return [element].concat($(element).nextSiblings());
        return [];
    },

    previousSiblings: function (element) {
        return Element.recursivelyCollect(element, 'previousSibling');
    },

    nextSiblings: function (element) {
        return Element.recursivelyCollect(element, 'nextSibling');
    },

    siblings: function (element) {
        element = $(element);
        return Element.previousSiblings(element).reverse()
.concat(Element.nextSiblings(element));
    },

    match: function (element, selector) {
        if (Object.isString(selector))
            selector = new Selector(selector);
        return selector.match($(element));
    },

    up: function (element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return $(element.parentNode);
        var ancestors = Element.ancestors(element);
        return Object.isNumber(expression) ? ancestors[expression] :
Selector.findElement(ancestors, expression, index);
    },

    down: function (element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return Element.firstDescendant(element);
        return Object.isNumber(expression) ? Element.descendants(element)[expression] :
Element.select(element, expression)[index || 0];
    },

    previous: function (element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
        var previousSiblings = Element.previousSiblings(element);
        return Object.isNumber(expression) ? previousSiblings[expression] :
Selector.findElement(previousSiblings, expression, index);
    },

    next: function (element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
        var nextSiblings = Element.nextSiblings(element);
        return Object.isNumber(expression) ? nextSiblings[expression] :
Selector.findElement(nextSiblings, expression, index);
    },


    select: function (element) {
        var args = Array.prototype.slice.call(arguments, 1);    
        return Selector.findChildElements(element, args);
    },

    adjacent: function (element) {
        var args = Array.prototype.slice.call(arguments, 1);
        return Selector.findChildElements(element.parentNode, args).without(element);
    },

    identify: function (element) {
        element = $(element);
        var id = Element.readAttribute(element, 'id');
        if (id) return id;
        do { id = 'anonymous_element_' + Element.idCounter++ } while ($(id));
        Element.writeAttribute(element, 'id', id);
        return id;
    },

    readAttribute: function (element, name) {
        element = $(element);
        if (Prototype.Browser.IE) {
            var t = Element._attributeTranslations.read;
            if (t.values[name]) return t.values[name](element, name);
            if (t.names[name]) name = t.names[name];
            if (name.include(':')) {
                return (!element.attributes || !element.attributes[name]) ? null :
element.attributes[name].value;
            }
        }
        return element.getAttribute(name);
    },

    writeAttribute: function (element, name, value) {
        element = $(element);
        var attributes = {}, t = Element._attributeTranslations.write;

        if (typeof name == 'object') attributes = name;
        else attributes[name] = Object.isUndefined(value) ? true : value;

        for (var attr in attributes) {
            name = t.names[attr] || attr;
            value = attributes[attr];
            if (t.values[attr]) name = t.values[attr](element, value);
            if (value === false || value === null)
                element.removeAttribute(name);
            else if (value === true)
                element.setAttribute(name, name);
            else element.setAttribute(name, value);
        }
        return element;
    },

    getHeight: function (element) {
        return Element.getDimensions(element).height;
    },

    getWidth: function (element) {
        return Element.getDimensions(element).width;
    },

    classNames: function (element) {
        return new Element.ClassNames(element);
    },

    hasClassName: function (element, className) {
        if (!(element = $(element))) return;
        var elementClassName = element.className;
        return (elementClassName.length > 0 && (elementClassName == className ||
new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
    },

    addClassName: function (element, className) {
        if (!(element = $(element))) return;
        if (!Element.hasClassName(element, className))
            element.className += (element.className ? ' ' : '') + className;    //允许多个class存在，多个class用空格隔开
        return element;
    },

    removeClassName: function (element, className) {
        if (!(element = $(element))) return;
        element.className = element.className.replace(
new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
        return element;
    },

    toggleClassName: function (element, className) {
        if (!(element = $(element))) return;
        return Element[Element.hasClassName(element, className) ?
'removeClassName' : 'addClassName'](element, className);
    },

    cleanWhitespace: function (element) {
        element = $(element);
        var node = element.firstChild;
        while (node) {
            var nextNode = node.nextSibling;
            if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
                element.removeChild(node);
            node = nextNode;
        }
        return element;
    },

    empty: function (element) {
        return $(element).innerHTML.blank();
    },

    descendantOf: function (element, ancestor) {
        element = $(element), ancestor = $(ancestor);

        if (element.compareDocumentPosition)
            return (element.compareDocumentPosition(ancestor) & 8) === 8;

        if (ancestor.contains)
            return ancestor.contains(element) && ancestor !== element;

        while (element = element.parentNode)
            if (element == ancestor) return true;

        return false;
    },

    scrollTo: function (element) {
        element = $(element);
        var pos = Element.cumulativeOffset(element);
        window.scrollTo(pos[0], pos[1]);
        return element;
    },

    getStyle: function (element, style) {
        element = $(element);
        style = style == 'float' ? 'cssFloat' : style.camelize();
        var value = element.style[style];
        if (!value || value == 'auto') {
            var css = document.defaultView.getComputedStyle(element, null); //??
            value = css ? css[style] : null;
        }
        if (style == 'opacity') return value ? parseFloat(value) : 1.0;
        return value == 'auto' ? null : value;
    },

    getOpacity: function (element) {
        return $(element).getStyle('opacity');
    },

    setStyle: function (element, styles) {
        element = $(element);
        var elementStyle = element.style, match;
        if (Object.isString(styles)) {
            element.style.cssText += ';' + styles;
            return styles.include('opacity') ?
element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
        }
        for (var property in styles)
            if (property == 'opacity') element.setOpacity(styles[property]);
            else
                elementStyle[(property == 'float' || property == 'cssFloat') ?
(Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
property] = styles[property];

        return element;
    },

    setOpacity: function (element, value) {
        element = $(element);
        element.style.opacity = (value == 1 || value === '') ? '' :
(value < 0.00001) ? 0 : value;
        return element;
    },

    getDimensions: function (element) {
        element = $(element);
        var display = Element.getStyle(element, 'display');
        if (display != 'none' && display != null) // Safari bug
            return { width: element.offsetWidth, height: element.offsetHeight };

        var els = element.style;
        var originalVisibility = els.visibility;
        var originalPosition = els.position;
        var originalDisplay = els.display;
        els.visibility = 'hidden';
        if (originalPosition != 'fixed') // Switching fixed to absolute causes issues in Safari
            els.position = 'absolute';
        els.display = 'block';
        var originalWidth = element.clientWidth;
        var originalHeight = element.clientHeight;
        els.display = originalDisplay;
        els.position = originalPosition;
        els.visibility = originalVisibility;
        return { width: originalWidth, height: originalHeight };
    },

    makePositioned: function (element) {
        element = $(element);
        var pos = Element.getStyle(element, 'position');
        if (pos == 'static' || !pos) {
            element._madePositioned = true;
            element.style.position = 'relative';
            if (Prototype.Browser.Opera) {
                element.style.top = 0;
                element.style.left = 0;
            }
        }
        return element;
    },

    undoPositioned: function (element) {
        element = $(element);
        if (element._madePositioned) {
            element._madePositioned = undefined;
            //此处有错！！！
            element.style.position = 
element.style.top =
element.style.left =
element.style.bottom =
element.style.right = '';
        }
        return element;
    },

    makeClipping: function (element) {
        element = $(element);
        if (element._overflow) return element;
        element._overflow = Element.getStyle(element, 'overflow') || 'auto';
        if (element._overflow !== 'hidden')
            element.style.overflow = 'hidden';
        return element;
    },

    undoClipping: function (element) {
        element = $(element);
        if (!element._overflow) return element;
        element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
        element._overflow = null;
        return element;
    },

    cumulativeOffset: function (element) {
        var valueT = 0, valueL = 0;
        do {
            valueT += element.offsetTop || 0;
            valueL += element.offsetLeft || 0;
            element = element.offsetParent;
        } while (element);
        return Element._returnOffset(valueL, valueT);
    },

    positionedOffset: function (element) {
        var valueT = 0, valueL = 0;
        do {
            valueT += element.offsetTop || 0;
            valueL += element.offsetLeft || 0;
            element = element.offsetParent;
            if (element) {
                if (element.tagName.toUpperCase() == 'BODY') break;
                var p = Element.getStyle(element, 'position');
                if (p !== 'static') break;
            }
        } while (element);
        return Element._returnOffset(valueL, valueT);
    },

    absolutize: function (element) {
        element = $(element);
        if (Element.getStyle(element, 'position') == 'absolute') return element;

        var offsets = Element.positionedOffset(element);
        var top = offsets[1];
        var left = offsets[0];
        var width = element.clientWidth;
        var height = element.clientHeight;

        element._originalLeft = left - parseFloat(element.style.left || 0);
        element._originalTop = top - parseFloat(element.style.top || 0);
        element._originalWidth = element.style.width;
        element._originalHeight = element.style.height;

        element.style.position = 'absolute';
        element.style.top = top + 'px';
        element.style.left = left + 'px';
        element.style.width = width + 'px';
        element.style.height = height + 'px';
        return element;
    },

    relativize: function (element) {
        element = $(element);
        if (Element.getStyle(element, 'position') == 'relative') return element;

        element.style.position = 'relative';
        var top = parseFloat(element.style.top || 0) - (element._originalTop || 0);
        var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

        element.style.top = top + 'px';
        element.style.left = left + 'px';
        element.style.height = element._originalHeight;
        element.style.width = element._originalWidth;
        return element;
    },

    cumulativeScrollOffset: function (element) {
        var valueT = 0, valueL = 0;
        do {
            valueT += element.scrollTop || 0;
            valueL += element.scrollLeft || 0;
            element = element.parentNode;
        } while (element);
        return Element._returnOffset(valueL, valueT);
    },

    getOffsetParent: function (element) {
        if (element.offsetParent) return $(element.offsetParent);
        if (element == document.body) return $(element);

        while ((element = element.parentNode) && element != document.body)
            if (Element.getStyle(element, 'position') != 'static')
                return $(element);

        return $(document.body);
    },

    viewportOffset: function (forElement) {
        var valueT = 0, valueL = 0;

        var element = forElement;
        do {
            valueT += element.offsetTop || 0;
            valueL += element.offsetLeft || 0;

            if (element.offsetParent == document.body &&
Element.getStyle(element, 'position') == 'absolute') break;

        } while (element = element.offsetParent);

        element = forElement;
        do {
            if (!Prototype.Browser.Opera || (element.tagName && (element.tagName.toUpperCase() == 'BODY'))) {
                valueT -= element.scrollTop || 0;
                valueL -= element.scrollLeft || 0;
            }
        } while (element = element.parentNode);

        return Element._returnOffset(valueL, valueT);
    },

    clonePosition: function (element, source) {
        var options = Object.extend({
            setLeft: true,
            setTop: true,
            setWidth: true,
            setHeight: true,
            offsetTop: 0,
            offsetLeft: 0
        }, arguments[2] || {});

        source = $(source);
        var p = Element.viewportOffset(source);

        element = $(element);
        var delta = [0, 0];
        var parent = null;
        if (Element.getStyle(element, 'position') == 'absolute') {
            parent = Element.getOffsetParent(element);
            delta = Element.viewportOffset(parent);
        }

        if (parent == document.body) {
            delta[0] -= document.body.offsetLeft;
            delta[1] -= document.body.offsetTop;
        }

        if (options.setLeft) element.style.left = (p[0] - delta[0] + options.offsetLeft) + 'px';
        if (options.setTop) element.style.top = (p[1] - delta[1] + options.offsetTop) + 'px';
        if (options.setWidth) element.style.width = source.offsetWidth + 'px';
        if (options.setHeight) element.style.height = source.offsetHeight + 'px';
        return element;
    }
};

Object.extend(Element.Methods, {
getElementsBySelector: Element.Methods.select,

childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
write: {
names: {
className: 'class',
htmlFor:   'for'
},
values: { }
}
};

if (Prototype.Browser.Opera) {
Element.Methods.getStyle = Element.Methods.getStyle.wrap(
function (proceed, element, style) {     //proceed为Element.Methods.getStyle函数
switch (style) {
case 'left': case 'top': case 'right': case 'bottom':
if (proceed(element, 'position') === 'static') return null;
case 'height': case 'width':
if (!Element.visible(element)) return null;

var dim = parseInt(proceed(element, style), 10);

if (dim !== element['offset' + style.capitalize()])
return dim + 'px';

var properties;
if (style === 'height') {
properties = ['border-top-width', 'padding-top',
'padding-bottom', 'border-bottom-width'];
}
else {
properties = ['border-left-width', 'padding-left',
'padding-right', 'border-right-width'];
}
return properties.inject(dim, function(memo, property) {
var val = proceed(element, property);
return val === null ? memo : memo - parseInt(val, 10);
}) + 'px';
default: return proceed(element, style);
}
}
);

Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
function(proceed, element, attribute) {
if (attribute === 'title') return element.title;
return proceed(element, attribute);
}
);
}

else if (Prototype.Browser.IE) {
Element.Methods.getOffsetParent = Element.Methods.getOffsetParent.wrap(
function(proceed, element) {
element = $(element);
try { element.offsetParent }
catch(e) { return $(document.body) }
var position = element.getStyle('position');
if (position !== 'static') return proceed(element);
element.setStyle({ position: 'relative' });
var value = proceed(element);
element.setStyle({ position: position });
return value;
}
);

$w('positionedOffset viewportOffset').each(function(method) {
Element.Methods[method] = Element.Methods[method].wrap(
function(proceed, element) {
element = $(element);
try { element.offsetParent }
catch(e) { return Element._returnOffset(0,0) }
var position = element.getStyle('position');
if (position !== 'static') return proceed(element);
var offsetParent = element.getOffsetParent();
if (offsetParent && offsetParent.getStyle('position') === 'fixed')
offsetParent.setStyle({ zoom: 1 });
element.setStyle({ position: 'relative' });
var value = proceed(element);
element.setStyle({ position: position });
return value;
}
);
});

Element.Methods.cumulativeOffset = Element.Methods.cumulativeOffset.wrap(
function(proceed, element) {
try { element.offsetParent }
catch(e) { return Element._returnOffset(0,0) }
return proceed(element);
}
);

Element.Methods.getStyle = function(element, style) {
element = $(element);
style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
var value = element.style[style];
if (!value && element.currentStyle) value = element.currentStyle[style];

if (style == 'opacity') {
if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
if (value[1]) return parseFloat(value[1]) / 100;
return 1.0;
}

if (value == 'auto') {
if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
return element['offset' + style.capitalize()] + 'px';
return null;
}
return value;
};

Element.Methods.setOpacity = function(element, value) {
function stripAlpha(filter){
return filter.replace(/alpha\([^\)]*\)/gi,'');
}
element = $(element);
var currentStyle = element.currentStyle;
if ((currentStyle && !currentStyle.hasLayout) ||
(!currentStyle && element.style.zoom == 'normal'))
element.style.zoom = 1;

var filter = element.getStyle('filter'), style = element.style;
if (value == 1 || value === '') {
(filter = stripAlpha(filter)) ?
style.filter = filter : style.removeAttribute('filter');
return element;
} else if (value < 0.00001) value = 0;
style.filter = stripAlpha(filter) +
'alpha(opacity=' + (value * 100) + ')';
return element;
};

Element._attributeTranslations = (function(){

var classProp = 'className';
var forProp = 'for';

var el = document.createElement('div');

el.setAttribute(classProp, 'x');

if (el.className !== 'x') {
el.setAttribute('class', 'x');
if (el.className === 'x') {
classProp = 'class';
}
}
el = null;

el = document.createElement('label');
el.setAttribute(forProp, 'x');
if (el.htmlFor !== 'x') {
el.setAttribute('htmlFor', 'x');
if (el.htmlFor === 'x') {
forProp = 'htmlFor';
}
}
el = null;

return {
read: {
names: {
'class':      classProp,
'className':  classProp,
'for':        forProp,
'htmlFor':    forProp
},
values: {
_getAttr: function(element, attribute) {
return element.getAttribute(attribute);
},
_getAttr2: function(element, attribute) {
return element.getAttribute(attribute, 2);
},
_getAttrNode: function(element, attribute) {
var node = element.getAttributeNode(attribute);
return node ? node.value : "";
},
_getEv: (function(){    //自动执行函数体中的代码。注意这种写法:func: (function(){})()

var el = document.createElement('div');
el.onclick = Prototype.emptyFunction;
var value = el.getAttribute('onclick');
var f;

if (String(value).indexOf('{') > -1) {
f = function(element, attribute) {
attribute = element.getAttribute(attribute);
if (!attribute) return null;
attribute = attribute.toString();
attribute = attribute.split('{')[1];
attribute = attribute.split('}')[0];
return attribute.strip();
};
}
else if (value === '') {
f = function(element, attribute) {
attribute = element.getAttribute(attribute);
if (!attribute) return null;
return attribute.strip();
};
}
el = null;
return f;
})(),
_flag: function(element, attribute) {
return $(element).hasAttribute(attribute) ? attribute : null;
},
style: function(element) {
return element.style.cssText.toLowerCase();
},
title: function(element) {
return element.title;
}
}
}
}
})();

Element._attributeTranslations.write = {
names: Object.extend({
cellpadding: 'cellPadding',
cellspacing: 'cellSpacing'
}, Element._attributeTranslations.read.names),
values: {
checked: function(element, value) {
element.checked = !!value;
},

style: function(element, value) {
element.style.cssText = value ? value : '';
}
}
};

Element._attributeTranslations.has = {};

//$w(string):该方法将字符串转换成数组(注意w是小写)

$w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
Element._attributeTranslations.has[attr.toLowerCase()] = attr;
});

(function(v) {
Object.extend(v, {
href:        v._getAttr2,
src:         v._getAttr2,
type:        v._getAttr,
action:      v._getAttrNode,
disabled:    v._flag,
checked:     v._flag,
readonly:    v._flag,
multiple:    v._flag,
onload:      v._getEv,
onunload:    v._getEv,
onclick:     v._getEv,
ondblclick:  v._getEv,
onmousedown: v._getEv,
onmouseup:   v._getEv,
onmouseover: v._getEv,
onmousemove: v._getEv,
onmouseout:  v._getEv,
onfocus:     v._getEv,
onblur:      v._getEv,
onkeypress:  v._getEv,
onkeydown:   v._getEv,
onkeyup:     v._getEv,
onsubmit:    v._getEv,
onreset:     v._getEv,
onselect:    v._getEv,
onchange:    v._getEv
});
})(Element._attributeTranslations.read.values);

if (Prototype.BrowserFeatures.ElementExtensions) {  //如果Element类存在
(function() {
function _descendants(element) {
var nodes = element.getElementsByTagName('*'), results = [];
for (var i = 0, node; node = nodes[i]; i++)
if (node.tagName !== "!") // Filter out comment nodes.
results.push(node);
return results;
}

Element.Methods.down = function(element, expression, index) {
element = $(element);
if (arguments.length == 1) return element.firstDescendant();    //重载
return Object.isNumber(expression) ? _descendants(element)[expression] :
Element.select(element, expression)[index || 0];
}
})();
}


}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
Element.Methods.setOpacity = function(element, value) {
element = $(element);
element.style.opacity = (value == 1) ? 0.999999 :
(value === '') ? '' : (value < 0.00001) ? 0 : value;
return element;
};
}

else if (Prototype.Browser.WebKit) {
Element.Methods.setOpacity = function(element, value) {
element = $(element);
element.style.opacity = (value == 1 || value === '') ? '' :
(value < 0.00001) ? 0 : value;

if (value == 1)
if(element.tagName.toUpperCase() == 'IMG' && element.width) {
element.width++; element.width--;
} else try {
var n = document.createTextNode(' ');
element.appendChild(n);
element.removeChild(n);
} catch (e) { }

return element;
};

Element.Methods.cumulativeOffset = function(element) {
var valueT = 0, valueL = 0;
do {
valueT += element.offsetTop  || 0;
valueL += element.offsetLeft || 0;
if (element.offsetParent == document.body)
if (Element.getStyle(element, 'position') == 'absolute') break;

element = element.offsetParent;
} while (element);

return Element._returnOffset(valueL, valueT);
};
}

if ('outerHTML' in document.documentElement) {
Element.Methods.replace = function(element, content) {
element = $(element);

if (content && content.toElement) content = content.toElement();
if (Object.isElement(content)) {
element.parentNode.replaceChild(content, element);
return element;
}

content = Object.toHTML(content);
var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

if (Element._insertionTranslations.tags[tagName]) {
var nextSibling = element.next();
var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
parent.removeChild(element);
if (nextSibling)
fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
else
fragments.each(function(node) { parent.appendChild(node) });
}
else element.outerHTML = content.stripScripts();

content.evalScripts.bind(content).defer();
return element;
};
}

Element._returnOffset = function(l, t) {
var result = [l, t];
result.left = l;
result.top = t;
return result;
};

Element._getContentFromAnonymousElement = function(tagName, html) {
var div = new Element('div'), t = Element._insertionTranslations.tags[tagName];
if (t) {
div.innerHTML = t[0] + html + t[1];
t[2].times(function() { div = div.firstChild });
} else div.innerHTML = html;
return $A(div.childNodes);
};

Element._insertionTranslations = {
before: function(element, node) {
element.parentNode.insertBefore(node, element);
},
top: function(element, node) {
element.insertBefore(node, element.firstChild);
},
bottom: function(element, node) {
element.appendChild(node);
},
after: function(element, node) {
element.parentNode.insertBefore(node, element.nextSibling);
},
tags: {
TABLE:  ['<table>',                '</table>',                   1],
TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
SELECT: ['<select>',               '</select>',                  1]
}
};

(function() {
var tags = Element._insertionTranslations.tags;
Object.extend(tags, {
THEAD: tags.TBODY,
TFOOT: tags.TBODY,
TH:    tags.TD
});
})();

Element.Methods.Simulated = {
hasAttribute: function(element, attribute) {
attribute = Element._attributeTranslations.has[attribute] || attribute;
var node = $(element).getAttributeNode(attribute);
return !!(node && node.specified);
}
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);    //此处Element只是一个类，并不是element对象！？？？   此处Element只是一个类

(function(div) {

if (!Prototype.BrowserFeatures.ElementExtensions && div['__proto__']) {
window.HTMLElement = { };
window.HTMLElement.prototype = div['__proto__'];
Prototype.BrowserFeatures.ElementExtensions = true;
}

div = null;

})(document.createElement('div'))


//Element.extend方法

Element.extend = (function() {

function checkDeficiency(tagName) {
if (typeof window.Element != 'undefined') {
var proto = window.Element.prototype;
if (proto) {
var id = '_' + (Math.random()+'').slice(2);
var el = document.createElement(tagName);
proto[id] = 'x';
var isBuggy = (el[id] !== 'x');
delete proto[id];
el = null;
return isBuggy;
}
}
return false;
}

function extendElementWith(element, methods) {
for (var property in methods) {
var value = methods[property];
if (Object.isFunction(value) && !(property in element))
element[property] = value.methodize();
}
}

var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');

if (Prototype.BrowserFeatures.SpecificElementExtensions) {
if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY) {
return function(element) {
if (element && typeof element._extendedByPrototype == 'undefined') {
var t = element.tagName;
if (t && (/^(?:object|applet|embed)$/i.test(t))) {
extendElementWith(element, Element.Methods);
extendElementWith(element, Element.Methods.Simulated);
extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
}
}
return element;
}
}
return Prototype.K;
}

var Methods = { }, ByTag = Element.Methods.ByTag;

var extend = Object.extend(function(element) {
if (!element || typeof element._extendedByPrototype != 'undefined' ||
element.nodeType != 1 || element == window) return element;

var methods = Object.clone(Methods),
tagName = element.tagName.toUpperCase();

if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

extendElementWith(element, methods);

element._extendedByPrototype = Prototype.emptyFunction;
return element;

}, {
refresh: function() {
if (!Prototype.BrowserFeatures.ElementExtensions) {
Object.extend(Methods, Element.Methods);
Object.extend(Methods, Element.Methods.Simulated);
}
}
});

extend.refresh();
return extend;
})();



Element.hasAttribute = function(element, attribute) {
if (element.hasAttribute) return element.hasAttribute(attribute);
return Element.Methods.Simulated.hasAttribute(element, attribute);
};

Element.addMethods = function(methods) {
var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

if (!methods) {
Object.extend(Form, Form.Methods);
Object.extend(Form.Element, Form.Element.Methods);
Object.extend(Element.Methods.ByTag, {
"FORM":     Object.clone(Form.Methods),
"INPUT":    Object.clone(Form.Element.Methods),
"SELECT":   Object.clone(Form.Element.Methods),
"TEXTAREA": Object.clone(Form.Element.Methods)
});
}

if (arguments.length == 2) {
var tagName = methods;
methods = arguments[1];
}

if (!tagName) Object.extend(Element.Methods, methods || { });
else {
if (Object.isArray(tagName)) tagName.each(extend);
else extend(tagName);
}

function extend(tagName) {
tagName = tagName.toUpperCase();
if (!Element.Methods.ByTag[tagName])
Element.Methods.ByTag[tagName] = { };
Object.extend(Element.Methods.ByTag[tagName], methods);
}

function copy(methods, destination, onlyIfAbsent) {
onlyIfAbsent = onlyIfAbsent || false;
for (var property in methods) {
var value = methods[property];
if (!Object.isFunction(value)) continue;
if (!onlyIfAbsent || !(property in destination))
destination[property] = value.methodize();
}
}

function findDOMClass(tagName) {
var klass;
var trans = {
"OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
"FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
"DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
"H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
"INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
"TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
"TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
"TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
"FrameSet", "IFRAME": "IFrame"
};
if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
if (window[klass]) return window[klass];
klass = 'HTML' + tagName + 'Element';
if (window[klass]) return window[klass];
klass = 'HTML' + tagName.capitalize() + 'Element';
if (window[klass]) return window[klass];

var element = document.createElement(tagName);
var proto = element['__proto__'] || element.constructor.prototype;
element = null;
return proto;
}

var elementPrototype = window.HTMLElement ? HTMLElement.prototype :
Element.prototype;

if (F.ElementExtensions) {
copy(Element.Methods, elementPrototype);
copy(Element.Methods.Simulated, elementPrototype, true);
}

if (F.SpecificElementExtensions) {
for (var tag in Element.Methods.ByTag) {
var klass = findDOMClass(tag);
if (Object.isUndefined(klass)) continue;
copy(T[tag], klass.prototype);
}
}

Object.extend(Element, Element.Methods);
delete Element.ByTag;

if (Element.extend.refresh) Element.extend.refresh();
Element.cache = { };
};

//document.viewport类

document.viewport = {

getDimensions: function() {
return { width: this.getWidth(), height: this.getHeight() };
},

getScrollOffsets: function() {
return Element._returnOffset(
window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
window.pageYOffset || document.documentElement.scrollTop  || document.body.scrollTop);
}
};

(function(viewport) {
var B = Prototype.Browser, doc = document, element, property = {};

function getRootElement() { //返回根元素
if (B.WebKit && !doc.evaluate)
return document;

if (B.Opera && window.parseFloat(window.opera.version()) < 9.5)
return document.body;

return document.documentElement;
}

function define(D) {
if (!element) element = getRootElement();

property[D] = 'client' + D;

viewport['get' + D] = function() { return element[property[D]] };
return viewport['get' + D]();
}

viewport.getWidth  = define.curry('Width');

viewport.getHeight = define.curry('Height');
})(document.viewport);


Element.Storage = {
UID: 1
};

Element.addMethods({
getStorage: function(element) {
if (!(element = $(element))) return;

var uid;
if (element === window) {
uid = 0;
} else {
if (typeof element._prototypeUID === "undefined")
element._prototypeUID = [Element.Storage.UID++];
uid = element._prototypeUID[0];
}

if (!Element.Storage[uid])
Element.Storage[uid] = $H();

return Element.Storage[uid];
},

store: function(element, key, value) {
if (!(element = $(element))) return;

if (arguments.length === 2) {
Element.getStorage(element).update(key);
} else {
Element.getStorage(element).set(key, value);
}

return element;
},

retrieve: function(element, key, defaultValue) {
if (!(element = $(element))) return;
var hash = Element.getStorage(element), value = hash.get(key);

if (Object.isUndefined(value)) {
hash.set(key, defaultValue);
value = defaultValue;
}

return value;
},

clone: function(element, deep) {
if (!(element = $(element))) return;
var clone = element.cloneNode(deep);
clone._prototypeUID = void 0;
if (deep) {
var descendants = Element.select(clone, '*'),
i = descendants.length;
while (i--) {
descendants[i]._prototypeUID = void 0;
}
}
return Element.extend(clone);
}
});
/*

8-6







*/




/* Portions of the Selector class are derived from Jack Slocum's DomQuery,
* part of YUI-Ext version 0.40, distributed under the terms of an MIT-style
* license.  Please see http://www.yui-ext.com/ for more information. */

var Selector = Class.create({
  initialize: function(expression) {
    this.expression = expression.strip();

    if (this.shouldUseSelectorsAPI()) {
      this.mode = 'selectorsAPI';
    } else if (this.shouldUseXPath()) {
      this.mode = 'xpath';
      this.compileXPathMatcher();
    } else {
      this.mode = "normal";
      this.compileMatcher();
    }

  },

  shouldUseXPath: (function() {

    var IS_DESCENDANT_SELECTOR_BUGGY = (function(){
      var isBuggy = false;
      if (document.evaluate && window.XPathResult) {
        var el = document.createElement('div');
        el.innerHTML = '<ul><li></li></ul><div><ul><li></li></ul></div>';

        var xpath = ".//*[local-name()='ul' or local-name()='UL']" +
          "//*[local-name()='li' or local-name()='LI']";

        var result = document.evaluate(xpath, el, null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        isBuggy = (result.snapshotLength !== 2);
        el = null;
      }
      return isBuggy;
    })();

    return function() {
      if (!Prototype.BrowserFeatures.XPath) return false;

      var e = this.expression;

      if (Prototype.Browser.WebKit &&
       (e.include("-of-type") || e.include(":empty")))
        return false;

      if ((/(\[[\w-]*?:|:checked)/).test(e))
        return false;

      if (IS_DESCENDANT_SELECTOR_BUGGY) return false;

      return true;
    }

  })(),

  shouldUseSelectorsAPI: function() {
    if (!Prototype.BrowserFeatures.SelectorsAPI) return false;

    if (Selector.CASE_INSENSITIVE_CLASS_NAMES) return false;

    if (!Selector._div) Selector._div = new Element('div');

    try {
      Selector._div.querySelector(this.expression);
    } catch(e) {
      return false;
    }

    return true;
  },

  compileMatcher: function() {
    var e = this.expression, ps = Selector.patterns, h = Selector.handlers,
        c = Selector.criteria, le, p, m, len = ps.length, name;

    if (Selector._cache[e]) {
      this.matcher = Selector._cache[e];
      return;
    }

    this.matcher = ["this.matcher = function(root) {",
                    "var r = root, h = Selector.handlers, c = false, n;"];

    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i = 0; i<len; i++) {
        p = ps[i].re;
        name = ps[i].name;
        if (m = e.match(p)) {
          this.matcher.push(Object.isFunction(c[name]) ? c[name](m) :
            new Template(c[name]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.matcher.push("return h.unique(n);\n}");
    eval(this.matcher.join('\n'));
    Selector._cache[this.expression] = this.matcher;
  },

  compileXPathMatcher: function() {
    var e = this.expression, ps = Selector.patterns,
        x = Selector.xpath, le, m, len = ps.length, name;

    if (Selector._cache[e]) {
      this.xpath = Selector._cache[e]; return;
    }

    this.matcher = ['.//*'];
    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i = 0; i<len; i++) {
        name = ps[i].name;
        if (m = e.match(ps[i].re)) {
          this.matcher.push(Object.isFunction(x[name]) ? x[name](m) :
            new Template(x[name]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.xpath = this.matcher.join('');
    Selector._cache[this.expression] = this.xpath;
  },

  findElements: function(root) {
    root = root || document;
    var e = this.expression, results;

    switch (this.mode) {
      case 'selectorsAPI':
        if (root !== document) {
          var oldId = root.id, id = $(root).identify();
          id = id.replace(/([\.:])/g, "\\$1");
          e = "#" + id + " " + e;
        }

        results = $A(root.querySelectorAll(e)).map(Element.extend);
        root.id = oldId;

        return results;
      case 'xpath':
        return document._getElementsByXPath(this.xpath, root);
      default:
       return this.matcher(root);
    }
  },

  match: function(element) {
    this.tokens = [];

    var e = this.expression, ps = Selector.patterns, as = Selector.assertions;
    var le, p, m, len = ps.length, name;

    while (e && le !== e && (/\S/).test(e)) {
      le = e;
      for (var i = 0; i<len; i++) {
        p = ps[i].re;
        name = ps[i].name;
        if (m = e.match(p)) {
          if (as[name]) {
            this.tokens.push([name, Object.clone(m)]);
            e = e.replace(m[0], '');
          } else {
            return this.findElements(document).include(element);
          }
        }
      }
    }

    var match = true, name, matches;
    for (var i = 0, token; token = this.tokens[i]; i++) {
      name = token[0], matches = token[1];
      if (!Selector.assertions[name](element, matches)) {
        match = false; break;
      }
    }

    return match;
  },

  toString: function() {
    return this.expression;
  },

  inspect: function() {
    return "#<Selector:" + this.expression.inspect() + ">";
  }
});

if (Prototype.BrowserFeatures.SelectorsAPI &&
 document.compatMode === 'BackCompat') {
  Selector.CASE_INSENSITIVE_CLASS_NAMES = (function(){
    var div = document.createElement('div'),
     span = document.createElement('span');

    div.id = "prototype_test_id";
    span.className = 'Test';
    div.appendChild(span);
    var isIgnored = (div.querySelector('#prototype_test_id .test') !== null);
    div = span = null;
    return isIgnored;
  })();
}

Object.extend(Selector, {
  _cache: { },

  xpath: {
    descendant:   "//*",
    child:        "/*",
    adjacent:     "/following-sibling::*[1]",
    laterSibling: '/following-sibling::*',
    tagName:      function(m) {
      if (m[1] == '*') return '';
      return "[local-name()='" + m[1].toLowerCase() +
             "' or local-name()='" + m[1].toUpperCase() + "']";
    },
    className:    "[contains(concat(' ', @class, ' '), ' #{1} ')]",
    id:           "[@id='#{1}']",
    attrPresence: function(m) {
      m[1] = m[1].toLowerCase();
      return new Template("[@#{1}]").evaluate(m);
    },
    attr: function(m) {
      m[1] = m[1].toLowerCase();
      m[3] = m[5] || m[6];
      return new Template(Selector.xpath.operators[m[2]]).evaluate(m);
    },
    pseudo: function(m) {
      var h = Selector.xpath.pseudos[m[1]];
      if (!h) return '';
      if (Object.isFunction(h)) return h(m);
      return new Template(Selector.xpath.pseudos[m[1]]).evaluate(m);
    },
    operators: {
      '=':  "[@#{1}='#{3}']",
      '!=': "[@#{1}!='#{3}']",
      '^=': "[starts-with(@#{1}, '#{3}')]",
      '$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
      '*=': "[contains(@#{1}, '#{3}')]",
      '~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
      '|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
    },
    pseudos: {
      'first-child': '[not(preceding-sibling::*)]',
      'last-child':  '[not(following-sibling::*)]',
      'only-child':  '[not(preceding-sibling::* or following-sibling::*)]',
      'empty':       "[count(*) = 0 and (count(text()) = 0)]",
      'checked':     "[@checked]",
      'disabled':    "[(@disabled) and (@type!='hidden')]",
      'enabled':     "[not(@disabled) and (@type!='hidden')]",
      'not': function(m) {
        var e = m[6], p = Selector.patterns,
            x = Selector.xpath, le, v, len = p.length, name;

        var exclusion = [];
        while (e && le != e && (/\S/).test(e)) {
          le = e;
          for (var i = 0; i<len; i++) {
            name = p[i].name
            if (m = e.match(p[i].re)) {
              v = Object.isFunction(x[name]) ? x[name](m) : new Template(x[name]).evaluate(m);
              exclusion.push("(" + v.substring(1, v.length - 1) + ")");
              e = e.replace(m[0], '');
              break;
            }
          }
        }
        return "[not(" + exclusion.join(" and ") + ")]";
      },
      'nth-child':      function(m) {
        return Selector.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m);
      },
      'nth-last-child': function(m) {
        return Selector.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m);
      },
      'nth-of-type':    function(m) {
        return Selector.xpath.pseudos.nth("position() ", m);
      },
      'nth-last-of-type': function(m) {
        return Selector.xpath.pseudos.nth("(last() + 1 - position()) ", m);
      },
      'first-of-type':  function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-of-type'](m);
      },
      'last-of-type':   function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-last-of-type'](m);
      },
      'only-of-type':   function(m) {
        var p = Selector.xpath.pseudos; return p['first-of-type'](m) + p['last-of-type'](m);
      },
      nth: function(fragment, m) {
        var mm, formula = m[6], predicate;
        if (formula == 'even') formula = '2n+0';
        if (formula == 'odd')  formula = '2n+1';
        if (mm = formula.match(/^(\d+)$/)) // digit only
          return '[' + fragment + "= " + mm[1] + ']';
        if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
          if (mm[1] == "-") mm[1] = -1;
          var a = mm[1] ? Number(mm[1]) : 1;
          var b = mm[2] ? Number(mm[2]) : 0;
          predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " +
          "((#{fragment} - #{b}) div #{a} >= 0)]";
          return new Template(predicate).evaluate({
            fragment: fragment, a: a, b: b });
        }
      }
    }
  },

  criteria: {
    tagName:      'n = h.tagName(n, r, "#{1}", c);      c = false;',
    className:    'n = h.className(n, r, "#{1}", c);    c = false;',
    id:           'n = h.id(n, r, "#{1}", c);           c = false;',
    attrPresence: 'n = h.attrPresence(n, r, "#{1}", c); c = false;',
    attr: function(m) {
      m[3] = (m[5] || m[6]);
      return new Template('n = h.attr(n, r, "#{1}", "#{3}", "#{2}", c); c = false;').evaluate(m);
    },
    pseudo: function(m) {
      if (m[6]) m[6] = m[6].replace(/"/g, '\\"');
      return new Template('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m);
    },
    descendant:   'c = "descendant";',
    child:        'c = "child";',
    adjacent:     'c = "adjacent";',
    laterSibling: 'c = "laterSibling";'
  },

  patterns: [
    { name: 'laterSibling', re: /^\s*~\s*/ },
    { name: 'child',        re: /^\s*>\s*/ },
    { name: 'adjacent',     re: /^\s*\+\s*/ },
    { name: 'descendant',   re: /^\s/ },

    { name: 'tagName',      re: /^\s*(\*|[\w\-]+)(\b|$)?/ },
    { name: 'id',           re: /^#([\w\-\*]+)(\b|$)/ },
    { name: 'className',    re: /^\.([\w\-\*]+)(\b|$)/ },
    { name: 'pseudo',       re: /^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|(?=\s|[:+~>]))/ },
    { name: 'attrPresence', re: /^\[((?:[\w-]+:)?[\w-]+)\]/ },
    { name: 'attr',         re: /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/ }
  ],

  assertions: {
    tagName: function(element, matches) {
      return matches[1].toUpperCase() == element.tagName.toUpperCase();
    },

    className: function(element, matches) {
      return Element.hasClassName(element, matches[1]);
    },

    id: function(element, matches) {
      return element.id === matches[1];
    },

    attrPresence: function(element, matches) {
      return Element.hasAttribute(element, matches[1]);
    },

    attr: function(element, matches) {
      var nodeValue = Element.readAttribute(element, matches[1]);
      return nodeValue && Selector.operators[matches[2]](nodeValue, matches[5] || matches[6]);
    }
  },

  handlers: {
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        a.push(node);
      return a;
    },

    mark: function(nodes) {
      var _true = Prototype.emptyFunction;
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = _true;
      return nodes;
    },

    unmark: (function(){

      var PROPERTIES_ATTRIBUTES_MAP = (function(){
        var el = document.createElement('div'),
            isBuggy = false,
            propName = '_countedByPrototype',
            value = 'x'
        el[propName] = value;
        isBuggy = (el.getAttribute(propName) === value);
        el = null;
        return isBuggy;
      })();

      return PROPERTIES_ATTRIBUTES_MAP ?
        function(nodes) {
          for (var i = 0, node; node = nodes[i]; i++)
            node.removeAttribute('_countedByPrototype');
          return nodes;
        } :
        function(nodes) {
          for (var i = 0, node; node = nodes[i]; i++)
            node._countedByPrototype = void 0;
          return nodes;
        }
    })(),

    index: function(parentNode, reverse, ofType) {
      parentNode._countedByPrototype = Prototype.emptyFunction;
      if (reverse) {
        for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
          var node = nodes[i];
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
        }
      } else {
        for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++)
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
      }
    },

    unique: function(nodes) {
      if (nodes.length == 0) return nodes;
      var results = [], n;
      for (var i = 0, l = nodes.length; i < l; i++)
        if (typeof (n = nodes[i])._countedByPrototype == 'undefined') {
          n._countedByPrototype = Prototype.emptyFunction;
          results.push(Element.extend(n));
        }
      return Selector.handlers.unmark(results);
    },

    descendant: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, node.getElementsByTagName('*'));
      return results;
    },

    child: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        for (var j = 0, child; child = node.childNodes[j]; j++)
          if (child.nodeType == 1 && child.tagName != '!') results.push(child);
      }
      return results;
    },

    adjacent: function(nodes) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        var next = this.nextElementSibling(node);
        if (next) results.push(next);
      }
      return results;
    },

    laterSibling: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, Element.nextSiblings(node));
      return results;
    },

    nextElementSibling: function(node) {
      while (node = node.nextSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    previousElementSibling: function(node) {
      while (node = node.previousSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    tagName: function(nodes, root, tagName, combinator) {
      var uTagName = tagName.toUpperCase();
      var results = [], h = Selector.handlers;
      if (nodes) {
        if (combinator) {
          if (combinator == "descendant") {
            for (var i = 0, node; node = nodes[i]; i++)
              h.concat(results, node.getElementsByTagName(tagName));
            return results;
          } else nodes = this[combinator](nodes);
          if (tagName == "*") return nodes;
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName.toUpperCase() === uTagName) results.push(node);
        return results;
      } else return root.getElementsByTagName(tagName);
    },

    id: function(nodes, root, id, combinator) {
      var targetNode = $(id), h = Selector.handlers;

      if (root == document) {
        if (!targetNode) return [];
        if (!nodes) return [targetNode];
      } else {
        if (!root.sourceIndex || root.sourceIndex < 1) {
          var nodes = root.getElementsByTagName('*');
          for (var j = 0, node; node = nodes[j]; j++) {
            if (node.id === id) return [node];
          }
        }
      }

      if (nodes) {
        if (combinator) {
          if (combinator == 'child') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (targetNode.parentNode == node) return [targetNode];
          } else if (combinator == 'descendant') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Element.descendantOf(targetNode, node)) return [targetNode];
          } else if (combinator == 'adjacent') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Selector.handlers.previousElementSibling(targetNode) == node)
                return [targetNode];
          } else nodes = h[combinator](nodes);
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node == targetNode) return [targetNode];
        return [];
      }
      return (targetNode && Element.descendantOf(targetNode, root)) ? [targetNode] : [];
    },

    className: function(nodes, root, className, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      return Selector.handlers.byClassName(nodes, root, className);
    },

    byClassName: function(nodes, root, className) {
      if (!nodes) nodes = Selector.handlers.descendant([root]);
      var needle = ' ' + className + ' ';
      for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
        nodeClassName = node.className;
        if (nodeClassName.length == 0) continue;
        if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle))
          results.push(node);
      }
      return results;
    },

    attrPresence: function(nodes, root, attr, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var results = [];
      for (var i = 0, node; node = nodes[i]; i++)
        if (Element.hasAttribute(node, attr)) results.push(node);
      return results;
    },

    attr: function(nodes, root, attr, value, operator, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var handler = Selector.operators[operator], results = [];
      for (var i = 0, node; node = nodes[i]; i++) {
        var nodeValue = Element.readAttribute(node, attr);
        if (nodeValue === null) continue;
        if (handler(nodeValue, value)) results.push(node);
      }
      return results;
    },

    pseudo: function(nodes, name, value, root, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      if (!nodes) nodes = root.getElementsByTagName("*");
      return Selector.pseudos[name](nodes, value, root);
    }
  },

  pseudos: {
    'first-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.previousElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'last-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.nextElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'only-child': function(nodes, value, root) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!h.previousElementSibling(node) && !h.nextElementSibling(node))
          results.push(node);
      return results;
    },
    'nth-child':        function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root);
    },
    'nth-last-child':   function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true);
    },
    'nth-of-type':      function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, false, true);
    },
    'nth-last-of-type': function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true, true);
    },
    'first-of-type':    function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, false, true);
    },
    'last-of-type':     function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, true, true);
    },
    'only-of-type':     function(nodes, formula, root) {
      var p = Selector.pseudos;
      return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root);
    },

    getIndices: function(a, b, total) {
      if (a == 0) return b > 0 ? [b] : [];
      return $R(1, total).inject([], function(memo, i) {
        if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
        return memo;
      });
    },

    nth: function(nodes, formula, root, reverse, ofType) {
      if (nodes.length == 0) return [];
      if (formula == 'even') formula = '2n+0';
      if (formula == 'odd')  formula = '2n+1';
      var h = Selector.handlers, results = [], indexed = [], m;
      h.mark(nodes);
      for (var i = 0, node; node = nodes[i]; i++) {
        if (!node.parentNode._countedByPrototype) {
          h.index(node.parentNode, reverse, ofType);
          indexed.push(node.parentNode);
        }
      }
      if (formula.match(/^\d+$/)) { // just a number
        formula = Number(formula);
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.nodeIndex == formula) results.push(node);
      } else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
        if (m[1] == "-") m[1] = -1;
        var a = m[1] ? Number(m[1]) : 1;
        var b = m[2] ? Number(m[2]) : 0;
        var indices = Selector.pseudos.getIndices(a, b, nodes.length);
        for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
          for (var j = 0; j < l; j++)
            if (node.nodeIndex == indices[j]) results.push(node);
        }
      }
      h.unmark(nodes);
      h.unmark(indexed);
      return results;
    },

    'empty': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (node.tagName == '!' || node.firstChild) continue;
        results.push(node);
      }
      return results;
    },

    'not': function(nodes, selector, root) {
      var h = Selector.handlers, selectorType, m;
      var exclusions = new Selector(selector).findElements(root);
      h.mark(exclusions);
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node._countedByPrototype) results.push(node);
      h.unmark(exclusions);
      return results;
    },

    'enabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node.disabled && (!node.type || node.type !== 'hidden'))
          results.push(node);
      return results;
    },

    'disabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.disabled) results.push(node);
      return results;
    },

    'checked': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.checked) results.push(node);
      return results;
    }
  },

  operators: {
    '=':  function(nv, v) { return nv == v; },
    '!=': function(nv, v) { return nv != v; },
    '^=': function(nv, v) { return nv == v || nv && nv.startsWith(v); },
    '$=': function(nv, v) { return nv == v || nv && nv.endsWith(v); },
    '*=': function(nv, v) { return nv == v || nv && nv.include(v); },
    '~=': function(nv, v) { return (' ' + nv + ' ').include(' ' + v + ' '); },
    '|=': function(nv, v) { return ('-' + (nv || "").toUpperCase() +
     '-').include('-' + (v || "").toUpperCase() + '-'); }
  },

  split: function(expression) {
    var expressions = [];
    expression.scan(/(([\w#:.~>+()\s-]+|\*|\[.*?\])+)\s*(,|$)/, function(m) {
      expressions.push(m[1].strip());
    });
    return expressions;
  },

  matchElements: function(elements, expression) {
    var matches = $$(expression), h = Selector.handlers;
    h.mark(matches);
    for (var i = 0, results = [], element; element = elements[i]; i++)
      if (element._countedByPrototype) results.push(element);
    h.unmark(matches);
    return results;
  },

  findElement: function(elements, expression, index) {
    if (Object.isNumber(expression)) {
      index = expression; expression = false;
    }
    return Selector.matchElements(elements, expression || '*')[index || 0];
  },

  findChildElements: function(element, expressions) {
    expressions = Selector.split(expressions.join(','));
    var results = [], h = Selector.handlers;
    for (var i = 0, l = expressions.length, selector; i < l; i++) {
      selector = new Selector(expressions[i].strip());
      h.concat(results, selector.findElements(element));
    }
    return (l > 1) ? h.unique(results) : results;
  }
});

if (Prototype.Browser.IE) {
  Object.extend(Selector.handlers, {
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        if (node.tagName !== "!") a.push(node);
      return a;
    }
  });
}

function $$() {
  return Selector.findChildElements(document, $A(arguments));
}

var Form = {
  reset: function(form) {
    form = $(form);
    form.reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit;

    var data = elements.inject({ }, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          if (key in result) {
            if (!Object.isArray(result[key])) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return options.hash ? data : Object.toQueryString(data);
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    var elements = $(form).getElementsByTagName('*'),
        element,
        arr = [ ],
        serializers = Form.Element.Serializers;
    for (var i = 0; element = elements[i]; i++) {
      arr.push(element);
    }
    return arr.inject([], function(elements, child) {
      if (serializers[child.tagName.toLowerCase()])
        elements.push(Element.extend(child));
      return elements;
    })
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return /^(?:input|select|textarea)$/i.test(element.tagName);
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/


Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {

  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !(/^(?:button|reset|submit)$/i.test(element.type))))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;

var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = {
  input: function(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return Form.Element.Serializers.inputSelector(element, value);
      default:
        return Form.Element.Serializers.textarea(element, value);
    }
  },

  inputSelector: function(element, value) {
    if (Object.isUndefined(value)) return element.checked ? element.value : null;
    else element.checked = !!value;
  },

  textarea: function(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  },

  select: function(element, value) {
    if (Object.isUndefined(value))
      return this[element.type == 'select-one' ?
        'selectOne' : 'selectMany'](element);
    else {
      var opt, currentValue, single = !Object.isArray(value);
      for (var i = 0, length = element.length; i < length; i++) {
        opt = element.options[i];
        currentValue = this.optionValue(opt);
        if (single) {
          if (currentValue == value) {
            opt.selected = true;
            return;
          }
        }
        else opt.selected = value.include(currentValue);
      }
    }
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    return Element.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
};

/*--------------------------------------------------------------------------*/


Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
(function() {

  var Event = {
    KEY_BACKSPACE: 8,
    KEY_TAB:       9,
    KEY_RETURN:   13,
    KEY_ESC:      27,
    KEY_LEFT:     37,
    KEY_UP:       38,
    KEY_RIGHT:    39,
    KEY_DOWN:     40,
    KEY_DELETE:   46,
    KEY_HOME:     36,
    KEY_END:      35,
    KEY_PAGEUP:   33,
    KEY_PAGEDOWN: 34,
    KEY_INSERT:   45,

    cache: {}
  };

  var docEl = document.documentElement;
  var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl
    && 'onmouseleave' in docEl;

  var _isButton;
  if (Prototype.Browser.IE) {
    var buttonMap = { 0: 1, 1: 4, 2: 2 };
    _isButton = function(event, code) {
      return event.button === buttonMap[code];
    };
  } else if (Prototype.Browser.WebKit) {
    _isButton = function(event, code) {
      switch (code) {
        case 0: return event.which == 1 && !event.metaKey;
        case 1: return event.which == 1 && event.metaKey;
        default: return false;
      }
    };
  } else {
    _isButton = function(event, code) {
      return event.which ? (event.which === code + 1) : (event.button === code);
    };
  }

  function isLeftClick(event)   { return _isButton(event, 0) }

  function isMiddleClick(event) { return _isButton(event, 1) }

  function isRightClick(event)  { return _isButton(event, 2) }

  function element(event) {
    event = Event.extend(event);

    var node = event.target, type = event.type,
     currentTarget = event.currentTarget;

    if (currentTarget && currentTarget.tagName) {
      if (type === 'load' || type === 'error' ||
        (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
          && currentTarget.type === 'radio'))
            node = currentTarget;
    }

    if (node.nodeType == Node.TEXT_NODE)
      node = node.parentNode;

    return Element.extend(node);
  }

  function findElement(event, expression) {
    var element = Event.element(event);
    if (!expression) return element;
    var elements = [element].concat(element.ancestors());
    return Selector.findElement(elements, expression, 0);
  }

  function pointer(event) {
    return { x: pointerX(event), y: pointerY(event) };
  }

  function pointerX(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollLeft: 0 };

    return event.pageX || (event.clientX +
      (docElement.scrollLeft || body.scrollLeft) -
      (docElement.clientLeft || 0));
  }

  function pointerY(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollTop: 0 };

    return  event.pageY || (event.clientY +
       (docElement.scrollTop || body.scrollTop) -
       (docElement.clientTop || 0));
  }


  function stop(event) {
    Event.extend(event);
    event.preventDefault();
    event.stopPropagation();

    event.stopped = true;
  }

  Event.Methods = {
    isLeftClick: isLeftClick,
    isMiddleClick: isMiddleClick,
    isRightClick: isRightClick,

    element: element,
    findElement: findElement,

    pointer: pointer,
    pointerX: pointerX,
    pointerY: pointerY,

    stop: stop
  };


  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (Prototype.Browser.IE) {
    function _relatedTarget(event) {
      var element;
      switch (event.type) {
        case 'mouseover': element = event.fromElement; break;
        case 'mouseout':  element = event.toElement;   break;
        default: return null;
      }
      return Element.extend(element);
    }

    Object.extend(methods, {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return '[object Event]' }
    });

    Event.extend = function(event, element) {
      if (!event) return false;
      if (event._extendedByPrototype) return event;

      event._extendedByPrototype = Prototype.emptyFunction;
      var pointer = Event.pointer(event);

      Object.extend(event, {
        target: event.srcElement || element,
        relatedTarget: _relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });

      return Object.extend(event, methods);
    };
  } else {
    Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
    Object.extend(Event.prototype, methods);
    Event.extend = Prototype.K;
  }

  function _createResponder(element, eventName, handler) {
    var registry = Element.retrieve(element, 'prototype_event_registry');

    if (Object.isUndefined(registry)) {
      CACHE.push(element);
      registry = Element.retrieve(element, 'prototype_event_registry', $H());
    }

    var respondersForEvent = registry.get(eventName);
    if (Object.isUndefined(respondersForEvent)) {
      respondersForEvent = [];
      registry.set(eventName, respondersForEvent);
    }

    if (respondersForEvent.pluck('handler').include(handler)) return false;

    var responder;
    if (eventName.include(":")) {
      responder = function(event) {
        if (Object.isUndefined(event.eventName))
          return false;

        if (event.eventName !== eventName)
          return false;

        Event.extend(event, element);
        handler.call(element, event);
      };
    } else {
      if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED &&
       (eventName === "mouseenter" || eventName === "mouseleave")) {
        if (eventName === "mouseenter" || eventName === "mouseleave") {
          responder = function(event) {
            Event.extend(event, element);

            var parent = event.relatedTarget;
            while (parent && parent !== element) {
              try { parent = parent.parentNode; }
              catch(e) { parent = element; }
            }

            if (parent === element) return;

            handler.call(element, event);
          };
        }
      } else {
        responder = function(event) {
          Event.extend(event, element);
          handler.call(element, event);
        };
      }
    }

    responder.handler = handler;
    respondersForEvent.push(responder);
    return responder;
  }

  function _destroyCache() {
    for (var i = 0, length = CACHE.length; i < length; i++) {
      Event.stopObserving(CACHE[i]);
      CACHE[i] = null;
    }
  }

  var CACHE = [];

  if (Prototype.Browser.IE)
    window.attachEvent('onunload', _destroyCache);

  if (Prototype.Browser.WebKit)
    window.addEventListener('unload', Prototype.emptyFunction, false);


  var _getDOMEventName = Prototype.K;

  if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED) {
    _getDOMEventName = function(eventName) {
      var translations = { mouseenter: "mouseover", mouseleave: "mouseout" };
      return eventName in translations ? translations[eventName] : eventName;
    };
  }

  function observe(element, eventName, handler) {
    element = $(element);

    var responder = _createResponder(element, eventName, handler);

    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.addEventListener)
        element.addEventListener("dataavailable", responder, false);
      else {
        element.attachEvent("ondataavailable", responder);
        element.attachEvent("onfilterchange", responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);

      if (element.addEventListener)
        element.addEventListener(actualEventName, responder, false);
      else
        element.attachEvent("on" + actualEventName, responder);
    }

    return element;
  }

  function stopObserving(element, eventName, handler) {
    element = $(element);

    var registry = Element.retrieve(element, 'prototype_event_registry');

    if (Object.isUndefined(registry)) return element;

    if (eventName && !handler) {
      var responders = registry.get(eventName);

      if (Object.isUndefined(responders)) return element;

      responders.each( function(r) {
        Element.stopObserving(element, eventName, r.handler);
      });
      return element;
    } else if (!eventName) {
      registry.each( function(pair) {
        var eventName = pair.key, responders = pair.value;

        responders.each( function(r) {
          Element.stopObserving(element, eventName, r.handler);
        });
      });
      return element;
    }

    var responders = registry.get(eventName);

    if (!responders) return;

    var responder = responders.find( function(r) { return r.handler === handler; });
    if (!responder) return element;

    var actualEventName = _getDOMEventName(eventName);

    if (eventName.include(':')) {
      if (element.removeEventListener)
        element.removeEventListener("dataavailable", responder, false);
      else {
        element.detachEvent("ondataavailable", responder);
        element.detachEvent("onfilterchange",  responder);
      }
    } else {
      if (element.removeEventListener)
        element.removeEventListener(actualEventName, responder, false);
      else
        element.detachEvent('on' + actualEventName, responder);
    }

    registry.set(eventName, responders.without(responder));

    return element;
  }

  function fire(element, eventName, memo, bubble) {
    element = $(element);

    if (Object.isUndefined(bubble))
      bubble = true;

    if (element == document && document.createEvent && !element.dispatchEvent)
      element = document.documentElement;

    var event;
    if (document.createEvent) {
      event = document.createEvent('HTMLEvents');
      event.initEvent('dataavailable', true, true);
    } else {
      event = document.createEventObject();
      event.eventType = bubble ? 'ondataavailable' : 'onfilterchange';
    }

    event.eventName = eventName;
    event.memo = memo || { };

    if (document.createEvent)
      element.dispatchEvent(event);
    else
      element.fireEvent(event.eventType, event);

    return Event.extend(event);
  }


  Object.extend(Event, Event.Methods);

  Object.extend(Event, {
    fire:          fire,
    observe:       observe,
    stopObserving: stopObserving
  });

  Element.addMethods({
    fire:          fire,

    observe:       observe,

    stopObserving: stopObserving
  });

  Object.extend(document, {
    fire:          fire.methodize(),

    observe:       observe.methodize(),

    stopObserving: stopObserving.methodize(),

    loaded:        false
  });

  if (window.Event) Object.extend(window.Event, Event);
  else window.Event = Event;
})();

(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards, John Resig, and Diego Perini. */

  var timer;

  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (timer) window.clearTimeout(timer);
    document.loaded = true;
    document.fire('dom:loaded');
  }

  function checkReadyState() {
    if (document.readyState === 'complete') {
      document.stopObserving('readystatechange', checkReadyState);
      fireContentLoadedEvent();
    }
  }

  function pollDoScroll() {
    try { document.documentElement.doScroll('left'); }
    catch(e) {
      timer = pollDoScroll.defer();
      return;
    }
    fireContentLoadedEvent();
  }

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false);
  } else {
    document.observe('readystatechange', checkReadyState);
    if (window == top)
      timer = pollDoScroll.defer();
  }

  Event.observe(window, 'load', fireContentLoadedEvent);
})();

Element.addMethods();

/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

var Position = {
  includeScrollOffsets: false,

  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },


  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return Element.clonePosition(target, source, options);
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return $(parentElement || document.body).getElementsByClassName(className);
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/
