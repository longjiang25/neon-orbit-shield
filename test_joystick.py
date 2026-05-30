"""Test virtual joystick on mobile viewport"""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 375, 'height': 812})

    # Collect console errors
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)

    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)

    # Check if joystick constants are loaded
    has_joystick = page.evaluate('''() => {
        const s = document.querySelector('script[type="module"]');
        return s ? s.src : 'no script';
    }''')
    print(f'Script src: {has_joystick}')

    # Check canvas and try to find state
    canvas_check = page.evaluate('''() => {
        const c = document.getElementById('gameCanvas');
        return { width: c.width, height: c.height, dpr: window.devicePixelRatio };
    }''')
    print(f'Canvas: {canvas_check}')

    # Check if joystick-related code exists in served files
    import_check = page.evaluate('''() => {
        return {
            innerWidth: window.innerWidth,
            hasTouch: 'ontouchstart' in window,
            isMobile: window.innerWidth < 768,
        };
    }''')
    print(f'Device check: {import_check}')

    # Check for module import errors
    page.wait_for_timeout(1000)

    # Take screenshot
    page.screenshot(path='/tmp/test_joystick_menu.png')
    print('Menu screenshot saved')

    # Click to start the game
    menu = page.locator('#menu-start-hint')
    if menu.is_visible():
        menu.click()
        page.wait_for_timeout(4000)  # Wait for countdown
        page.screenshot(path='/tmp/test_joystick_game.png')
        print('Game screenshot saved')

    # Check for errors
    if errors:
        print(f'ERRORS: {errors}')
    else:
        print('No JS errors!')

    # Check the page DOM
    page.screenshot(path='/tmp/test_joystick_final.png', full_page=True)

    # Try to check if joystick rendering was called by checking the canvas
    # We can't easily inspect canvas content, but we can check if files loaded
    page.evaluate('''() => {
        // Check if the main module loaded by trying to dispatch an event
        console.log('Testing joystick visibility...');
    }''')

    browser.close()
    print('Test complete')
