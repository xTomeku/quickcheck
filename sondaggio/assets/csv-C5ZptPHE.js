async function e(e){let t=await e.arrayBuffer();try{return new TextDecoder(`utf-8`,{fatal:!0}).decode(t)}catch{return new TextDecoder(`windows-1252`).decode(t)}}function t(e){let t=e.replace(/^﻿/,``),n=t.split(/\r?\n/,1)[0]??``,r=[`;`,`,`,`	`].map(e=>({c:e,n:n.split(e).length})).sort((e,t)=>t.n-e.n)[0].c,i=[],a=[],o=``,s=!1;for(let e=0;e<t.length;e++){let n=t[e];s?n===`"`&&t[e+1]===`"`?(o+=`"`,e++):n===`"`?s=!1:o+=n:n===`"`?s=!0:n===r?(a.push(o),o=``):n===`
`||n===`\r`?(n===`\r`&&t[e+1]===`
`&&e++,a.push(o),i.push(a),a=[],o=``):o+=n}return(o!==``||a.length>0)&&(a.push(o),i.push(a)),i.filter(e=>e.some(e=>e.trim()!==``))}function n(e){let t=e=>/[";\r\n]/.test(e)?`"${e.replace(/"/g,`""`)}"`:e;return`﻿`+e.map(e=>e.map(t).join(`;`)).join(`\r
`)+`\r
`}export{e as n,t as r,n as t};