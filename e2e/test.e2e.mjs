#!/usr/bin/env node
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { execSync, spawn } from 'node:child_process';
import http from 'node:http';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
const BACKEND_HEALTH = process.env.BACKEND_HEALTH || 'http://localhost:4000/healthz';

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function waitForHealth(url, timeoutMs=20000){
  const start = Date.now();
  while(Date.now()-start < timeoutMs){
    try {
      const ok = await new Promise((res)=>{
        const req = http.get(url,(r)=>{ res(r.statusCode === 200); });
        req.on('error',()=>res(false));
        req.setTimeout(2000, ()=>{ req.destroy(); res(false); });
      });
      if(ok) return true;
    } catch { /* ignore */ }
    await sleep(500);
  }
  throw new Error(`Backend health not ready after ${timeoutMs}ms`);
}

async function main(){
  console.log('[e2e] Waiting for backend health...');
  await waitForHealth(BACKEND_HEALTH);

  const chromeOptions = new chrome.Options();
  if(process.env.HEADFUL !== '1') chromeOptions.addArguments('--headless=new');
  chromeOptions.addArguments('--no-sandbox','--disable-dev-shm-usage');

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
  let failures = 0;
  try {
    console.log('[e2e] Navigating to frontend', FRONTEND_URL);
    await driver.get(FRONTEND_URL);

    // Wait for counter element
    const counterEl = await driver.wait(until.elementLocated(By.css('#blepCounter')), 10000);
    await driver.wait(until.elementIsVisible(counterEl), 5000);
    const initialCounterText = await counterEl.getText();
    const initialCounter = parseInt(initialCounterText.replace(/,/g,''),10) || 0;
    console.log('[e2e] Initial counter:', initialCounter);

    // Attempt to obtain flag/country with limited retries (frontend fetch is async)
    let countryName = null;
    for(let attempt=0; attempt<6 && !countryName; attempt++) {
      try {
        const flagEl = await driver.findElement(By.css('#countryFlag'));
        const alt = await flagEl.getAttribute('alt');
        if(alt && !/loading/i.test(alt)) {
          countryName = alt.replace(/ flag$/i,'');
          break;
        }
      } catch { /* ignore */ }
      if(!countryName) {
        await sleep(500);
      }
    }
    console.log('[e2e] Detected country:', countryName || '(none yet)');

    // Extract leaderboard baseline for that country (0 if absent)
    async function getLeaderboardEntry(name){
      return await driver.executeScript(name => {
        const rows = Array.from(document.querySelectorAll('.leaderboard-item'));
        for(const row of rows){
          const labelDiv = row.querySelector('div');
            const span = row.querySelector('span');
          if(!labelDiv || !span) continue;
          const text = labelDiv.textContent.trim();
          // label looks like: Country Name (image alt text appears visually but alt not in text)
          if(text.toLowerCase().includes(name.toLowerCase())){
            const val = parseInt(span.textContent.replace(/,/g,''),10) || 0;
            return { count: val };
          }
        }
        return null;
      }, name);
    }

    let baseline = 0;
    if(countryName){
      const entry = await getLeaderboardEntry(countryName);
      baseline = entry ? entry.count : 0;
    }
    console.log('[e2e] Baseline leaderboard count for country:', baseline);

    // Perform a blep (pointer down + up)
    const target = await driver.findElement(By.css('#targetArea'));
    await driver.actions({bridge: true}).move({origin: target}).press().pause(100).release().perform();
    console.log('[e2e] Click action performed');

    // Wait for bottom counter increment
    await driver.wait(async () => {
      const t = (await counterEl.getText()).replace(/,/g,'');
      const val = parseInt(t,10) || 0;
      return val === initialCounter + 1;
    }, 8000, 'Counter did not increment');
    console.log('[e2e] Counter increment verified');

    if(countryName){
      // Wait for leaderboard refresh & increment (row might appear if baseline was 0)
      await driver.wait(async () => {
        const entry = await getLeaderboardEntry(countryName);
        if(!entry) return false; // still not there
        return entry.count === baseline + 1;
      }, 10000, 'Leaderboard did not reflect increment');
      console.log('[e2e] Leaderboard increment verified');
    } else {
      throw new Error('Country unresolved; cannot assert leaderboard increment');
    }

    console.log('\n[e2e] SUCCESS');
  } catch (err){
    failures++;
    console.error('[e2e] FAILURE:', err.stack || err.message);
  } finally {
    await driver.quit();
  }
  process.exit(failures ? 1 : 0);
}

main();
