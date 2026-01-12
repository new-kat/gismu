
const C = 'bcdfgjklmnprstvxz';
const V = 'aeiou';
const VALID_CC_INITIALS = new Set([
	'bl','br','cf','ck','cl','cm','cn','cp','cr','ct','dj','dr','dz','fl','fr','gl','gr','jb','jd','jg','jm','jv','kl','kr','ml','mr','pl','pr','sf','sk','sl','sm','sn','sp','sr','st','tc','tr','ts','vl','vr','xl','xr','zb','zd','zg','zm','zv'
]);
const FORBIDDEN_CC = new Set(['cx','kx','xc','xk','mz']);
const FORBIDDEN_CCC = new Set(['ndj','ndz','ntc','nts']);
const DIPTH = new Set(["ai", "au", "oi", "ei"]);
const SIBILANT = new Set('cjsz'.split(''));
const VOICED = new Set('bdgjvz'.split(''));
const UNVOICED = new Set('cfkpstx'.split(''));
const LANGUAGE_WEIGHTS = {
	'1985':[0.360,0.160,0.210,0.110,0.090,0.070],
	'1987':[0.360,0.156,0.208,0.116,0.087,0.073],
	'1994':[0.348,0.194,0.163,0.123,0.088,0.084],
	'1995':[0.347,0.196,0.160,0.123,0.089,0.085], //default
	'1999':[0.334,0.195,0.187,0.116,0.081,0.088],
	'2025':[0.338,0.262,0.135,0.123,0.074,0.068]  //ntsekees'
};
const SIMILARITIES = {b:'pv', c:'js', d:'t', f:'pv', g:'kx', j:'cz', k:'gx', l:'r', m:'n', n:'m', p:'bf', r:'l', s:'cz', t:'d', v:'bf', x:'gk', z:'js'};

// start

const byId = (id)=>document.getElementById(id); // tired of typing
const textbox = document.getElementById("weights");
function weightparser(preset,custom,count){
	if(preset!=="custom" && LANGUAGE_WEIGHTS[preset]){
		return [...LANGUAGE_WEIGHTS[preset]];}
	if(!custom) throw new Error('either choose a weight preset or give custom weights.');
	const parts = custom.split(/\s*,\s*/).map(Number);
	if(parts.some(x=>!(x>0))) throw new Error('weights must be numbers > 0.');
	return parts;
}

function lcsMatrix(a,b){
	const m=a.length,n=b.length; const mat=Array.from({length:m+1},()=>new Array(n+1).fill(0));
	for(let i=0;i<m;i++){
		const ai=a[i];
		for(let j=0;j<n;j++){
			mat[i+1][j+1] = (ai===b[j]) ? mat[i][j]+1 : Math.max(mat[i+1][j], mat[i][j+1]);
		}
	}
	return mat;
}
function lcsLength(a,b){ return lcsMatrix(a,b)[a.length][b.length]; }

function shapefind(gim){
    const qwerty = l => (V.includes(l) ? "V" : "C")
    const pattrn = 
        qwerty(gim[0])+
        qwerty(gim[1])+
        qwerty(gim[2])+
        qwerty(gim[3])+
        qwerty(gim[4]);
return pattrn;
}

