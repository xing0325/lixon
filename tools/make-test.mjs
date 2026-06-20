// make-test.mjs — extract the knowledge-graph slice from index.html into a
// standalone _graph_test.html (no WebGL hero / SPA / boot) for headless screenshots.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8');

const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); return html.slice(i, j); };
const css     = cut('/* --- knowledge graph · full-screen pinned', '/* --- updating list + 蹲蹲 --- */');
const section = cut('<!-- ====== 04 · KNOWLEDGE GRAPH', '<!-- ====== 03 · UPDATING');
const js      = cut('/* --- 8g. knowledge graph', '/* --- 8h. updating list');

const out = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{ --paper:#efefe5; --ink:#282c20; --ink-soft:#5c6150; --accent:#d2ff00; --orange:#ff6b00;
  --dark:#282c20; --dark-1:#3b3c38; --dark-soft:#b4b8a5; --ease:cubic-bezier(.19,1,.22,1); }
*{ box-sizing:border-box; }
body{ margin:0; background:var(--dark); font-family:'Mona Sans Variable',Arial,Helvetica,sans-serif; }
.eyebrow{ font-size:12px; letter-spacing:.14em; text-transform:uppercase; }
h2{ font-size:clamp(30px,4.2vw,58px); line-height:.92; font-weight:760; margin:0; }
h2 .alt{ -webkit-text-stroke:1px #f4f4ed; color:transparent; }
.serif-it{ font-family:Georgia,serif; font-style:italic; }
.s-graph{ height:3000px !important; }        /* headless Edge resolves svh poorly — pin to px for the test only */
.graph-pin{ height:100vh !important; }
${css}
</style></head><body>
${section}
<script>
${js}
</script>
<script>
  // ?view=GitHub switches platform view · ?p=0.4 drives scroll-growth to 40% · default = locked/full
  addEventListener('load', ()=>{
    const q=new URLSearchParams(location.search);
    const v=q.get('view'); if(v){ const tab=[...document.querySelectorAll('#graphViews button')].find(b=>b.textContent===v); if(tab) tab.click(); }
    const p=q.get('p');
    if(p!==null){ const s=document.getElementById('graph'); const target=Math.round((s.offsetHeight-innerHeight)*parseFloat(p));
      let n=0; (function hold(){ window.scrollTo(0,target); if(n++<150) requestAnimationFrame(hold); })(); }
    else { const b=document.getElementById('graphLock'); if(b) b.click(); }
  });
</script>
</body></html>`;

fs.writeFileSync(path.join(dir, '..', '_graph_test.html'), out);
console.log('✓ _graph_test.html written (', out.length, 'bytes )');
console.log('  css', css.length, '· section', section.length, '· js', js.length);
