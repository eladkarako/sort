(async ()=>{ "use strict";

async function sleep(ms){
  return new Promise(resolve=>{
    self.setTimeout(()=>{
      resolve();
    },ms);
  });
}

EventTarget.prototype.once_event_listener = async function(event_name){
  const target = this
       ,event_options = {once:true, passive:true, capture:false}
       ;
  return new Promise(resolve=>{
    function foo_callback(ev){ "use strict";
      target.removeEventListener(event_name, foo_callback, event_options); //even-though using {once:true
      resolve(ev);
    }
    target.addEventListener(event_name, foo_callback, event_options);
  });
}

function natural_compare(a, b){
  let ax=[]
     ,bx=[]
     ;
  if("function" === typeof natural_compare.extraction_rule){
    a = natural_compare.extraction_rule(a);
    b = natural_compare.extraction_rule(b);
  }
//    if("number" === typeof a && "number" === typeof b) return b-a;

  if("object" === typeof a){ return  1; }
  if("object" === typeof b){ return -1; }

  if("boolean" === typeof a){ a = !!a ? 1 : 0;}
  if("boolean" === typeof b){ b = !!b ? 1 : 0;}

  a = String(a);
  b = String(b);


  a.replace(/(\d+)|(\D+)/g, function(_, $1, $2){ ax.push([$1 || Infinity, $2 || ""]); });
  b.replace(/(\d+)|(\D+)/g, function(_, $1, $2){ bx.push([$1 || Infinity, $2 || ""]); });

  for(let an, bn, nn;  ax.length > 0 && bx.length > 0 ;){
    an = ax.shift();
    bn = bx.shift();
    nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
    if(nn) return nn;
  }
  return ax.length - bx.length;
}

self.natural_compare = natural_compare;

const KEYS = {
 ENTER      :  13  //sort lines.
,BACKSLASH  : 220  //sort lines and ,

,J          :  74  //json beautify (as is).
,K          :  75  //json deep sort + beautify.

,O          :  79  //open and read into textarea.
,S          :  83  //save textarea value to text file and download it.

,L          :  76  //clear textarea.
,W          :  87  //toggle visual line-wrap-break.
};


function deep_sort(item){
  const regexp_normalizable = /(array|map|list)/i; //it is best to move this outside if possible.
  let item_original = item;

  if(null        === item
  || "undefined" === typeof item
  || "object"    !== typeof item
  || "undefined" === typeof item.constructor){ return item; }  //item can't be sorted, return as is.

  item = ("arraybuffer" === item.constructor.name.toLowerCase())  ?  new Uint8Array(item)  :  item;  //optimization - buffer can be normalized to array (in the next line) for that you need to wrap it with typed-array (optional).
  item = (true === regexp_normalizable.test(item.constructor))    ?  Array.from(item)      :  item;  //optimization - various maps, lists, arrays can be normalized to plain array (optional).

  if("number" === typeof item.length && 0 === item.length){ return item_original; }  //possible generic fix.
  item_original = undefined; //cleanup.

  //walking all sub-items, recursive call to sort THEM FIRST. works fine for both array and object.
  Object.keys(item)
        .forEach((key) => {
          item[key] = deep_sort(item[key]);
        });

  //--- all sub-items are sorted. ..NOW, SORT "SELF"!

  if("array"  === item.constructor.name.toLowerCase()){ return item.sort(natural_compare); }  //array built-in "re-order" items by value. same as `Object.values(array).sort(natural_compare).map(a => a);` .

  const o = new Object(null); //getting object keys, sorting them, adding the "back" to new object. pretty much what `array.sort` does implicitly.
  Object.keys(item)
        .sort(natural_compare)
        .forEach(key => {
          o[key] = item[key];
        });

  return o;
}

function normalize_newline(s){
  return s.replace(/[\r\n]+/gm,"\n")
          .replace(/\n+/gm,"\r\n")
          ;
}



const time_start = Number(new Date());
console.log("[INFO] waiting for document finish loading...")
if("complete" !== self.document.readState){
  //await self.document.once_event_listener("DOMContentLoaded"); //wait until document "DOMContentLoaded"
  await self.once_event_listener("load");                        //wait until "window.onload"
  await sleep(300);                                              //sleep additional 300milliseconds.
}

const time_done = ((Number(new Date()) - time_start) / 1000);
console.log("[INFO] document finished loading (" + time_done.toFixed(4) + " seconds)");



const textarea   = document.querySelector("textarea")
     ,downloader = document.querySelector('[id="downloader"]')
     ,opener     = document.querySelector('[id="opener"]')
    ;


self.textarea   = textarea;
self.downloader = downloader;
self.opener     = opener;


//document.querySelector("html").setAttribute("data-placeholder", textarea.placeholder);


function set_textarea_value(s){
  self.getSelection().removeAllRanges();
  textarea.blur();
  self.getSelection().removeAllRanges();
  textarea.focus();
  textarea.select();

  try{
    self.document.execCommand("insertText", false, s);
  }catch(err){
    textarea.value = s;
  }

  textarea.blur();
  self.getSelection().removeAllRanges();
  textarea.focus();
  self.getSelection().removeAllRanges();
  textarea.selectionStart = 0;
  textarea.selectionEnd = 0;
  textarea.scrollTo(0,0);
  textarea.focus();
}


function reset_selection_focus(){
  self.getSelection().removeAllRanges();
  textarea.scrollTo(0,0);
  textarea.selectionStart = 0;
  textarea.selectionEnd = 0;
  textarea.focus();
}


reset_selection_focus();


async function read_file_to_textarea(){
  textarea.value = await opener.files[0].text()
  reset_selection_focus();
  
  //set_textarea_value(
  //  await opener.files[0].text()
  //);
}


function file_open_change_handler(ev){
  ev.preventDefault();
  if(!opener.files || 0 === opener.files.length){return false;}
  read_file_to_textarea();
  return false;
}


opener.addEventListener("change",  file_open_change_handler , {capture:true, passive:false, once:false});


function sort_and_unique_array_of_strings(arr){
  return arr.map(s=>s.trim())
            .filter(function(s){return s.length > 0})
            .reduce(function(carry,current,index,array){
               carry[current] = "";
               return ((index+1 === array.length) ? Object.keys(carry) : carry);
            },{})
            .sort(natural_compare)
            ;
}


async function sort_and_unique_textarea(extended_to_also_inline){
  extended_to_also_inline = ("boolean" === typeof extended_to_also_inline ? extended_to_also_inline : false);
  
  let lines = textarea.value
                      .replace(/[\r\n]+/gm,"\n")
                      .split("\n")
                      ;
  
  if(extended_to_also_inline){
    lines = lines.map(line=>(sort_and_unique_array_of_strings( line.split(",") ).join(",")));
  }

  lines = sort_and_unique_array_of_strings(lines);
    
  textarea.value = lines.join("\r\n");
  //reset_selection_focus();
  
  //set_textarea_value( lines.join("\r\n") );
}


async function json_beautify(is_deep_sort){
  var json;

  json = JSON.parse(textarea.value);
  json = !!is_deep_sort ? deep_sort(json) : json;
  json = JSON.stringify(json, null, 2)
             .replace(/,[\r\n] /g, "\r\n ,")
             .replace(/ *(,( +))/g,"$2,")
             ;
  textarea.value = json;
  //set_textarea_value( json );
}


async function save_textarea_to_file(){
  var date = new Date();
  downloader.download = date.toISOString()
                            .replace(/\..*$/,"")
                            .replace(/[\-\:]/ig,"")
                            .replace(/T/i,"_")
                      + ".txt"
                      ;
  var href;
  try{
    href = new Blob([textarea.value],{type:"text/plain;charset=UTF-8"});
    href = new File([href], downloader.download, {"LastModified": date});
    downloader.href = self.URL.createObjectURL(href);
  }catch(err){
    try{
      downloader.href = "data:text/plain;charset:UTF-8;base64,"
                      + btoa(unescape(encodeURIComponent(textarea.value)));
    }catch(err){
      downloader.href = "data:text/plain;charset:UTF-8," + encodeURIComponent(textarea.value);
    }
  }

  downloader.click();

  try{
    self.URL.revokeObjectURL(downloader.href);
  }catch(err){}
  downloader.href = "";
}



function key_handler(ev){
  console.log(ev);
  const key_code = ev.keyCode || ev.which
       ,is_match = (true === ev.ctrlKey && KEYS.ENTER     === key_code)
                 ||(true === ev.altKey  && KEYS.ENTER     === key_code)
                 ||(true === ev.altKey  && KEYS.BACKSLASH === key_code)
                 ||(true === ev.altKey  && KEYS.S         === key_code)
                 ||(true === ev.altKey  && KEYS.O         === key_code)
                 ||(true === ev.altKey  && KEYS.J         === key_code)
                 ||(true === ev.altKey  && KEYS.K         === key_code)
                 ||(true === ev.altKey  && KEYS.L         === key_code)
                 ||(true === ev.altKey  && KEYS.W         === key_code)
       ;

  if(false === is_match){
    return true;
  }

  console.log("[INFO] functionality key",ev);
  
  ev.cancelBubble = true;
  ev.preventDefault();
  //ev.stopPropagation();
  //ev.stopImmediatePropagation();

  
  if(      KEYS.ENTER     === key_code){
    sort_and_unique_textarea();
  
  }else if(KEYS.BACKSLASH === key_code){
    sort_and_unique_textarea(true);
  
  }else if(KEYS.S         === key_code){
    save_textarea_to_file();
  
  }else if(KEYS.O         === key_code){
    opener.type  = "";
    opener.value = "";
    opener.type  = "file"
    opener.click();
  
  }else if(KEYS.J         === key_code){
    json_beautify(false);
  
  }else if(KEYS.K         === key_code){
    json_beautify(true);
  
  }else if(KEYS.L         === key_code){
    textarea.value = "";
    //set_textarea_value( "" );
  
  }else if(KEYS.W         === key_code){
    textarea.classList.toggle("wrap-lines-ON");
  }

  return false;
}


self.onkeydown = self.onkeyup = self.onkeypress = self.document.onkeydown = self.document.onkeyup = self.document.onkeypress = function(ev){
  const key_code = ev.keyCode || ev.which
       ,is_match = (true === ev.ctrlKey && KEYS.ENTER     === key_code)
                 ||(true === ev.altKey  && KEYS.ENTER     === key_code)
                 ||(true === ev.altKey  && KEYS.BACKSLASH === key_code)
                 ||(true === ev.altKey  && KEYS.S         === key_code)
                 ||(true === ev.altKey  && KEYS.O         === key_code)
                 ||(true === ev.altKey  && KEYS.J         === key_code)
                 ||(true === ev.altKey  && KEYS.K         === key_code)
                 ||(true === ev.altKey  && KEYS.L         === key_code)
                 ||(true === ev.altKey  && KEYS.W         === key_code)
       ;
  if(is_match){
    ev.preventDefault();
  }
  return true;
};


textarea.onkeyup = key_handler;




})();