function rafsi(gim) {   //assumes only cvccv or ccvcv!

    if (shapefind(gim) == "CVCCV"){
        return [gim[0]+gim[1]+gim[2], 
                gim[0]+gim[1]+gim[3],
                gim[0]+gim[1]+"\'"+gim[4],
                (DIPTH.has(gim[1]+gim[4])?gim[0]+gim[1]+gim[4]:""),
                (VALID_CC_INITIALS.has(gim[2]+gim[3])? gim[2]+gim[3]+gim[4] : ""),
                (VALID_CC_INITIALS.has(gim[0]+gim[2])?gim[0]+gim[2]+gim[1]:"")].filter(Boolean);
} else{
        return [gim[0]+gim[2]+gim[3], gim[1]+gim[2]+gim[3], gim[0]+gim[2]+"\'"+gim[4], 
                (DIPTH.has(gim[2]+gim[4])?gim[0]+gim[2]+gim[4]:""),
                (DIPTH.has(gim[2]+gim[4])?gim[1]+gim[2]+gim[4]:""),
                gim[1]+gim[2]+"\'"+gim[4],
                (VALID_CC_INITIALS.has(gim[0]+gim[1])?gim[0]+gim[1]+gim[2]:"")].filter(Boolean);
}
};
function letters4words(words){
	const letters = new Set(words.join('').split(''));
	const cs=[...letters].filter(l=>C.includes(l)).join('');
	const vs=[...letters].filter(l=>V.includes(l)).join('');
	return [cs||C, vs||V]; // fallback just in case
}
function validatorforCC(i){
	if(i===0){
		return x=>VALID_CC_INITIALS.has(x.slice(0,2));
	} else {
        const j = i+1; //keep unchanged
		return x=> x[i]!==x[i+1] &&
			!(VOICED.has(x[i]) && UNVOICED.has(x[j])) &&
			!(UNVOICED.has(x[i]) && VOICED.has(x[j])) &&
			!(SIBILANT.has(x[i]) && SIBILANT.has(x[j])) &&
			!FORBIDDEN_CC.has(x.slice(i,j+1));
	}
}
function validatorforCCC(i){ return x=>!FORBIDDEN_CCC.has(x.slice(i,i+3)); }
function invalidatorForInitialCC(i){ return x=>!VALID_CC_INITIALS.has(x.slice(i,i+2)); }
function validatorForPredicates(preds){
	if(preds.length===0) return _=>true;
	if(preds.length===1) return preds[0];
	return x=>!preds.some(p=>p(x)===false);
}
function shapevalid8r(shape){
	const s=shape.toLowerCase(); const preds=[]; const slen=s.length;
	for(let i=0;i<slen-1;i++){
		if(s[i]==='c' && s[i+1]==='c'){
			preds.push(validatorforCC(i));
			if(i<slen-2 && s[i+2]==='c') preds.push(validatorforCCC(i));
			if(i<(slen-4) && i>0 && s.slice(i,i+5)==='ccvcv') preds.push(invalidatorForInitialCC(i));
		}
	}
	return validatorForPredicates(preds);
}
function* shapeiter8r(shape, cs, vs){
	const pools=[...shape.toLowerCase()].map(ch=> ch==='c'?cs:vs);
	const validate = shapevalid8r(shape);
	function* build(idx, acc){
		if(idx===pools.length){
			const candidate=acc.join('');
			if(validate(candidate)) yield candidate;
			return;
		}
		const pool=pools[idx];
		for(let k=0;k<pool.length;k++){
			acc.push(pool[k]);
			yield* build(idx+1, acc);
			acc.pop();
		}
	}
	yield* build(0, []);
}
function* candidatemaker(shapes, cs, vs){
	for(const s of shapes){
		yield* shapeiter8r(s.trim(), cs, vs);
	}
}

// == scoring
function scoreDyadbyPattern(candidate, inputWord){
	const patterns=[];
	for(let i=0;i<candidate.length-2;i++){
		const c = candidate[i];
		patterns.push(`${c}(${candidate[i+1]}|.${candidate[i+2]})`);
	}
	patterns.push(candidate.slice(-2));
	return patterns.some(p=>new RegExp(p).test(inputWord)) ? 2 : 0;
}
function similarityscore(candidate, input){
	const candchars=[...candidate];
	const inchars=[...input];
	const lcs = lcsLength(candchars, inchars);
	let score=0;
	if(lcs<2) score=0; else if(lcs===2) score=scoreDyadbyPattern(candidate, input); else score=lcs;
	return score / input.length;
}
function weightedcomputer(candidate, words, weights){
	const sims = words.map(w=>similarityscore(candidate, w));
	const sum = sims.reduce((acc,x,i)=>acc + x * weights[i], 0);
	return {sum, sims};
}

// == deduplication
class GismuMatcher{
	constructor(gismus, stemLength=4){ this.gismus=gismus; this.stemLength=stemLength; }
	matchStem(g, c){ return c.slice(0,this.stemLength)===g.slice(0,this.stemLength); }
	stringsMatchExcept(x,y,i,j){ return x.slice(0,i)===y.slice(0,i) && x.slice(i+1,j)===y.slice(i+1,j); }
	matchstructuralpattern(letter, pattern){return (pattern==='.')? false : pattern.includes(letter); }
	matchStructure(g,c,struct){
		const common=Math.min(g.length,c.length);
		for(let i=0;i<common;i++){
			if(this.stringsMatchExcept(g,c,i,common)){
				if(this.matchstructuralpattern(g[i], struct[i])) return true;
                   //  i was supposed to write something here but i forgot
			}
		}
		return false;
	}
	findSimilar(candidate){
		const pat = [...candidate].map(x=> SIMILARITIES[x] || '.');
		for(const g of this.gismus){
			if(this.matchStem(g,candidate) || this.matchStructure(g,candidate,pat)) return g;
		}
		return null;
	}
}

