const CACHE = "gym-planner-v1";
(function(){
 var K="gym-greet",g={on:true,text:"مرحبا ضياء، اشتقتلك"},ss=window.speechSynthesis,spoken=false;
 try{var o=JSON.parse(localStorage.getItem(K)||"null");if(o)g={on:o.on!==false,text:o.text||g.text}}catch(e){}
 function sv(){try{localStorage.setItem(K,JSON.stringify(g))}catch(e){}}
 function say(force){
  if(!ss||!g.text.trim()||ss.speaking)return;
  var vs=(ss.getVoices()||[]).filter(function(v){return /^ar/i.test(v.lang)});
  var u=new SpeechSynthesisUtterance(g.text);u.lang="ar-SA";
  if(vs[0]){u.voice=vs[0];u.lang=vs[0].lang}
  u.rate=.95;u.pitch=1.1;
  u.onstart=function(){spoken=true};
  ss.cancel();ss.speak(u)}
 function arm(){
  function f(){
   document.removeEventListener("pointerdown",f,true);
   document.removeEventListener("keydown",f,true);
   if(!spoken&&g.on)say(true)}
  document.addEventListener("pointerdown",f,true);
  document.addEventListener("keydown",f,true)}
 var on=document.getElementById("gOn"),tx=document.getElementById("gTxt");
 on.checked=g.on;tx.value=g.text;
 on.onchange=function(){g.on=on.checked;sv()};
 tx.oninput=function(){g.text=tx.value;sv()};
 document.getElementById("gTest").onclick=function(){if(ss&&ss.speaking)ss.cancel();say(true)};
 if(g.on&&ss){arm();setTimeout(function(){if(!spoken&&g.on)say(false)},600)}
})();
const CACHE_NAME = 'gym-planner-v1';
'./videos/biceps.mp4',
  const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './videos/biceps.mp4'
];
'./videos/arnold-240',
'./videos/chest.mp4',
'./videos/shoulders.mp4',
'./videos/back.mp4',
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest'
];
const APP = ["./", "./index.html", "./manifest.webmanifest"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(c => c.put(event.request, copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
