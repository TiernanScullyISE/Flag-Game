const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const AxeBuilder=require('@axe-core/playwright').default;
const root=path.resolve(__dirname,'..');
const context={window:{}};vm.createContext(context);
for(const file of ['typing-data.js','typing-passages.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const core=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(root,'typing-core.js'),'utf8')).toString('base64'));
let calls;
test.beforeEach(async ({page})=>{
  calls=[];
  const {makeText}=await core;
  await page.route(/supabase\.co/,async route=>{
    const body=route.request().postDataJSON();calls.push(body);
    if(body.action==='prepare')return route.fulfill({json:{id:'test-session',identity:'signed-test-identity',prompt:makeText(body.config,42,context.window.TypingData.languages,context.window.TypingPassages)}});
    if(body.action==='board')return route.fulfill({json:{rows:[]}});
    if(body.action==='finish')return route.fulfill({json:{receipt:'test-session'}});
    if(body.action==='publish')return route.fulfill({json:{status:'approved',message:'Added to the public leaderboard.'}});
    return route.fulfill({json:{ok:true}});
  });
});
async function ready(page){await expect(page.locator('#typing-input')).toBeEnabled();}
test('timed PB asks permission and only uploads typing history after consent',async ({page})=>{
  await page.clock.install();await page.goto('/typing.html');await ready(page);
  await page.locator('#typing-duration').selectOption('15');await ready(page);
  const prompt=await page.locator('#typing-prompt').innerText();
  await page.locator('#typing-input').pressSequentially(prompt.slice(0,12));
  await page.clock.fastForward(15000);
  await expect(page.locator('#typing-publish')).toBeVisible();
  await expect(page.locator('#typing-post')).toBeEnabled();
  expect(calls.some(c=>c.action==='stop')).toBe(true);
  expect(calls.some(c=>c.action==='finish' || c.action==='publish')).toBe(false);
  await page.locator('#typing-name').fill('Runner');await page.locator('#typing-fair-play').check();await page.locator('#typing-post').click();
  await expect(page.locator('#typing-publish-status')).toContainText('public leaderboard');
  expect(calls.filter(c=>c.action==='finish')).toHaveLength(1);
  expect(calls.find(c=>c.action==='finish').events.length).toBe(12);
  expect(calls.filter(c=>c.action==='publish')).toHaveLength(1);
});
test('non-PBs do not prompt and category records stay separate',async ({page})=>{
  await page.clock.install();await page.goto('/typing.html');await ready(page);
  await page.locator('#typing-duration').selectOption('15');await ready(page);
  const prompt=await page.locator('#typing-prompt').innerText();
  await page.locator('#typing-input').pressSequentially(prompt.slice(0,12));await page.clock.fastForward(15000);
  await expect(page.locator('#typing-rankings tr')).toHaveCount(1);
  await page.locator('#typing-again').click();await ready(page);
  await page.locator('#typing-input').pressSequentially(prompt.slice(0,6));await page.clock.fastForward(15000);
  await expect(page.locator('#typing-results')).toBeVisible();await expect(page.locator('#typing-publish')).toBeHidden();
  await page.locator('#typing-punctuation').check();await ready(page);await expect(page.locator('#typing-rankings tr')).toHaveCount(0);
});
test('Space does not activate the post-test Try again button',async ({page})=>{
  await page.clock.install();await page.goto('/typing.html');await ready(page);
  await page.locator('#typing-duration').selectOption('15');await ready(page);
  await page.locator('#typing-input').pressSequentially('a');await page.clock.fastForward(15000);
  await expect(page.locator('#typing-results')).toBeVisible();
  await page.locator('#typing-again').focus();await page.keyboard.press('Space');
  await expect(page.locator('#typing-results')).toBeVisible();
  await expect(page.locator('#typing-phase')).toHaveText('Test complete');
});
test('typing anywhere on the page focuses the test automatically',async ({page})=>{
  await page.goto('/typing.html');await ready(page);
  await page.evaluate(()=>document.activeElement?.blur());
  await page.keyboard.type('a');
  await expect(page.locator('#typing-input')).toBeFocused();await expect(page.locator('#typing-input')).toHaveValue('a');
  await page.keyboard.press('Backspace');await expect(page.locator('#typing-input')).toHaveValue('');
});
test('changing settings immediately redirects typing into the new test',async ({page})=>{
  await page.goto('/typing.html');await ready(page);
  await page.locator('#typing-mode').selectOption('words');
  await page.keyboard.type('a');
  await ready(page);await expect(page.locator('#typing-input')).toBeFocused();await expect(page.locator('#typing-input')).toHaveValue('a');
});
test('English-only modes are removed for other languages',async ({page})=>{
  await page.goto('/typing.html');await ready(page);
  await page.locator('#typing-language').selectOption('python');await ready(page);
  await expect(page.locator('#typing-mode option[value="alphabet"]')).toHaveCount(0);
  await expect(page.locator('#typing-mode option[value="pangram"]')).toHaveCount(0);
  await page.locator('#typing-language').selectOption('english');await ready(page);
  await expect(page.locator('#typing-mode option[value="alphabet"]')).toHaveCount(1);
  await expect(page.locator('#typing-mode option[value="pangram"]')).toHaveCount(1);
});
test('fixed-word tests finish only after the complete exact text',async ({page})=>{
  await page.goto('/typing.html');await ready(page);await page.locator('#typing-mode').selectOption('words');await ready(page);
  await page.locator('#typing-count').selectOption('10');await ready(page);
  const prompt=await page.locator('#typing-prompt').innerText();
  expect(prompt.split(' ')).toHaveLength(10);
  await page.locator('#typing-input').pressSequentially(prompt.slice(0,-1),{delay:2});await expect(page.locator('#typing-results')).toBeHidden();
  await page.locator('#typing-input').pressSequentially(prompt.slice(-1));await expect(page.locator('#typing-results')).toBeVisible();
});
test('alphabet and pangram modes issue their exact canonical text',async ({page})=>{
  await page.goto('/typing.html');await ready(page);
  for(const [modeValue,expected] of [['alphabet','abcdefghijklmnopqrstuvwxyz'],['pangram','the quick brown fox jumps over the lazy dog']]){
    await page.locator('#typing-mode').selectOption(modeValue);await ready(page);
    await expect(page.locator('#typing-prompt')).toHaveText(expected);
    await expect(page.locator('#typing-punctuation')).toBeDisabled();
    await page.locator('#typing-input').pressSequentially(expected,{delay:1});
    await expect(page.locator('#typing-results')).toBeVisible();
    await page.locator('#typing-again').click();await ready(page);
  }
});
test('passages have named categories and always issue their complete text',async ({page})=>{
  await page.goto('/typing.html');await ready(page);await page.locator('#typing-mode').selectOption('passage');await ready(page);
  for(const language of ['english','irish','python','java']){
    await page.locator('#typing-language').selectOption(language);await ready(page);
    const entries=context.window.TypingPassages[language].entries;
    await expect(page.locator('#typing-length option')).toHaveCount(entries.length);
    for(const entry of entries){
      await page.locator('#typing-length').selectOption(entry.id);await ready(page);
      const {makeText}=await core;
      const c=calls.filter(c=>c.action==='prepare').at(-1).config;
      const text=makeText(c,42,context.window.TypingData.languages,context.window.TypingPassages);
      const prepared=c.punctuation ? entry.text.trim() : entry.text.trim().replace(/[^\p{L}\p{N}\s]/gu,'').toLowerCase();
      const expected=(['python','java'].includes(language) ? prepared : prepared.replace(/\s+/g,' ')).normalize('NFC');
      expect(c.target).toBe(entry.id);expect(text).toBe(expected);
      if(language==='python')expect(text).toContain('\n    ');
      if(language==='java')expect(text).toContain('public class Main');
    }
  }
  expect(context.window.TypingPassages.english.entries).toHaveLength(8);
  expect(context.window.TypingPassages.english.entries.some(entry=>entry.id==='bill-gates-challenge')).toBe(true);
});
test('multi-line passages scroll vertically instead of sliding sideways',async ({page})=>{
  await page.goto('/typing.html');await ready(page);await page.locator('#typing-mode').selectOption('passage');await ready(page);
  await page.locator('#typing-language').selectOption('python');await ready(page);await page.locator('#typing-length').selectOption('long');await ready(page);
  const prompt=await page.locator('#typing-prompt').innerText();
  await page.locator('#typing-input').fill(prompt.slice(0,650));
  const layout=await page.locator('#typing-prompt').evaluate(element=>({scrollTop:element.scrollTop,scrollLeft:element.scrollLeft,scrollHeight:element.scrollHeight,clientHeight:element.clientHeight}));
  expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight);expect(layout.scrollTop).toBeGreaterThan(0);expect(layout.scrollLeft).toBe(0);
});
test('all passage and script variants finish on their final character',async ({page})=>{
  await page.goto('/typing.html');await ready(page);await page.locator('#typing-mode').selectOption('passage');await ready(page);
  for(const language of ['english','irish','python','java']){
    await page.locator('#typing-language').selectOption(language);await ready(page);
    for(const entry of context.window.TypingPassages[language].entries){
      await page.locator('#typing-length').selectOption(entry.id);await ready(page);
      const prompt=await page.locator('#typing-prompt').innerText();
      await page.locator('#typing-input').fill(prompt);
      await expect(page.locator('#typing-results'),`${language}/${entry.id}`).toBeVisible();
      await page.locator('#typing-again').click();await ready(page);
    }
  }
});
test('Tab restarts, Escape exits, accents and corrections are preserved',async ({page})=>{
  await page.goto('/typing.html');await ready(page);const input=page.locator('#typing-input');
  await input.pressSequentially('~');await expect(page.locator('.typing-char.wrong')).toHaveCount(1);await input.press('Backspace');
  await input.press('Tab');await ready(page);await expect(input).toBeFocused();await expect(input).toHaveValue('');
  await input.press('Escape');await expect(page.locator('#typing-reset')).toBeFocused();
  await page.locator('#typing-language').selectOption('irish');await ready(page);
  await input.evaluate(input=>{input.dispatchEvent(new CompositionEvent('compositionstart'));input.value='a\u0301';input.dispatchEvent(new CompositionEvent('compositionend'));});
  await expect(input).toHaveValue('á');
});
test('one Tab from results restarts and brings the typing surface into view',async ({page})=>{
  await page.clock.install();await page.goto('/typing.html');await ready(page);
  await page.locator('#typing-duration').selectOption('15');await ready(page);
  await page.locator('#typing-input').pressSequentially('a');await page.clock.fastForward(15000);
  await expect(page.locator('#typing-results')).toBeVisible();await page.keyboard.press('Tab');await ready(page);
  await expect(page.locator('#typing-results')).toBeHidden();await expect(page.locator('#typing-input')).toBeFocused();
  const visible=await page.locator('#typing-surface').evaluate(element=>{const box=element.getBoundingClientRect();return box.top>=0 && box.bottom<=innerHeight;});
  expect(visible).toBe(true);
});
test('code Enter supplies the exact indentation for the next line',async ({page})=>{
  await page.goto('/typing.html');await ready(page);
  await page.locator('#typing-mode').selectOption('passage');await ready(page);
  await page.locator('#typing-language').selectOption('python');await ready(page);
  const prompt=await page.locator('#typing-prompt').innerText();const newline=prompt.indexOf('\n');
  await page.locator('#typing-input').pressSequentially(prompt.slice(0,newline));await page.locator('#typing-input').press('Enter');
  await expect(page.locator('#typing-input')).toHaveValue(prompt.slice(0,newline+1)+(prompt.slice(newline+1).match(/^ */) || [''])[0]);
});
test('hour-long timer and storage failures preserve visible results',async ({page})=>{
  await page.clock.install();await page.goto('/typing.html');await ready(page);await page.locator('#typing-duration').selectOption('3600');await ready(page);
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('Full');};});
  await page.locator('#typing-input').pressSequentially('a');await page.clock.fastForward(3600000);
  await expect(page.locator('#typing-results')).toBeVisible();await expect(page.locator('#typing-result-summary')).toContainText('could not save');
});
for(const theme of ['light','dark'])test(`${theme} responsive passage results and PB form are accessible`,async ({page},testInfo)=>{
  await page.clock.install();await page.addInitScript(theme=>localStorage.setItem('flagGameTheme',theme),theme);
  await page.goto('/typing.html');await ready(page);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  const prompt=await page.locator('#typing-prompt').innerText();await page.locator('#typing-input').pressSequentially(prompt.slice(0,12));await page.clock.fastForward(30000);
  await expect(page.locator('#typing-publish')).toBeVisible();
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    if(width===390 || width===1440)await page.screenshot({path:testInfo.outputPath(`typing-${width}.png`),fullPage:true,animations:'disabled'});
  }
  const scan=await new AxeBuilder({page}).analyze();expect(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