// == main flow
let gismulist = OFFICIAL.slice();

byId('fileChoice').addEventListener('change', e => {
	const value = e.target.value;
	if (value === "official") gismulist = OFFICIAL.slice();	
	if (value === "allofem") gismulist = JBOVLA.slice();
	if (value === "nocheck") gismulist = ["qqqqq"];

});

let shapes = ["CVCCV","CCVCV"];
let gimtai = true;

byId('weightsPreset').addEventListener('change', (e)=>{
	const v=e.target.value; if(v!=="custom")
{ byId('weights').value = LANGUAGE_WEIGHTS[v].join(','); customw.classList.add("hidden");}
else {customw.classList.remove("hidden");}
		
});

byId('allowedshapes').addEventListener('change', (e)=>{
	const q = byId("allowedshapes").value;
	if (q == "") {
			shapes = ["CVCCV","CCVCV"];
	} else {
		shapes = q.split(",").filter(Boolean);
}
    gimtai = (shapes == ["CVCCV","CCVCV"]);
});

byId('weights').value = LANGUAGE_WEIGHTS['1995'].join(',');

function tablerenderer(rows){
	const tbody = byId('results').querySelector('tbody');
	tbody.innerHTML = rows.map((r,i)=>`
		<tr>
			<td>${i+1}</td>
			<td>${r[0].toFixed(6)}</td>
			<td class="mono">${r[1]}</td>
			<td class="muted">${r[2].map(x=>x.toFixed(3)).join(',')}</td>
			<td class="clash">${r[3]?r[3]:""}</td>
		</tr>
	`).join('');
		final.classList.remove("hidden");
}

byId('runBtn').addEventListener('click', ()=>{
	const t0=performance.now();
	byId('winner').textContent='---';
	byId('winnerNote').textContent='';

	try{
		const words = (
	[byId('zh').value, byId('hi').value, byId('en').value, byId('es').value, byId('ru').value, byId('ar').value].filter(Boolean)
		.map(w => w.toLowerCase()));

		if(words.length<2) throw new Error('enter at least 2 source words.');

		const preset = byId('weightsPreset').value;
		const weights = weightparser(preset, byId('weights').value.trim(), words.length);
		if(weights.length!==words.length) throw new Error(`there are ${weights.length} different weight values you told; yet you only gave ${words.length} source words.`);

		const [cs,vs] = letters4words(words);

		const cands=[];
		for(const cand of candidatemaker(shapes, cs, vs)) cands.push(cand);
		byId('candCount').textContent=cands.length.toLocaleString();

		const scored=[];
		for(let i=0;i<cands.length;i++){
			const cand=cands[i];
			const {sum, sims} = weightedcomputer(cand, words, weights);
			scored.push([sum, cand, sims]);
			if(i%100===0) byId('scoredCount').textContent=(i+1).toLocaleString();
		}
		byId('scoredCount').textContent=scored.length.toLocaleString();
		scored.sort((a,b)=> b[0]-a[0]);
		const topN = Math.max(10, Math.min(5000, parseInt(byId('topN').value||'100',10)));
		if(gismulist.length>0){
			const matcher = new GismuMatcher(gismulist);
			let winner=null, clash=null, checkifwin = False;
			for(const blah of scored){
				const [score,candidate] = blah;
				const g = matcher.findSimilar(candidate);
				if(g===null){ if(!checkifwin){winner=candidate;checkifwin = True}; if(byId("clashcheck").checked){break;}} else { clash=g;};
				blah.push(g);
			}
			if(winner){
				byId("rafsilist").textContent = gimtai ? rafsi(winner).filter(x => !RAFSILIST.has(x)).join(", ") : "";
				byId('winner').textContent = winner.toUpperCase();
			} else {
				byId('winner').textContent = 'no suitable candidates in the scored set.';
				byId("rafsilist").textContent = "";
				byId('winnerNote').textContent = clash ? `most clashes resembled "${clash}"` : '';
			}
		} else {
			byId('winnerNote').textContent = 'mabla!!! i cant access any gismu list???';
		}
    tablerenderer(scored.slice(0, topN));

		const t1=performance.now();
		byId('timeTaken').textContent = Math.round(t1-t0);

	} catch(err){
		alert(err.message);
	}
});
