import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  const result = await page.evaluate(() => {
    if (!window.__DEBUG_LUDO_STATE__) return "No state found!";
    
    // Inject exact scenario
    const state = JSON.parse(JSON.stringify(window.__DEBUG_LUDO_STATE__));
    state.phase = 'MOVEMENT_SELECTION';
    state.currentPlayer = 'red';
    state.movementDirection = 'FORWARD';
    state.movementComponents = [6, 6, 3];
    state.currentComponentIndex = 0;
    
    // Put red tokens at 11 and 8
    state.players.red.pieces[0].position = 11;
    state.players.red.pieces[0].status = 'ACTIVE';
    state.players.red.pieces[1].position = 11;
    state.players.red.pieces[1].status = 'ACTIVE';
    state.players.red.pieces[2].position = 8;
    state.players.red.pieces[2].status = 'ACTIVE';
    
    window.__DEBUG_LUDO_SET_STATE__(state);
    
    return new Promise(resolve => {
      setTimeout(() => {
        // Query DOM
        const movables = document.querySelectorAll('.token-movable');
        const count = movables.length;
        resolve(`Found ${count} movable tokens in DOM after forced state.`);
      }, 500);
    });
  });

  console.log("Puppeteer result:", result);
  await browser.close();
})();
