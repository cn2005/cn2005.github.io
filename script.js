(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  root.classList.add("js");

  /* ---------------------------------------------------------
     Page enter / leave
     --------------------------------------------------------- */
  requestAnimationFrame(() => root.classList.add("is-ready"));

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) root.classList.remove("is-leaving");
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;

    const url = new URL(link.href, location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "file:") return;
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;

    event.preventDefault();
    root.classList.add("is-leaving");
    window.setTimeout(() => {
      location.href = url.href;
    }, reduceMotion ? 0 : 420);
  });

  /* ---------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------- */
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    const step = parseFloat(group.dataset.stagger) || 0.08;
    group.querySelectorAll(":scope > [data-reveal]").forEach((el, index) => {
      el.style.setProperty("--d", `${(index * step).toFixed(2)}s`);
    });
  });

  const revealElements = document.querySelectorAll("[data-reveal]");
  const revealAll = () => revealElements.forEach((el) => el.classList.add("is-in"));

  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealAll();
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 }
    );
    window.setTimeout(() => revealElements.forEach((el) => observer.observe(el)), 260);
  }

  /* ---------------------------------------------------------
     Scroll-lit statement text
     --------------------------------------------------------- */
  const scrubs = [...document.querySelectorAll("[data-scrub]")].map((el) => {
    const text = el.textContent.trim().replace(/\s+/g, " ");
    el.setAttribute("aria-label", text);
    el.textContent = "";
    const fragment = document.createDocumentFragment();
    const chars = [];
    for (const char of text) {
      const span = document.createElement("span");
      span.className = "ch";
      span.setAttribute("aria-hidden", "true");
      span.textContent = char;
      fragment.appendChild(span);
      chars.push(span);
    }
    el.appendChild(fragment);
    if (reduceMotion) chars.forEach((c) => c.classList.add("on"));
    return { el, chars, lit: reduceMotion ? chars.length : 0 };
  });

  function updateScrubs(vh) {
    if (reduceMotion) return;
    scrubs.forEach((item) => {
      const rect = item.el.getBoundingClientRect();
      const progress = clamp((vh * 0.82 - rect.top) / (rect.height + vh * 0.3), 0, 1);
      const target = Math.round(progress * item.chars.length);
      if (target === item.lit) return;
      if (target > item.lit) {
        for (let i = item.lit; i < target; i += 1) item.chars[i].classList.add("on");
      } else {
        for (let i = target; i < item.lit; i += 1) item.chars[i].classList.remove("on");
      }
      item.lit = target;
    });
  }

  /* ---------------------------------------------------------
     Header, progress, parallax
     --------------------------------------------------------- */
  const header = document.querySelector("[data-header]");
  const progress = document.querySelector(".progress");
  const parallaxItems = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
    el,
    frame: el.parentElement,
    speed: parseFloat(el.dataset.parallax) || 0.1,
    y: 0,
  }));
  let lastScrollY = window.scrollY;

  function updateHeader(y) {
    if (!header) return;
    header.classList.toggle("is-scrolled", y > 40);
    if (y > lastScrollY + 4 && y > 240) header.classList.add("is-hidden");
    else if (y < lastScrollY - 4 || y < 240) header.classList.remove("is-hidden");
    lastScrollY = y;
  }

  function updateProgress(y, vh) {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
  }

  function updateParallax(vh) {
    if (reduceMotion) return;
    parallaxItems.forEach((item) => {
      const rect = item.frame.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > vh + 100) return;
      const limit = rect.height * 0.055;
      const offset = clamp((rect.top + rect.height / 2 - vh / 2) * -item.speed, -limit, limit);
      item.y = lerp(item.y, offset, 0.12);
      item.el.style.transform = `translate3d(0, ${item.y.toFixed(2)}px, 0) scale(1.12)`;
    });
  }

  /* ---------------------------------------------------------
     Cursor bubble & magnetic elements
     --------------------------------------------------------- */
  const cursor = { el: null, x: -200, y: -200, tx: -200, ty: -200, s: 0, ts: 0 };

  if (finePointer && !reduceMotion) {
    cursor.el = document.createElement("div");
    cursor.el.className = "cursor";
    cursor.el.setAttribute("aria-hidden", "true");
    cursor.el.textContent = "查看";
    document.body.appendChild(cursor.el);

    window.addEventListener(
      "pointermove",
      (event) => {
        cursor.tx = event.clientX;
        cursor.ty = event.clientY;
      },
      { passive: true }
    );

    document.querySelectorAll("[data-cursor]").forEach((el) => {
      el.addEventListener("pointerenter", () => {
        cursor.el.textContent = el.dataset.cursor || "查看";
        if (cursor.s < 0.05) {
          cursor.x = cursor.tx;
          cursor.y = cursor.ty;
        }
        cursor.ts = 1;
      });
      el.addEventListener("pointerleave", () => {
        cursor.ts = 0;
      });
    });

    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.3;
      el.classList.add("magnetic");
      el.addEventListener("pointermove", (event) => {
        const rect = el.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  function updateCursor() {
    if (!cursor.el) return;
    cursor.x = lerp(cursor.x, cursor.tx, 0.2);
    cursor.y = lerp(cursor.y, cursor.ty, 0.2);
    cursor.s = lerp(cursor.s, cursor.ts, 0.16);
    cursor.el.style.transform = `translate3d(${cursor.x.toFixed(1)}px, ${cursor.y.toFixed(1)}px, 0) scale(${cursor.s.toFixed(3)})`;
  }

  /* ---------------------------------------------------------
     Small utilities
     --------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  document.querySelectorAll("[data-compare]").forEach((el) => {
    const input = el.querySelector("input[type='range']");
    if (!input) return;
    const update = () => el.style.setProperty("--pos", `${input.value}%`);
    input.addEventListener("input", update);
    update();
  });

  document.querySelectorAll("[data-copy]").forEach((button) => {
    const label = button.querySelector("span") || button;
    const original = label.textContent;
    button.addEventListener("click", async () => {
      const value = button.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const field = document.createElement("textarea");
        field.value = value;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      label.textContent = "已复制";
      window.setTimeout(() => {
        label.textContent = original;
      }, 1600);
    });
  });

  /* ---------------------------------------------------------
     WebGL — raymarched SDF scenes
     --------------------------------------------------------- */
  const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";

  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScene;
uniform vec2 uShift;
uniform float uZoom;
uniform float uView;
uniform float uK;
uniform float uTwist;
uniform float uDisp;
uniform float uMorph;
uniform vec4 uMix;
uniform float uStepNorm;

mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float smin(float a,float b,float k){k=max(k,1e-4);float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdRoundBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}

float sdRing(vec3 q){
  vec2 c=vec2(length(q.xz)-.82,q.y);
  float tube=length(c)-.15;
  if(uTwist<.001) return tube;
  c*=rot(atan(q.z,q.x)*1.5+uTime*.6);
  vec2 d=abs(c)-vec2(.21,.045);
  float ribbon=length(max(d,0.))+min(max(d.x,d.y),0.)-.02;
  return mix(tube,ribbon,uTwist);
}

vec2 mapObj(vec3 p){
  if(uScene<.5){
    vec3 q=p;
    q.xz*=rot(uTime*.16);
    q.yz*=rot(.6+sin(uTime*.21)*.18);
    float ring=sdRing(q);
    vec3 c=vec3(sin(uTime*.47)*.32,sin(uTime*.31)*.16-.02,cos(uTime*.39)*.28);
    vec3 s=p-c;
    float blob=length(s)-.44;
    if(uMorph>.001){
      s.xy*=rot(uTime*.5);
      s.yz*=rot(uTime*.37);
      blob=mix(blob,sdRoundBox(s,vec3(.29),.08),uMorph);
    }
    float d=smin(ring,blob,uK);
    if(uDisp>.001){
      float t=uTime*1.2;
      d+=uDisp*.045*sin(7.*p.x+t)*sin(7.*p.y+t*1.3)*sin(7.*p.z-t*.7);
    }
    return vec2(d,1.);
  }
  vec2 r=vec2(1e5,0.);
  for(int i=0;i<5;i++){
    float fi=float(i);
    float bob=sin(uTime*.6+fi*1.3)*.025;
    float d=length(p-vec3((fi-2.)*.7,-.66+bob,0.))-.34;
    if(d<r.x) r=vec2(d,1.+fi);
  }
  return r;
}

vec2 map(vec3 p){
  vec2 o=mapObj(p);
  float f=p.y+1.;
  return f<o.x?vec2(f,0.):o;
}

vec3 march(vec3 ro,vec3 rd){
  float t=0.;
  float m=-1.;
  float n=0.;
  float sf=.9/(1.+.6*uDisp+.15*uTwist);
  for(int i=0;i<110;i++){
    vec2 h=map(ro+rd*t);
    n+=1.;
    if(abs(h.x)<.0005*t+.0002){m=h.y;break;}
    t+=h.x*sf;
    if(t>16.)break;
  }
  return vec3(t,m,n);
}

vec3 heat(float x){
  vec3 c=mix(vec3(.035),vec3(.94,.39,.23),smoothstep(0.,.55,x));
  return mix(c,vec3(1.,.96,.88),smoothstep(.55,1.,x));
}

vec3 calcNormal(vec3 p){
  vec2 e=vec2(.0007,-.0007);
  return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x);
}

float softShadow(vec3 ro,vec3 rd){
  float res=1.;
  float t=.02;
  for(int i=0;i<48;i++){
    float h=mapObj(ro+rd*t).x;
    res=min(res,10.*h/t);
    t+=clamp(h,.015,.3);
    if(res<.001||t>6.)break;
  }
  res=clamp(res,0.,1.);
  return res*res*(3.-2.*res);
}

float calcAO(vec3 p,vec3 n){
  float occ=0.;
  float sca=1.;
  for(int i=0;i<5;i++){
    float h=.012+.11*float(i)/4.;
    float d=map(p+h*n).x;
    occ+=(h-d)*sca;
    sca*=.92;
  }
  return clamp(1.-2.6*occ,0.,1.);
}

vec3 brdf(vec3 n,vec3 v,vec3 l,vec3 alb,float rough,float f0){
  vec3 h=normalize(l+v);
  float ndl=max(dot(n,l),0.);
  float ndv=max(dot(n,v),.001);
  float ndh=max(dot(n,h),0.);
  float vdh=max(dot(v,h),0.);
  float a=rough*rough;
  float a2=a*a;
  float dd=ndh*ndh*(a2-1.)+1.;
  float D=a2/(3.14159*dd*dd);
  float k=(rough+1.)*(rough+1.)/8.;
  float G=(ndl/(ndl*(1.-k)+k))*(ndv/(ndv*(1.-k)+k));
  float F=f0+(1.-f0)*pow(1.-vdh,5.);
  float spec=D*G*F/(4.*ndl*ndv+.001);
  return (alb*(1.-F)/3.14159+vec3(spec))*ndl;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  uv=uv*uZoom-uShift;

  vec3 ro;
  vec3 ta;
  if(uScene<.5){ro=vec3(0.,.55,5.6);ta=vec3(0.,-.18,0.);}
  else{ro=vec3(0.,.35,4.2);ta=vec3(0.,-.62,0.);}
  ro.xz*=rot(uMouse.x*.1);
  ro.y+=uMouse.y*.08;

  vec3 ww=normalize(ta-ro);
  vec3 uu=normalize(cross(ww,vec3(0.,1.,0.)));
  vec3 vv=cross(uu,ww);
  vec3 rd=normalize(uv.x*uu+uv.y*vv+2.1*ww);

  vec3 bg=vec3(.039,.039,.043);
  vec3 back=bg+vec3(.034,.032,.03)*exp(-dot(uv,uv)*1.6);
  vec3 col=back;

  vec3 hit=march(ro,rd);
  vec3 dbg=uView>4.5?heat(hit.z/uStepNorm):vec3(.035);
  if(hit.y>-.5){
    vec3 p=ro+rd*hit.x;
    vec3 n=calcNormal(p);
    vec3 v=-rd;
    float ao=calcAO(p,n);

    float la=uTime*(uScene<.5?.11:.23);
    vec3 l1=uScene<.5
      ?normalize(vec3(-.6+sin(la)*.3+uMouse.x*1.5,1.05+uMouse.y*.6,.75))
      :normalize(vec3(-.9+sin(la)*.35+uMouse.x*.6,1.05+uMouse.y*.25,.75));
    vec3 l2=normalize(vec3(.9,.45,-1.));

    vec3 alb;
    float rough;
    float f0=.04;
    if(hit.y<.5){alb=vec3(.045);rough=.55;}
    else if(uScene<.5){alb=vec3(.1);rough=.22;}
    else{
      float id=hit.y-1.;
      rough=.12+.19*id;
      alb=abs(id-2.)<.1?vec3(.62,.13,.05):vec3(.11);
    }

    float sh=softShadow(p+n*.003,l1);
    vec3 lin=brdf(n,v,l1,alb,rough,f0)*vec3(1.,.9,.8)*3.4*sh;
    lin+=brdf(n,v,l2,alb,rough,f0)*vec3(.55,.66,.9)*1.3;

    vec3 r=reflect(rd,n);
    float fre=f0+(1.-f0)*pow(1.-max(dot(n,v),0.),5.);
    float env=smoothstep(.1,.9,r.y);
    lin+=vec3(.9,.88,.85)*env*fre*ao*(1.-rough)*(1.-rough)*.6;
    lin+=alb*vec3(.08,.085,.1)*ao*(.6+.4*n.y);

    float fog=0.;
    if(hit.y<.5){
      lin*=exp(-.16*dot(p.xz,p.xz));
      fog=smoothstep(1.8,5.,length(p.xz));
    }

    col=(lin*(2.51*lin+.03))/(lin*(2.43*lin+.59)+.14);
    col=pow(clamp(col,0.,1.),vec3(.4545));
    col=mix(col,back,fog);

    float dep=pow(1.-clamp((hit.x-4.3)/3.4,0.,1.),1.4);
    float shd=sh*max(dot(n,l1),0.);
    vec3 pass=dbg;
    if(uView<1.5) pass=(n*.5+.5)*(hit.y<.5?.16:1.);
    else if(uView<2.5) pass=vec3(dep);
    else if(uView<3.5) pass=vec3(ao);
    else if(uView<4.5) pass=vec3(shd);
    else if(uView>5.5){
      vec3 tint=vec3(.94,.39,.23)*1.6;
      vec3 S=mix(vec3(shd),shd*tint,uMix.w);
      vec3 A=mix(vec3(ao),ao*tint,uMix.w);
      vec3 D=mix(vec3(dep),dep*tint,uMix.w);
      float tot=uMix.x+uMix.y+uMix.z;
      pass=(max(1.-tot,0.)*dbg+uMix.x*S+uMix.y*A+uMix.z*D)/max(tot,1.);
      pass=mix(pass,dbg,fog);
    }
    dbg=uView<4.5?mix(pass,vec3(.035),fog):pass;
  }
  if(uView>.5) col=dbg;

  col+=(hash(gl_FragCoord.xy+fract(uTime))-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true }
  );

  const SCENES = { hero: 0, materials: 1 };
  const glViews = [];

  const LAB_DEFAULT = { view: 0, k: 0.34, twist: 0, disp: 0, morph: 0 };

  // Each parameter breathes on its own period; the periods share no common
  // short multiple, so the combined shape keeps drifting instead of looping.
  const LAB_RULES = {
    k: { lo: 0.14, hi: 0.48, period: 11, phase: 0.15 },
    twist: { lo: 0.1, hi: 1, period: 19, phase: 0 },
    disp: { lo: 0.08, hi: 0.85, period: 13, phase: 0.35 },
    morph: { lo: 0, hi: 1, period: 9, phase: 0.6 },
  };
  // Step Mix pass: steps heat map as base, lerped with shadow / AO / depth.
  // Open index.html?tune to adjust these live and copy the result back here.
  const STEP_MIX = {
    shadow: 0.58,
    ao: 0.91,
    depth: 0.55,
    tint: 0.8,
    stepNorm: 101,
  };

  const heroLab = { ...LAB_DEFAULT, view: 6 };
  const labMeters = [];
  let labChanged = false;

  document.querySelectorAll("[data-lab]").forEach((panel) => {
    panel.querySelectorAll("[data-meter]").forEach((el) => {
      labMeters.push({ el, key: el.dataset.meter, value: el.querySelector("output") });
    });
  });

  if (new URLSearchParams(location.search).has("tune")) {
    const ranges = {
      shadow: [0, 1, 0.01],
      ao: [0, 1, 0.01],
      depth: [0, 1, 0.01],
      tint: [0, 1, 0.01],
      stepNorm: [16, 110, 1],
    };
    const tune = document.createElement("div");
    tune.className = "tune";
    tune.innerHTML = `<p class="label">Step Mix — Tune</p>${Object.keys(ranges)
      .map((key) => {
        const [min, max, step] = ranges[key];
        return `<label class="tune-row"><span class="label">${key}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${STEP_MIX[key]}" data-tune="${key}" /><output class="label">${STEP_MIX[key]}</output></label>`;
      })
      .join("")}<button type="button" class="tune-copy label">复制参数</button>`;
    document.body.appendChild(tune);

    tune.querySelectorAll("[data-tune]").forEach((input) => {
      input.addEventListener("input", () => {
        STEP_MIX[input.dataset.tune] = Number(input.value);
        input.nextElementSibling.textContent = input.value;
        labChanged = true;
      });
    });

    const copy = tune.querySelector(".tune-copy");
    copy.addEventListener("click", async () => {
      const body = Object.keys(STEP_MIX)
        .map((key) => `    ${key}: ${STEP_MIX[key]},`)
        .join("\n");
      const text = `  const STEP_MIX = {\n${body}\n  };`;
      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = "已复制";
      } catch {
        console.log(text);
        copy.textContent = "已输出到控制台";
      }
      window.setTimeout(() => {
        copy.textContent = "复制参数";
      }, 1600);
    });
  }

  let meterClock = 0;
  function updateLab(now) {
    const seconds = reduceMotion ? 6 : now / 1000;
    Object.keys(LAB_RULES).forEach((key) => {
      const r = LAB_RULES[key];
      const w = 0.5 - 0.5 * Math.cos((seconds / r.period + r.phase) * Math.PI * 2);
      heroLab[key] = r.lo + (r.hi - r.lo) * w * w * (3 - 2 * w);
    });
    if (labMeters.length && now - meterClock > 90) {
      meterClock = now;
      labMeters.forEach((m) => {
        const r = LAB_RULES[m.key];
        m.el.style.setProperty("--v", ((heroLab[m.key] - r.lo) / (r.hi - r.lo)).toFixed(3));
        if (m.value) m.value.textContent = heroLab[m.key].toFixed(2);
      });
    }
    const changed = labChanged;
    labChanged = false;
    return changed;
  }
  let glScale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.72;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function createView(canvas) {
    const fail = () => {
      canvas.parentElement.classList.add("no-gl");
      return null;
    };
    let gl = null;
    try {
      gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch {
      gl = null;
    }
    if (!gl) return fail();

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return fail();

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return fail();
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {};
    ["uRes", "uTime", "uMouse", "uScene", "uShift", "uZoom", "uView", "uK", "uTwist", "uDisp", "uMorph", "uMix", "uStepNorm"].forEach((name) => {
      uniforms[name] = gl.getUniformLocation(program, name);
    });

    const view = {
      canvas,
      gl,
      uniforms,
      scene: SCENES[canvas.dataset.gl] ?? 0,
      visible: false,
      dirty: true,
      drawn: false,
      width: 0,
      height: 0,
      aspect: 1,
    };

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        view.dirty = true;
      }).observe(canvas);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          view.visible = entry.isIntersecting;
        });
      }).observe(canvas);
    } else {
      view.visible = true;
    }

    return view;
  }

  function resizeView(view) {
    const rect = view.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * glScale));
    const height = Math.max(1, Math.round(rect.height * glScale));
    view.aspect = rect.width / Math.max(1, rect.height);
    if (width !== view.width || height !== view.height) {
      view.canvas.width = width;
      view.canvas.height = height;
      view.width = width;
      view.height = height;
      view.gl.viewport(0, 0, width, height);
    }
    view.dirty = false;
  }

  function drawView(view, time) {
    const { gl, uniforms, scene, aspect } = view;
    let shiftX = 0;
    let shiftY = 0;
    let zoom = 1;
    if (scene === 0) {
      if (aspect > 1.15) shiftX = Math.min(0.42, (aspect - 1) * 0.4);
      if (aspect < 1) {
        zoom = 1.25 / aspect;
        shiftY = 0.42;
      }
    } else if (aspect < 1.6) {
      zoom = 1.6 / aspect;
    }
    gl.uniform2f(uniforms.uRes, view.width, view.height);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform2f(uniforms.uMouse, pointer.sx, pointer.sy);
    gl.uniform1f(uniforms.uScene, scene);
    gl.uniform2f(uniforms.uShift, shiftX, shiftY);
    gl.uniform1f(uniforms.uZoom, zoom);
    const lab = scene === 0 ? heroLab : LAB_DEFAULT;
    gl.uniform1f(uniforms.uView, lab.view);
    gl.uniform1f(uniforms.uK, lab.k);
    gl.uniform1f(uniforms.uTwist, lab.twist);
    gl.uniform1f(uniforms.uDisp, lab.disp);
    gl.uniform1f(uniforms.uMorph, lab.morph);
    gl.uniform4f(uniforms.uMix, STEP_MIX.shadow, STEP_MIX.ao, STEP_MIX.depth, STEP_MIX.tint);
    gl.uniform1f(uniforms.uStepNorm, STEP_MIX.stepNorm);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!view.drawn) {
      view.drawn = true;
      view.canvas.classList.add("is-live");
    }
  }

  document.querySelectorAll("canvas[data-gl]").forEach((canvas) => {
    const view = createView(canvas);
    if (view) glViews.push(view);
  });

  const frameTimes = [];
  function adaptQuality(dt) {
    if (!glViews.some((v) => v.visible) || dt > 200) return;
    frameTimes.push(dt);
    if (frameTimes.length < 45) return;
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    frameTimes.length = 0;
    if (avg > 24 && glScale > 0.36) {
      glScale = Math.max(0.36, glScale * 0.82);
      glViews.forEach((v) => {
        v.dirty = true;
      });
    }
  }

  function updateGL(now) {
    if (!glViews.length) return;
    pointer.sx = lerp(pointer.sx, pointer.x, 0.04);
    pointer.sy = lerp(pointer.sy, pointer.y, 0.04);
    const time = reduceMotion ? 8 : now / 1000;
    const labMoving = updateLab(now);
    glViews.forEach((view) => {
      if (!view.visible) return;
      const resized = view.dirty;
      if (resized) resizeView(view);
      if (reduceMotion && view.drawn && !resized && !(labMoving && view.scene === 0)) return;
      drawView(view, time);
    });
  }

  /* ---------------------------------------------------------
     Live OLAT relight: I = A + w · max(L − A, 0)
     --------------------------------------------------------- */
  const RELIGHT_FRAG = `
