/** Run against `pnpm dev`: node scripts/check-calendar-popover.mjs [url]. Requires agent-browser on PATH. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import process from 'node:process'

const session = `calendar-regression-${process.pid}`
const trigger = 'button[title="华为全联接大会 2026 (HUAWEI CONNECT 2026)"]'
const popup = '.calendar-event-popover'
function browser(...args) {
  const result = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args.map(String)], { encoding: 'utf8' }))
  assert.ok(result.success, result.error)
  return result.data
}
function evaluate(code) {
  return browser('eval', code).result
}
function visible() {
  return evaluate(`!!document.querySelector('${popup}')`)
}
function bounds(selector) {
  return evaluate(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`)
}
try {
  browser('open', process.argv[2] ?? 'http://localhost:60086')
  browser('wait', 'input[type="search"]')
  browser('fill', 'input[type="search"]', 'HUAWEI CONNECT')
  browser('find', 'role', 'button', 'click', '--name', '日历', '--exact')
  browser('wait', trigger)
  for (const height of [1400, 720]) {
    browser('set', 'viewport', 1280, height)
    browser('mouse', 'move', 10, 10)
    browser('hover', trigger)
    browser('wait', popup)
    const anchor = bounds(trigger)
    const content = bounds(popup)
    const side = evaluate(`document.querySelector('${popup}').dataset.side`)
    const x = Math.round(Math.max(anchor.left, content.left) + 20)
    const y = side === 'bottom' ? anchor.bottom + 3 : anchor.top - 3
    browser('mouse', 'move', x, side === 'bottom' ? anchor.bottom - 1 : anchor.top + 1)
    browser('mouse', 'move', x, y)
    browser('wait', 500)
    assert.ok(visible(), 'Card must stay open while the pointer pauses in the visual gap')
    assert.ok(content.top >= 0 && content.bottom <= height, 'Card must fit the viewport')
    assert.ok(content.bottom <= anchor.top + 1 || content.top >= anchor.bottom - 1, 'Card must not overlap its trigger')
    browser('hover', `${popup} a:first-child`)
    browser('wait', 300)
    assert.ok(visible(), 'Card actions must remain reachable from the gap')
    browser('mouse', 'move', 10, 10)
    browser('wait', 300)
    assert.ok(!visible(), 'Leaving the card must dismiss a hover preview')
  }
  browser('focus', trigger)
  browser('press', 'Enter')
  browser('wait', popup)
  assert.ok(evaluate(`document.querySelector('${popup}').contains(document.activeElement)`), 'Keyboard opening must focus a card action')
  browser('press', 'Escape')
  assert.ok(!visible(), 'Escape must dismiss the card')
  assert.ok(evaluate(`document.activeElement.matches(${JSON.stringify(trigger)})`), 'Escape must return keyboard focus to the trigger')
  browser('set', 'device', 'iPhone 15')
  // agent-browser's device preset changes size/UA; enable actual touch media too.
  const socket = new WebSocket(browser('get', 'cdp-url').cdpUrl)
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
  let messageId = 0
  async function cdp(method, params = {}, sessionId) {
    const id = ++messageId
    const response = new Promise((resolve, reject) => {
      function receive(event) {
        const data = JSON.parse(event.data)
        if (data.id !== id)
          return
        socket.removeEventListener('message', receive)
        if (data.error)
          reject(new Error(data.error.message))
        else
          resolve(data.result)
      }
      socket.addEventListener('message', receive)
    })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
    return response
  }
  const { targetInfos } = await cdp('Target.getTargets')
  const target = targetInfos.find(target => target.type === 'page' && target.url === browser('get', 'url').url)
  const { sessionId } = await cdp('Target.attachToTarget', { targetId: target.targetId, flatten: true })
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 }, sessionId)
  assert.ok(!evaluate('matchMedia("(hover: hover) and (pointer: fine)").matches'), 'Touch media must be enabled')
  browser('reload')
  browser('wait', trigger)
  browser('click', trigger)
  browser('wait', '.rounded-t-2xl')
  assert.ok(!visible(), 'Touch must retain the bottom sheet')
  browser('click', 'button[title="关闭"]')
  assert.ok(!evaluate('!!document.querySelector(".rounded-t-2xl")'), 'Touch sheet must close')
  socket.close()
  console.log('PASS: hover gap, viewport bounds, actions, dismissal, keyboard focus, and touch sheet')
}
finally {
  browser('close')
}
