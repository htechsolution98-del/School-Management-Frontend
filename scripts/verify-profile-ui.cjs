const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(path.join(os.tmpdir(), 'sms-profile-verification/node_modules/playwright'));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZQAAAABJRU5ErkJggg==', 'base64');
const profile = { id:25, name:'Aarav', surname:'Patel', full_name:'Aarav Patel', father_name:'Rajesh', mother_name:'Priya', class_name:'Std 2', gr_no:'GR25', division:'A', roll_no:'3', is_verified:false, is_active:true, aadhar_number:null, abc_id:null, udise_no:null, sections:[], extra_details:[], guardians:[], custom_ids:[], shared_document_fields:[], completion:{document_count:1,missing_documents:[],missing_ids:['Aadhaar','ABC / APAAR','UDISE / PEN'], document_requirements_known:true}, documents:[{id:'std_1',raw_id:1,title:'Birth Certificate',url:'/media/doc.png',file_name:'doc.png',source:'std',uploaded_at:'2026-10-06',is_verified:false,can_edit_metadata:true}] };
profile.documents.push({ ...profile.documents[0], id:"std_2", raw_id:2, title:"Aadhaar Card" }, { ...profile.documents[0], id:"std_3", raw_id:3, title:"Report Card" });
profile.completion.document_count = 3;
(async () => {
 const browser = await chromium.launch({ channel:'msedge',headless:true });
 try {
 const context = await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addCookies([{name:'access_token',value:'ui-test',url:'http://localhost:3000'}]);
 await context.addInitScript(() => { localStorage.setItem('roles','["CLERK"]'); localStorage.setItem('school_name','Test School'); window.WebSocket=class extends EventTarget {static OPEN=1;readyState=1;send(){}close(){}}; });
 await context.route('**/api/**', async route => {
  const url = new URL(route.request().url());
  if(url.pathname.includes('/content/')) return route.fulfill({status:200,contentType:'image/png',body:png});
  if(url.pathname.endsWith('/profile-fields/')) {const data=route.request().postDataJSON(); const field={id:10,label:data.label,kind:data.kind}; if(data.kind==='ID')profile.custom_ids.push({...field,value:''}); else profile.shared_document_fields.push(field); return route.fulfill({status:201,json:field});}
  if(url.pathname.endsWith('/students/25/')) return route.fulfill({status:200,json:profile});
  return route.fulfill({status:200,json:url.pathname.includes('/me/')?{name:'Clerk',initials:'CL',role:'CLERK'}:[]});
 });
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000/clerk/student-profiles/25',{waitUntil:'domcontentloaded',timeout:180000});
 await page.getByRole('heading',{name:'Aarav Patel',exact:true}).waitFor({timeout:180000});
 assert.equal(await page.locator('header').first().getByRole('button',{name:'Toggle navigation'}).count(),0);
 assert.match(await page.locator('header').first().innerText(),/Test School/);
 assert.equal(Math.round((await page.locator('#app-desktop-sidebar').boundingBox()).width),72);
 await page.getByRole('button',{name:'Government IDs',exact:true}).click();
 await page.getByRole('button',{name:'Add ID field',exact:true}).click();
 await page.getByLabel('Field name',{exact:true}).fill('Passport Number'); await page.getByRole('button',{name:'Add field',exact:true}).click();
 await page.getByText('Passport Number',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Documents (3)',exact:true}).click();
 const cards = await page.locator('main article').all();
 const boxes = await Promise.all(cards.slice(0,3).map(card => card.boundingBox()));
 assert.equal(boxes[0].y,boxes[1].y); assert.equal(boxes[1].y,boxes[2].y);
 await page.getByRole('button',{name:'Preview Birth Certificate'}).click();
 await page.getByRole('dialog').waitFor(); await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Add document field',exact:true}).click();
 await page.getByLabel('Field name',{exact:true}).fill('Medical Certificate'); await page.getByRole('button',{name:'Add field',exact:true}).click();
 await page.getByRole('heading',{name:'Medical Certificate',exact:true}).waitFor();
 await page.getByRole('heading',{name:'Documents (3)',exact:true}).evaluate(el => {const main=el.closest('main');main.scrollTop += el.getBoundingClientRect().top-main.getBoundingClientRect().top-16;});
 await page.screenshot({path:'scripts/student-documents-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const actionBoxes = await Promise.all((await page.locator('main article').first().locator('[data-slot=button]').all()).map(button=>button.boundingBox()));
 assert.ok(actionBoxes.every(box=>box.y===actionBoxes[0].y), 'Document actions must stay on one row on mobile');
 await page.getByRole('heading',{name:'Documents (3)',exact:true}).evaluate(el => {const main=el.closest('main');main.scrollTop += el.getBoundingClientRect().top-main.getBoundingClientRect().top-16;});
 await page.screenshot({path:'scripts/student-documents-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]); console.log('Browser checks passed: header, collapsed sidebar, shared ID/document field creation, preview modal, mobile overflow.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
