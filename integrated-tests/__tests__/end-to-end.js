const http = require('http');
const puppeteer = require('puppeteer');
const startServer = require('../server');

const APP = 'http://localhost:3000/';

describe('End to end testing', () => {
  let browser1;
  let page1;
  let browser2;
  let page2;
  let server;

  beforeAll(async () => {
    console.log('starting server...');
    server = await startServer();
    console.log('started server');
    await server.syncState.db.clearAllStates();
    browser1 = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page1 = await browser1.newPage();
    browser2 = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page2 = await browser2.newPage();
  });

  afterAll(async () => {
    // Giving time for messages to stop before shutting down
    // TODO: make shutdown more graceful so this isn't needed
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await browser1.close();
    await browser2.close();
    server.syncState.close();
    server.wsServer.close();
    server.httpServer.close();
  });

  it('loads', async () => {
    await page1.goto(APP);
    await page1.waitForSelector('#loaded');
    const loadedText = await page1.$eval('#loaded', (el) => el.innerText);
    expect(loadedText).toEqual('Page is loaded');
  });

  it('synchronizes state', async () => {
    await page2.goto(APP);
    await page2.waitForSelector('#loaded');
    // FIXME: sometimes the test fails without this timeout
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await page1.click('#increment');
    await page1.waitForFunction(
      () => document.getElementById('number').innerText === '1'
    );
    await page2.waitForFunction(
      () => document.getElementById('number').innerText === '1'
    );
  });

  it('undos state', async () => {
    await page2.click('#undo');
    await page1.waitForFunction(
      () => document.getElementById('number').innerText === '0'
    );
    await page2.waitForFunction(
      () => document.getElementById('number').innerText === '0'
    );
  });
});