precision mediump float;
uniform sampler2D uAmb;
uniform sampler2D uSun;
uniform vec2 uRes;
uniform float uW;
const float LOGM=5.6147098;
vec3 dec(vec3 e){return exp2(e*LOGM)-1.;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  uv.y=1.-uv.y;
  vec3 a=dec(texture2D(uAmb,uv).rgb);
  vec3 s=dec(texture2D(uSun,uv).rgb);
  gl_FragColor=vec4(srgb(aces(a+uW*s)),1.);
}`;

  const relights = [];

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function initRelight(r) {
    const fail = () => {
      r.idle = false;
      r.el.classList.add("no-gl");
      r.show(1);
    };
    let gl = null;
    try {
      gl = r.canvas.getContext("webgl", { antialias: false, alpha: false });
    } catch {
      gl = null;
    }
    if (!gl) return fail();

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, RELIGHT_FRAG);
    if (!vs || !fs) return fail();
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return fail();
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    r.gl = gl;
    r.uRes = gl.getUniformLocation(program, "uRes");
    r.uW = gl.getUniformLocation(program, "uW");
    gl.uniform1i(gl.getUniformLocation(program, "uAmb"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "uSun"), 1);

    Promise.all([loadImage(r.canvas.dataset.amb), loadImage(r.canvas.dataset.sun)])
      .then((images) => {
        images.forEach((img, unit) => {
          const tex = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        });
        r.ready = true;
        r.dirty = true;
      })
      .catch(fail);
  }

  function drawRelight(r) {
    const { gl, canvas } = r;
    if (r.dirty) {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const size = Math.max(1, Math.min(1024, Math.round(rect.width * scale)));
      if (canvas.width !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(r.uRes, canvas.width, canvas.height);
      r.dirty = false;
    }
    gl.uniform1f(r.uW, r.w);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    r.drawnW = r.w;
    if (!canvas.classList.contains("is-live")) canvas.classList.add("is-live");
  }

  document.querySelectorAll("[data-relight]").forEach((el) => {
    const canvas = el.querySelector("canvas");
    const input = el.querySelector("input[type='range']");
    const output = el.querySelector("[data-relight-value]");
    const ticks = [...el.querySelectorAll("[data-w]")];
    if (!canvas || !input) return;

    const r = {
      el,
      canvas,
      input,
      w: input.value / 100,
      target: input.value / 100,
      idle: !reduceMotion,
      visible: !("IntersectionObserver" in window),
      ready: false,
      dirty: true,
      drawnW: -1,
    };
    r.show = (w) => {
      if (output) output.textContent = w.toFixed(2);
      ticks.forEach((b) => b.classList.toggle("is-on", Math.abs(parseFloat(b.dataset.w) - w) < 0.005));
    };

    const take = () => {
      r.idle = false;
    };
    input.addEventListener("pointerdown", take);
    input.addEventListener("input", () => {
      take();
      r.target = input.value / 100;
    });
    ticks.forEach((b) =>
      b.addEventListener("click", () => {
        take();
        r.target = parseFloat(b.dataset.w);
        input.value = Math.round(r.target * 100);
      })
    );

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          r.visible = entry.isIntersecting;
        });
      }).observe(el);
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        r.dirty = true;
      }).observe(canvas);
    }

    r.show(r.w);
    initRelight(r);
    relights.push(r);
  });

  function updateRelight(now) {
    relights.forEach((r) => {
      if (!r.visible || !r.ready) return;
      if (r.idle) {
        r.target = 0.9 + 0.6 * Math.sin((now / 1000) * 0.7);
        r.input.value = Math.round(r.target * 100);
      }
      r.w = lerp(r.w, r.target, 0.16);
      if (Math.abs(r.w - r.target) < 0.0005) r.w = r.target;
      if (Math.abs(r.w - r.drawnW) < 0.0005 && !r.dirty) return;
      r.show(r.w);
      drawRelight(r);
    });
  }

  /* ---------------------------------------------------------
     Main loop
     --------------------------------------------------------- */
  let lastFrame = performance.now();

  function tick(now) {
    const dt = now - lastFrame;
    lastFrame = now;
    const y = window.scrollY;
    const vh = window.innerHeight;

    updateHeader(y);
    updateProgress(y, vh);
    updateParallax(vh);
    updateScrubs(vh);
    updateCursor();
    updateGL(now);
    updateRelight(now);
    adaptQuality(dt);

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
